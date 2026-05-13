import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplyPublicationRepository } from './firestoreRepository';
import type { ReplyModerationLogWriteModel } from './types';

type Store = Map<string, Record<string, unknown>>;

function createFakeFirestore(initial: Record<string, Record<string, unknown>>) {
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, { ...value }]));

  function ref(path: string) {
    const id = path.split('/').at(-1) ?? '';
    return { id, path };
  }

  return {
    store,
    collection(name: string) {
      return {
        doc(id = `${name}-generated`) {
          const doc = ref(`${name}/${id}`);
          return {
            ...doc,
            async get() {
              return {
                exists: store.has(doc.path),
                data: () => {
                  const data = store.get(doc.path);
                  return data ? { ...data } : undefined;
                },
              };
            },
            async set(data: Record<string, unknown>, options?: { merge?: boolean }) {
              store.set(doc.path, options?.merge ? { ...(store.get(doc.path) ?? {}), ...data } : { ...data });
            },
          };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      let hasWritten = false;
      return callback({
        get: async (docRef: { path: string }) => {
          if (hasWritten) {
            throw new Error(`read_after_write:${docRef.path}`);
          }
          return {
            exists: store.has(docRef.path),
            data: () => {
              const data = store.get(docRef.path);
              return data ? { ...data } : undefined;
            },
          };
        },
        set: (docRef: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          hasWritten = true;
          store.set(docRef.path, options?.merge ? { ...(store.get(docRef.path) ?? {}), ...data } : { ...data });
        },
        update: (docRef: { path: string }, data: Record<string, unknown>) => {
          hasWritten = true;
          store.set(docRef.path, { ...(store.get(docRef.path) ?? {}), ...data });
        },
      });
    },
  };
}

const moderationLog: ReplyModerationLogWriteModel = {
  id: 'mod1',
  targetType: 'reply',
  targetId: 'delivery1',
  uid: 'recipient',
  originalContent: 'reply',
  status: 'approved',
  reasonCode: 'approved',
  userMessage: '',
  helpMessage: null,
  rawProviderResponse: { status: 'approved' },
  provider: 'openai',
  model: 'gpt-5.4-mini',
  createdAt: {},
  updatedAt: {},
};

test('repository creates replies by deterministic delivery id and answers delivery transactionally', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
      answeredAt: null,
    },
    'worries/worry1': {
      authorUid: 'author',
      humanReplyCount: 0,
      hasHumanReply: false,
    },
    'users/recipient': {
      activeDeliveryCount: 2,
    },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  const result = await repo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });

  assert.equal(result.status, 'created');
  assert.equal(result.replyId, 'delivery1');
  assert.equal(db.store.get('replies/delivery1')?.deliveryId, 'delivery1');
  assert.equal(db.store.get('replies/delivery1')?.worryId, 'worry1');
  assert.equal(db.store.get('replies/delivery1')?.replierUid, 'recipient');
  assert.equal(db.store.get('replies/delivery1')?.authorUid, 'author');
  assert.equal(db.store.get('replies/delivery1')?.isAiGenerated, false);
  assert.equal(db.store.get('replies/delivery1')?.isExampleReply, false);
  assert.equal(db.store.get('deliveries/delivery1')?.status, 'answered');
  assert.equal(db.store.get('worries/worry1')?.hasHumanReply, true);
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 1);
});

test('repository reads user counter before any transaction write', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
      answeredAt: null,
    },
    'worries/worry1': { authorUid: 'author' },
    'users/recipient': { activeDeliveryCount: 3 },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  await assert.doesNotReject(() => repo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  }));

  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 2);
});

test('repository idempotent same-content retry does not decrement counter again', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'answered',
      answeredAt: {},
    },
    'worries/worry1': { authorUid: 'author' },
    'users/recipient': { activeDeliveryCount: 1 },
    'replies/delivery1': {
      deliveryId: 'delivery1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient',
      content: 'reply',
      status: 'active',
      moderationLogId: 'mod1',
      createdAt: {},
      updatedAt: {},
      isAiGenerated: false,
      isExampleReply: false,
    },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  const result = await repo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });

  assert.equal(result.status, 'idempotent');
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 1);
});

test('repository rejects different-content duplicate and never decrements below zero', async () => {
  const duplicateDb = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'answered',
      answeredAt: {},
    },
    'worries/worry1': { authorUid: 'author' },
    'users/recipient': { activeDeliveryCount: 1 },
    'replies/delivery1': {
      deliveryId: 'delivery1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient',
      content: 'old reply',
      status: 'active',
      moderationLogId: 'mod1',
    },
  });
  const duplicateRepo = createReplyPublicationRepository({ db: duplicateDb as never });
  await assert.rejects(() => duplicateRepo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'new reply',
    moderationLog,
  }), /duplicate_reply/);

  const zeroDb = createFakeFirestore({
    'deliveries/delivery2': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
      answeredAt: null,
    },
    'worries/worry1': { authorUid: 'author' },
    'users/recipient': { activeDeliveryCount: 0 },
  });
  const zeroRepo = createReplyPublicationRepository({ db: zeroDb as never });
  await zeroRepo.commitApprovedReplyPublication({
    deliveryId: 'delivery2',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });
  assert.equal(zeroDb.store.get('users/recipient')?.activeDeliveryCount, 0);
});

test('approved example reply uses example moderation target, schedules one job, and preserves normal counters', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'example_author',
      recipientUid: 'recipient',
      status: 'active',
      answeredAt: null,
      isExample: true,
      exampleSeedId: 'seed1',
    },
    'worries/worry1': {
      authorUid: 'example_author',
      humanReplyCount: 0,
      hasHumanReply: false,
      isExample: true,
    },
    'users/recipient': {
      activeDeliveryCount: 2,
    },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  const result = await repo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });

  assert.equal(result.status, 'created');
  assert.equal(db.store.get('replies/delivery1')?.isExampleReply, true);
  assert.equal(db.store.get('replies/delivery1')?.isAiGenerated, false);
  assert.equal(db.store.get('moderationLogs/mod1')?.targetType, 'example_reply');
  assert.equal(db.store.get('exampleFeedbackJobs/delivery1')?.kind, 'example_like');
  assert.equal(db.store.get('exampleFeedbackJobs/delivery1')?.replyId, 'delivery1');
  assert.equal(db.store.get('exampleFeedbackJobs/delivery1')?.status, 'scheduled');
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 2);
  assert.equal(db.store.get('worries/worry1')?.humanReplyCount, 0);
  assert.equal(db.store.get('worries/worry1')?.hasHumanReply, false);
});

test('normal approved reply does not schedule example feedback job', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
      answeredAt: null,
    },
    'worries/worry1': { authorUid: 'author', humanReplyCount: 0, hasHumanReply: false },
    'users/recipient': { activeDeliveryCount: 1 },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  await repo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });

  assert.equal(db.store.has('exampleFeedbackJobs/delivery1'), false);
  assert.equal(db.store.get('moderationLogs/mod1')?.targetType, 'reply');
});

test('rejected example reply creates moderation log only and no reply or job', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      recipientUid: 'recipient',
      isExample: true,
    },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  await repo.commitRejectedReplyModeration({ moderationLog: { ...moderationLog, status: 'rejected' } });

  assert.equal(db.store.get('moderationLogs/mod1')?.targetType, 'example_reply');
  assert.equal(db.store.has('replies/delivery1'), false);
  assert.equal(db.store.has('exampleFeedbackJobs/delivery1'), false);
});
