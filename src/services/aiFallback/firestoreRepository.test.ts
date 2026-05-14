import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRepliesForWorry } from '../myWorries/prdPolicy';
import { createAiFallbackRepository } from './firestoreRepository';
import type { AiFallbackCandidate, AiFallbackModerationLogWriteModel } from './types';

type Store = Map<string, Record<string, unknown>>;

function createFakeFirestore(initial: Record<string, Record<string, unknown>>) {
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, { ...value }]));

  function docRef(path: string) {
    return { id: path.split('/').at(-1) ?? '', path };
  }

  type Filter = { field: string; op: string; value: unknown };

  function compareValues(left: unknown, right: unknown) {
    const leftValue = left instanceof Date ? left.getTime() : left;
    const rightValue = right instanceof Date ? right.getTime() : right;
    if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue;
    if (typeof leftValue === 'string' && typeof rightValue === 'string') return leftValue.localeCompare(rightValue);
    return 0;
  }

  function matchesFilter(data: Record<string, unknown>, filter: Filter) {
    const value = data[filter.field];
    if (filter.op === '==') return value === filter.value;
    if (filter.op === '<=') return compareValues(value, filter.value) <= 0;
    throw new Error(`unsupported_filter:${filter.op}`);
  }

  function query(
    collectionName: string,
    filters: Filter[] = [],
    max?: number,
    order?: { field: string; direction: 'asc' | 'desc' }
  ) {
    const api = {
      collectionName,
      filters,
      max,
      where(field: string, op: string, value: unknown) {
        return query(collectionName, [...filters, { field, op, value }], max, order);
      },
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        return query(collectionName, filters, max, { field, direction });
      },
      limit(limit: number) {
        return query(collectionName, filters, limit, order);
      },
      async get() {
        return api.querySnapshot();
      },
      querySnapshot() {
        const docs = [...store.entries()]
          .filter(([path]) => path.startsWith(`${collectionName}/`) && path.split('/').length === 2)
          .filter(([, data]) => filters.every(filter => matchesFilter(data, filter)))
          .sort(([, left], [, right]) => {
            if (!order) return 0;
            const result = compareValues(left[order.field], right[order.field]);
            return order.direction === 'asc' ? result : -result;
          })
          .slice(0, max)
          .map(([path, data]) => ({
            id: path.split('/')[1],
            exists: true,
            data: () => ({ ...data }),
          }));
        return { empty: docs.length === 0, docs };
      },
    };
    return api;
  }

  return {
    store,
    collection(name: string) {
      return {
        doc(id = `${name}-generated`) {
          const ref = docRef(`${name}/${id}`);
          return {
            ...ref,
            get: async () => {
              const data = store.get(ref.path);
              return {
                exists: Boolean(data),
                data: () => data ? { ...data } : undefined,
              };
            },
          };
        },
        where(field: string, op: string, value: unknown) {
          return query(name, [{ field, op, value }]);
        },
        orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
          return query(name, [], undefined, { field, direction });
        },
        limit(limit: number) {
          return query(name, [], limit);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      let hasWritten = false;
      return callback({
        get: async (ref: { path?: string; querySnapshot?: () => unknown }) => {
          if (hasWritten) throw new Error('read_after_write');
          if (ref.querySnapshot) return ref.querySnapshot();
          const data = store.get(ref.path as string);
          return {
            exists: Boolean(data),
            data: () => data ? { ...data } : undefined,
          };
        },
        set: (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          hasWritten = true;
          store.set(ref.path, options?.merge ? { ...(store.get(ref.path) ?? {}), ...data } : { ...data });
        },
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          hasWritten = true;
          store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data });
        },
      });
    },
  };
}

const now = new Date('2026-05-13T00:00:00.000Z');

function baseDocs(extra: Record<string, Record<string, unknown>> = {}) {
  const docs: Record<string, Record<string, unknown>> = {
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 15,
    },
  };
  for (let i = 0; i < 15; i += 1) {
    docs[`deliveries/d${i}`] = {
      worryId: 'worry1',
      recipientUid: `recipient${i}`,
      status: 'active',
      isAiRecipient: false,
    };
  }
  return { ...docs, ...extra };
}

function candidate(worryId = 'worry1'): AiFallbackCandidate {
  return {
    worryId,
    authorUid: 'author',
    content: '고민',
    createdAt: new Date('2026-05-11T00:00:00.000Z'),
    humanDeliveryCount: 15,
    humanDeliveryLimit: 15,
    initialDeliveryBatchId: 'batch0',
    initialDeliveryCreatedCount: 5,
  };
}

function moderationLog(id = 'mod1'): AiFallbackModerationLogWriteModel {
  return {
    id,
    targetType: 'ai_reply',
    targetId: 'worry1_ai',
    uid: 'author',
    originalContent: '답장',
    status: 'approved',
    reasonCode: 'approved',
    userMessage: '',
    helpMessage: null,
    rawProviderResponse: { status: 'approved' },
    provider: 'openai',
    model: 'gpt-5.4-mini',
    createdAt: now,
    updatedAt: now,
  };
}

test('candidate scan excludes under-24h active worries so they cannot starve older eligible worries', async () => {
  const db = createFakeFirestore({
    'worries/new': {
      authorUid: 'author-new',
      content: 'new worry',
      status: 'active',
      createdAt: new Date('2026-05-12T12:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 15,
    },
    'worries/old': {
      authorUid: 'author-old',
      content: 'old worry',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 15,
    },
  });
  const repo = createAiFallbackRepository({ db: db as never });

  const candidates = await repo.fetchCandidates({ now, limit: 1 });

  assert.deepEqual(candidates.map(item => item.worryId), ['old']);
});

test('candidate scan over-scans old under-cap worries so small limits still reach eligible worries', async () => {
  const db = createFakeFirestore({
    'worries/under-cap': {
      authorUid: 'author-under',
      content: 'under cap',
      status: 'active',
      createdAt: new Date('2026-05-10T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 14,
    },
    'worries/eligible': {
      authorUid: 'author-eligible',
      content: 'eligible',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 15,
    },
  });
  const repo = createAiFallbackRepository({ db: db as never });

  const candidates = await repo.fetchCandidates({ now, limit: 1 });

  assert.deepEqual(candidates.map(item => item.worryId), ['eligible']);
});

test('zero-initial worry appears in fallback candidates after 24h', async () => {
  const db = createFakeFirestore({
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 0,
      initialDeliveryBatchId: 'batch0',
    },
    'deliveryBatches/batch0': {
      worryId: 'worry1',
      batchRound: 0,
      reason: 'initial',
      createdCount: 0,
    },
  });
  const candidates = await createAiFallbackRepository({ db: db as never }).fetchCandidates({ now, limit: 10 });

  assert.deepEqual(candidates.map(item => item.worryId), ['worry1']);
  assert.equal(candidates[0]?.initialDeliveryCreatedCount, 0);
});

test('partial-initial worry remains fallback-eligible even if later rematches leave it under cap', async () => {
  const docs: Record<string, Record<string, unknown>> = {
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 14,
      initialDeliveryBatchId: 'batch0',
    },
    'deliveryBatches/batch0': {
      worryId: 'worry1',
      batchRound: 0,
      reason: 'initial',
      createdCount: 4,
    },
  };
  for (let i = 0; i < 14; i += 1) {
    docs[`deliveries/d${i}`] = {
      worryId: 'worry1',
      recipientUid: `recipient${i}`,
      status: 'active',
      isAiRecipient: false,
    };
  }
  const db = createFakeFirestore(docs);
  const repo = createAiFallbackRepository({ db: db as never });

  const candidates = await repo.fetchCandidates({ now, limit: 10 });
  assert.deepEqual(candidates.map(item => item.worryId), ['worry1']);

  const result = await repo.commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidates[0],
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.equal(result.status, 'created');
  assert.equal(db.store.get('replies/worry1_ai')?.isAiGenerated, true);
});

test('normal under-cap non-zero initial worries still skip AI fallback', async () => {
  const docs: Record<string, Record<string, unknown>> = {
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 14,
      initialDeliveryBatchId: 'batch0',
    },
    'deliveryBatches/batch0': {
      worryId: 'worry1',
      batchRound: 0,
      reason: 'initial',
      createdCount: 5,
    },
  };
  for (let i = 0; i < 14; i += 1) {
    docs[`deliveries/d${i}`] = {
      worryId: 'worry1',
      recipientUid: `recipient${i}`,
      status: 'active',
      isAiRecipient: false,
    };
  }
  const db = createFakeFirestore(docs);
  const repo = createAiFallbackRepository({ db: db as never });

  const candidates = await repo.fetchCandidates({ now, limit: 10 });
  assert.deepEqual(candidates, []);

  const result = await repo.commitApprovedReply({
    runId: 'run1',
    now,
    candidate: {
      ...candidate(),
      humanDeliveryCount: 14,
      initialDeliveryBatchId: 'batch0',
      initialDeliveryCreatedCount: 5,
    },
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'human_delivery_cap_not_exhausted');
});

test('example worries are skipped during AI fallback scan', async () => {
  const db = createFakeFirestore(baseDocs({
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 15,
      isExample: true,
    },
  }));
  const repo = createAiFallbackRepository({ db: db as never });

  const candidates = await repo.fetchCandidates({ now, limit: 10 });

  assert.deepEqual(candidates, []);
});

test('example worries are skipped during AI fallback transaction recheck', async () => {
  const db = createFakeFirestore(baseDocs());
  const repo = createAiFallbackRepository({ db: db as never });
  db.store.set('worries/worry1', {
    ...(db.store.get('worries/worry1') ?? {}),
    isExample: true,
  });

  const result = await repo.commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.status === 'skipped' ? result.reason : '', 'example_worry');
  assert.equal(db.store.has('replies/worry1_ai'), false);
  assert.equal(db.store.get('worries/worry1')?.hasAiReply, undefined);
});

test('active deliveries do not expire and AI fallback creates exactly one AI reply', async () => {
  const db = createFakeFirestore(baseDocs());
  const repo = createAiFallbackRepository({ db: db as never });
  const result = await repo.commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.equal(result.status, 'created');
  assert.equal(db.store.get('replies/worry1_ai')?.deliveryId, 'ai:worry1');
  assert.equal(db.store.get('replies/worry1_ai')?.isAiGenerated, true);
  assert.equal(db.store.get('replies/worry1_ai')?.isExampleReply, false);
  assert.equal(db.store.get('worries/worry1')?.hasAiReply, true);
  assert.equal(db.store.get('worries/worry1')?.aiReplyId, 'worry1_ai');
  assert.equal(db.store.get('deliveries/d0')?.status, 'active');
});

test('zero-initial worry can create AI reply after 24h when no human reply exists', async () => {
  const db = createFakeFirestore({
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 0,
      initialDeliveryBatchId: 'batch0',
    },
    'deliveryBatches/batch0': {
      worryId: 'worry1',
      batchRound: 0,
      reason: 'initial',
      createdCount: 0,
    },
  });

  const result = await createAiFallbackRepository({ db: db as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: {
      ...candidate(),
      humanDeliveryCount: 0,
      initialDeliveryCreatedCount: 0,
    },
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.equal(result.status, 'created');
  assert.equal(db.store.get('replies/worry1_ai')?.deliveryId, 'ai:worry1');
  assert.equal(db.store.get('worries/worry1')?.hasAiReply, true);
});

test('late human reply race re-queries current replies and skips without AI fields', async () => {
  const db = createFakeFirestore(baseDocs({
    'replies/human-reply': {
      deliveryId: 'd1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient1',
      content: 'human',
      status: 'active',
      isAiGenerated: false,
    },
  }));
  const repo = createAiFallbackRepository({ db: db as never });
  const result = await repo.commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.deepEqual(result, { status: 'skipped', worryId: 'worry1', reason: 'human_reply_exists' });
  assert.equal(db.store.has('replies/worry1_ai'), false);
  assert.equal(db.store.get('worries/worry1')?.hasAiReply, undefined);
  assert.equal(db.store.get('worries/worry1')?.aiReplyId, undefined);
});

test('human reply blocks partial-initial AI fallback', async () => {
  const db = createFakeFirestore({
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 1,
      initialDeliveryBatchId: 'batch0',
    },
    'deliveryBatches/batch0': {
      worryId: 'worry1',
      batchRound: 0,
      reason: 'initial',
      createdCount: 1,
    },
    'deliveries/d0': {
      worryId: 'worry1',
      recipientUid: 'recipient0',
      status: 'active',
      isAiRecipient: false,
    },
    'replies/human-reply': {
      deliveryId: 'd0',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient0',
      content: 'human',
      status: 'active',
      isAiGenerated: false,
    },
  });

  const result = await createAiFallbackRepository({ db: db as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: {
      ...candidate(),
      humanDeliveryCount: 1,
      initialDeliveryCreatedCount: 1,
    },
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'human_reply_exists');
  assert.equal(db.store.has('replies/worry1_ai'), false);
});

test('original recipient reply after additive rematch blocks AI fallback', async () => {
  const db = createFakeFirestore(baseDocs({
    'deliveryBatches/batch0': {
      worryId: 'worry1',
      batchRound: 0,
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      reason: 'initial',
    },
    'deliveryBatches/worry1_rematch_1': {
      worryId: 'worry1',
      batchRound: 1,
      sourceBatchId: 'batch0',
      sourceBatchRound: 0,
      createdAt: new Date('2026-05-11T08:00:00.000Z'),
      reason: 'rematch_timeout',
    },
    'deliveries/d0': {
      worryId: 'worry1',
      recipientUid: 'original-recipient',
      status: 'active',
      batchId: 'batch0',
      batchRound: 0,
      isAiRecipient: false,
    },
    'deliveries/rematch-d1': {
      worryId: 'worry1',
      recipientUid: 'rematch-recipient',
      status: 'active',
      batchId: 'worry1_rematch_1',
      batchRound: 1,
      isAiRecipient: false,
    },
    'replies/original-recipient-reply': {
      deliveryId: 'd0',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'original-recipient',
      content: 'original recipient after rematch',
      status: 'active',
      isAiGenerated: false,
    },
  }));
  const result = await createAiFallbackRepository({ db: db as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'human_reply_exists');
  assert.equal(db.store.has('replies/worry1_ai'), false);
  assert.equal(db.store.get('worries/worry1')?.hasAiReply, undefined);
});

test('disliked and hidden-from-publisher stored human replies still block fallback', async () => {
  for (const reply of [
    { feedbackType: 'dislike' },
    { status: 'hidden', hiddenFromPublisher: true },
  ]) {
    const db = createFakeFirestore(baseDocs({
      'replies/human-reply': {
        deliveryId: 'd1',
        worryId: 'worry1',
        authorUid: 'author',
        replierUid: 'recipient1',
        content: 'human',
        isAiGenerated: false,
        ...reply,
      },
      'feedbacks/human-reply': {
        type: 'dislike',
      },
    }));
    const repo = createAiFallbackRepository({ db: db as never });
    const result = await repo.commitApprovedReply({
      runId: 'run1',
      now,
      candidate: candidate(),
      content: '답장',
      moderationLog: moderationLog(),
    });
    assert.equal(result.status, 'skipped');
    assert.equal(result.reason, 'human_reply_exists');
  }
});

test('human cap authority uses current delivery docs instead of stale counters', async () => {
  const fourteenDocs = baseDocs({
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 15,
    },
  });
  delete fourteenDocs['deliveries/d14'];
  const fourteenDb = createFakeFirestore(fourteenDocs);
  const fourteenResult = await createAiFallbackRepository({ db: fourteenDb as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });
  assert.equal(fourteenResult.status, 'skipped');
  assert.equal(fourteenResult.reason, 'human_delivery_cap_not_exhausted');

  const missingCounterDb = createFakeFirestore(baseDocs({
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
    },
  }));
  const missingCounterResult = await createAiFallbackRepository({ db: missingCounterDb as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: { ...candidate(), humanDeliveryCount: undefined },
    content: '답장',
    moderationLog: moderationLog(),
  });
  assert.equal(missingCounterResult.status, 'created');
});

test('synthetic and non-human delivery records are excluded from human cap count', async () => {
  const docs = baseDocs();
  delete docs['deliveries/d14'];
  docs['deliveries/ai:worry1'] = { worryId: 'worry1', isAiRecipient: true };
  const db = createFakeFirestore(docs);
  const result = await createAiFallbackRepository({ db: db as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });
  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'human_delivery_cap_not_exhausted');
});

test('idempotency skips deterministic AI reply and hasAiReply flag', async () => {
  const existingReplyDb = createFakeFirestore(baseDocs({
    'replies/worry1_ai': {
      deliveryId: 'ai:worry1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'ai_fallback',
      isAiGenerated: true,
    },
  }));
  const existingReply = await createAiFallbackRepository({ db: existingReplyDb as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });
  assert.equal(existingReply.status, 'skipped');
  assert.equal(existingReply.reason, 'ai_reply_exists');

  const flagDb = createFakeFirestore(baseDocs({
    'worries/worry1': {
      authorUid: 'author',
      content: '고민',
      status: 'active',
      createdAt: new Date('2026-05-11T00:00:00.000Z'),
      humanDeliveryLimit: 15,
      humanDeliveryCount: 15,
      hasAiReply: true,
    },
  }));
  const flagResult = await createAiFallbackRepository({ db: flagDb as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: { ...candidate(), hasAiReply: true },
    content: '답장',
    moderationLog: moderationLog(),
  });
  assert.equal(flagResult.status, 'skipped');
  assert.equal(flagResult.reason, 'ai_reply_exists');
});

test('rejected AI content creates ai_reply moderation log and no visible reply', async () => {
  const db = createFakeFirestore(baseDocs());
  const repo = createAiFallbackRepository({ db: db as never });
  const log = { ...moderationLog(), status: 'rejected' as const, reasonCode: 'spam_promotion', userMessage: 'bad' };
  const result = await repo.commitRejectedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    moderationLog: log,
  });

  assert.equal(result.status, 'rejected');
  assert.equal(db.store.get('moderationLogs/mod1')?.targetType, 'ai_reply');
  assert.equal(db.store.has('replies/worry1_ai'), false);
  assert.equal(db.store.get('worries/worry1')?.hasAiReply, undefined);
  assert.equal(db.store.get('worries/worry1')?.aiReplyId, undefined);
});

test('moderation log includes common fields consistent with existing logs', async () => {
  const db = createFakeFirestore(baseDocs());
  const log = moderationLog();
  await createAiFallbackRepository({ db: db as never }).commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: log,
  });
  const stored = db.store.get('moderationLogs/mod1') ?? {};
  for (const key of [
    'targetType',
    'targetId',
    'uid',
    'originalContent',
    'status',
    'reasonCode',
    'userMessage',
    'helpMessage',
    'rawProviderResponse',
    'provider',
    'model',
    'createdAt',
    'updatedAt',
  ]) {
    assert.ok(key in stored, key);
  }
});

test('manual-equivalent AI fallback simulation covers creation rerun late-human and disliked blocks', async () => {
  const db = createFakeFirestore(baseDocs());
  const repo = createAiFallbackRepository({ db: db as never });
  const created = await repo.commitApprovedReply({
    runId: 'run1',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog(),
  });
  assert.equal(created.status, 'created');
  assert.equal([...db.store.keys()].filter(path => path === 'replies/worry1_ai').length, 1);
  assert.equal(db.store.get('worries/worry1')?.hasAiReply, true);
  assert.equal(db.store.get('worries/worry1')?.aiReplyId, 'worry1_ai');
  assert.equal(db.store.get('moderationLogs/mod1')?.targetType, 'ai_reply');
  assert.equal(db.store.get('deliveries/d0')?.status, 'active');

  const authorReadModel = selectRepliesForWorry({
    replies: [{
      id: 'worry1_ai',
      ...(db.store.get('replies/worry1_ai') as Record<string, unknown>),
    }],
    userUid: 'author',
    worryId: 'worry1',
  });
  assert.deepEqual(authorReadModel.map(reply => reply.id), ['worry1_ai']);
  assert.equal('aiLabel' in authorReadModel[0], false);

  const rerun = await repo.commitApprovedReply({
    runId: 'run2',
    now,
    candidate: { ...candidate(), hasAiReply: true },
    content: '답장',
    moderationLog: moderationLog('mod2'),
  });
  assert.equal(rerun.status, 'skipped');
  assert.equal(rerun.reason, 'ai_reply_exists');

  const lateDb = createFakeFirestore(baseDocs({
    'replies/human-late': {
      deliveryId: 'd1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient1',
      content: 'human after 8h',
      status: 'active',
      isAiGenerated: false,
    },
  }));
  const late = await createAiFallbackRepository({ db: lateDb as never }).commitApprovedReply({
    runId: 'run3',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog('mod3'),
  });
  assert.equal(late.status, 'skipped');
  assert.equal(late.reason, 'human_reply_exists');

  const dislikedDb = createFakeFirestore(baseDocs({
    'replies/human-disliked': {
      deliveryId: 'd1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient1',
      content: 'human',
      status: 'active',
      feedbackType: 'dislike',
      isAiGenerated: false,
    },
  }));
  const disliked = await createAiFallbackRepository({ db: dislikedDb as never }).commitApprovedReply({
    runId: 'run4',
    now,
    candidate: candidate(),
    content: '답장',
    moderationLog: moderationLog('mod4'),
  });
  assert.equal(disliked.status, 'skipped');
  assert.equal(disliked.reason, 'human_reply_exists');
});
