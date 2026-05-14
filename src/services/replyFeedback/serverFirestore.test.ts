import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplyFeedbackRepository } from './serverFirestore';

type Store = Record<string, Record<string, unknown>>;

function createDb(initial: Store = {}) {
  const store: Store = structuredClone(initial);
  const ref = (path: string) => ({ path });
  const db = {
    store,
    collection(name: string) {
      return {
        doc(id = `generated-${Object.keys(store).length}`) {
          return ref(`${name}/${id}`);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      return callback({
        async get(docRef: { path: string }) {
          return {
            exists: Object.prototype.hasOwnProperty.call(store, docRef.path),
            data: () => store[docRef.path],
          };
        },
        set(docRef: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) {
          store[docRef.path] = options?.merge ? { ...(store[docRef.path] ?? {}), ...data } : data;
        },
        update(docRef: { path: string }, data: Record<string, unknown>) {
          store[docRef.path] = { ...(store[docRef.path] ?? {}), ...data };
        },
      } as never);
    },
  };
  return db;
}

const baseStore: Store = {
  'worries/worry1': { authorUid: 'publisher' },
  'replies/reply1': {
    deliveryId: 'delivery1',
    worryId: 'worry1',
    authorUid: 'publisher',
    replierUid: 'replier',
    content: 'reply',
    isAiGenerated: false,
    isExampleReply: false,
  },
  'users/replier': { helpedCount: 0 },
};

async function save(store: Store, input: {
  type: 'like' | 'dislike';
  comment?: string | null;
  commentModerationLogId?: string | null;
}) {
  const db = createDb(store);
  const result = await createReplyFeedbackRepository({ db: db as never }).saveFeedback({
    publisherUid: 'publisher',
    replyId: 'reply1',
    type: input.type,
    comment: input.comment ?? null,
    commentModerationLogId: input.commentModerationLogId ?? null,
    moderationLog: input.commentModerationLogId ? { targetType: 'feedback_comment' } : undefined,
  });
  return { result, store: db.store };
}

test('initial like without comment stores exact feedback document shape', async () => {
  const { result, store } = await save(baseStore, { type: 'like' });

  assert.deepEqual(result, {
    feedbackId: 'reply1',
    helpedCountApplied: true,
    replyLikedPush: {
      feedbackId: 'reply1',
      replyId: 'reply1',
      replierUid: 'replier',
    },
  });
  assert.equal(store['feedbacks/reply1'].replyId, 'reply1');
  assert.equal(store['feedbacks/reply1'].worryId, 'worry1');
  assert.equal(store['feedbacks/reply1'].deliveryId, 'delivery1');
  assert.equal(store['feedbacks/reply1'].publisherUid, 'publisher');
  assert.equal(store['feedbacks/reply1'].replierUid, 'replier');
  assert.equal(store['feedbacks/reply1'].type, 'like');
  assert.equal(store['feedbacks/reply1'].comment, null);
  assert.equal(store['feedbacks/reply1'].commentVisibility, 'none');
  assert.equal(store['feedbacks/reply1'].commentModerationLogId, null);
  assert.equal(store['feedbacks/reply1'].helpedCountApplied, true);
  assert.equal(store['feedbacks/reply1'].isForAiReply, false);
  assert.equal(store['feedbacks/reply1'].isForExampleReply, false);
  assert.equal(store['replies/reply1'].feedbackType, 'like');
  assert.ok(!('publisherVisible' in store['replies/reply1']));
  assert.ok('likedAt' in store['replies/reply1']);
  assert.ok(!('dislikedAt' in store['replies/reply1']));
});

test('initial like with comment stores replier-visible comment fields', async () => {
  const { store } = await save(baseStore, {
    type: 'like',
    comment: 'thanks',
    commentModerationLogId: 'mod1',
  });

  assert.equal(store['feedbacks/reply1'].comment, 'thanks');
  assert.equal(store['feedbacks/reply1'].commentVisibility, 'replier');
  assert.equal(store['feedbacks/reply1'].commentModerationLogId, 'mod1');
  assert.equal(store['moderationLogs/mod1'].targetType, 'feedback_comment');
});

test('delayed like comment updates once without another helpedCount increment', async () => {
  const first = await save(baseStore, { type: 'like' });
  const second = await save(first.store, {
    type: 'like',
    comment: 'later thanks',
    commentModerationLogId: 'mod2',
  });

  assert.equal(second.store['feedbacks/reply1'].comment, 'later thanks');
  assert.equal(second.store['feedbacks/reply1'].commentVisibility, 'replier');
  assert.equal(second.store['feedbacks/reply1'].helpedCountApplied, true);
});

test('initial dislike without comment stores admin-only state only in feedbacks', async () => {
  const { result, store } = await save(baseStore, { type: 'dislike' });

  assert.deepEqual(result, { feedbackId: 'reply1', helpedCountApplied: false, replyLikedPush: null });
  assert.equal(store['feedbacks/reply1'].type, 'dislike');
  assert.equal(store['feedbacks/reply1'].comment, null);
  assert.equal(store['feedbacks/reply1'].commentVisibility, 'none');
  assert.equal(store['feedbacks/reply1'].commentModerationLogId, null);
  assert.ok(!('feedbackType' in store['replies/reply1']));
  assert.ok(!('dislikedAt' in store['replies/reply1']));
  assert.ok(!('publisherHiddenBecauseDisliked' in store['replies/reply1']));
  assert.equal(store['replies/reply1'].publisherVisible, false);
});

test('initial dislike with comment stores admin-only comment fields', async () => {
  const { store } = await save(baseStore, {
    type: 'dislike',
    comment: 'private',
    commentModerationLogId: 'mod3',
  });

  assert.equal(store['feedbacks/reply1'].comment, 'private');
  assert.equal(store['feedbacks/reply1'].commentVisibility, 'admin_only');
  assert.equal(store['feedbacks/reply1'].commentModerationLogId, 'mod3');
});

test('hidden reply and hidden worry cannot receive feedback', async () => {
  await assert.rejects(() => save({
    ...baseStore,
    'replies/reply1': {
      ...baseStore['replies/reply1'],
      status: 'hidden',
      hiddenAt: {},
    },
  }, { type: 'like' }), /invalid_reply/);

  await assert.rejects(() => save({
    ...baseStore,
    'worries/worry1': {
      ...baseStore['worries/worry1'],
      status: 'hidden',
      hiddenAt: {},
    },
  }, { type: 'like' }), /invalid_reply/);
});

test('exact idempotency accepts repeated same like and rejects overwrite', async () => {
  const first = await save(baseStore, { type: 'like', comment: 'same', commentModerationLogId: 'mod1' });
  const same = await save(first.store, { type: 'like', comment: 'same', commentModerationLogId: 'mod2' });
  assert.deepEqual(same.result, { feedbackId: 'reply1', helpedCountApplied: true, replyLikedPush: null });

  await assert.rejects(
    save(first.store, { type: 'like', comment: 'different', commentModerationLogId: 'mod3' }),
    /feedback_conflict/
  );
});

test('ownership rejects non-author other-worry and malformed reply ownership', async () => {
  await assert.rejects(
    createReplyFeedbackRepository({ db: createDb({ ...baseStore, 'worries/worry1': { authorUid: 'other' } }) as never })
      .saveFeedback({ publisherUid: 'publisher', replyId: 'reply1', type: 'like', comment: null, commentModerationLogId: null }),
    /not_worry_publisher/
  );
  await assert.rejects(
    createReplyFeedbackRepository({ db: createDb({ ...baseStore, 'replies/reply1': { ...baseStore['replies/reply1'], authorUid: 'other' } }) as never })
      .saveFeedback({ publisherUid: 'publisher', replyId: 'reply1', type: 'like', comment: null, commentModerationLogId: null }),
    /reply_worry_mismatch/
  );
  await assert.rejects(
    createReplyFeedbackRepository({ db: createDb({ ...baseStore, 'replies/reply1': { ...baseStore['replies/reply1'], replierUid: '' } }) as never })
      .saveFeedback({ publisherUid: 'publisher', replyId: 'reply1', type: 'like', comment: null, commentModerationLogId: null }),
    /invalid_reply/
  );
});

test('helpedCount eligibility includes examples and excludes AI or malformed flags', async () => {
  const example = await save({
    ...baseStore,
    'replies/reply1': { ...baseStore['replies/reply1'], isExampleReply: true },
  }, { type: 'like' });
  assert.equal(example.store['feedbacks/reply1'].helpedCountApplied, true);

  const ai = await save({
    ...baseStore,
    'replies/reply1': { ...baseStore['replies/reply1'], isAiGenerated: true },
  }, { type: 'like' });
  assert.equal(ai.store['feedbacks/reply1'].helpedCountApplied, false);

  const malformed = await save({
    ...baseStore,
    'replies/reply1': { ...baseStore['replies/reply1'], isExampleReply: 'nope' },
  }, { type: 'like' });
  assert.equal(malformed.store['feedbacks/reply1'].helpedCountApplied, false);
});

test('AI reply feedback accepts synthetic delivery ID without loading a delivery doc', async () => {
  const store: Store = {
    'worries/worry1': { authorUid: 'publisher' },
    'replies/worry1_ai': {
      deliveryId: 'ai:worry1',
      worryId: 'worry1',
      authorUid: 'publisher',
      replierUid: 'ai_fallback',
      content: 'reply',
      isAiGenerated: true,
      isExampleReply: false,
    },
  };
  const db = createDb(store);

  const result = await createReplyFeedbackRepository({ db: db as never }).saveFeedback({
    publisherUid: 'publisher',
    replyId: 'worry1_ai',
    type: 'like',
    comment: null,
    commentModerationLogId: null,
  });

  assert.equal(result.helpedCountApplied, false);
  assert.equal(db.store['feedbacks/worry1_ai'].deliveryId, 'ai:worry1');
  assert.equal(db.store['feedbacks/worry1_ai'].isForAiReply, true);
  assert.equal(db.store['users/ai_fallback'], undefined);
  assert.equal(db.store['deliveries/ai:worry1'], undefined);
});
