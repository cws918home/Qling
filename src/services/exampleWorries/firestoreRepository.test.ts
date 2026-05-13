import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExampleFeedbackJob,
  createExampleWorriesFirestoreRepository,
  exampleDeliveryId,
  exampleFeedbackJobId,
  exampleWorryId,
} from './firestoreRepository';

type Store = Map<string, Record<string, unknown>>;

function applyFieldValue(current: Record<string, unknown>, data: Record<string, unknown>) {
  const next = { ...current };
  for (const [key, value] of Object.entries(data)) {
    if (value && value.constructor?.name === 'NumericIncrementTransform') {
      next[key] = (typeof next[key] === 'number' ? next[key] : 0) + (value as { operand: number }).operand;
    } else {
      next[key] = value;
    }
  }
  return next;
}

function createFakeFirestore(initial: Record<string, Record<string, unknown>>) {
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, { ...value }]));
  function ref(path: string) {
    return { id: path.split('/').at(-1) ?? '', path };
  }
  return {
    store,
    collection(name: string) {
      return {
        doc(id = `${name}-generated`) {
          return ref(`${name}/${id}`);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      const staged = new Map<string, Record<string, unknown>>();
      const stateWithStaged = () => new Map([...store.entries(), ...staged.entries()]);
      const result = await callback({
        get: async (docRef: { path: string }) => {
          const data = stateWithStaged().get(docRef.path);
          return {
            exists: Boolean(data),
            data: () => data ? { ...data } : undefined,
          };
        },
        set: (docRef: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          const current = stateWithStaged().get(docRef.path) ?? {};
          staged.set(docRef.path, options?.merge ? applyFieldValue(current, data) : { ...data });
        },
        update: (docRef: { path: string }, data: Record<string, unknown>) => {
          const current = stateWithStaged().get(docRef.path) ?? {};
          staged.set(docRef.path, applyFieldValue(current, data));
        },
      });
      for (const [path, data] of staged) store.set(path, data);
      return result;
    },
  };
}

test('uses deterministic IDs for worries deliveries jobs and feedbacks', () => {
  assert.equal(exampleWorryId('user1', 'seed1'), 'example_user1_seed1');
  assert.equal(exampleDeliveryId('user1', 'seed1'), 'example_user1_seed1_user1');
  assert.equal(exampleFeedbackJobId('reply1'), 'reply1');
});

test('builds deterministic scheduled job with no comment surface', () => {
  const job = buildExampleFeedbackJob({
    replyId: 'reply1',
    targetUid: 'user1',
    submittedAt: new Date('2026-05-13T00:00:00.000Z'),
    now: {},
  });

  assert.equal(job.id, 'reply1');
  assert.equal(job.kind, 'example_like');
  assert.equal(job.status, 'scheduled');
  assert.equal(job.replyId, 'reply1');
  assert.equal(job.targetUid, 'user1');
  assert.equal(job.attempts, 0);
  assert.ok(job.runAfter instanceof Date);
});

test('feedback job creates exactly one like, no comment, and increments helpedCount once', async () => {
  const now = new Date('2026-05-13T00:20:00.000Z');
  const db = createFakeFirestore({
    'exampleFeedbackJobs/reply1': {
      kind: 'example_like',
      runAfter: new Date('2026-05-13T00:10:00.000Z'),
      status: 'scheduled',
      replyId: 'reply1',
      targetUid: 'recipient',
      attempts: 0,
    },
    'replies/reply1': {
      deliveryId: 'delivery1',
      worryId: 'worry1',
      authorUid: 'example_author',
      replierUid: 'recipient',
      content: 'reply',
      status: 'active',
      isAiGenerated: false,
      isExampleReply: true,
    },
    'users/recipient': {
      helpedCount: 0,
    },
  });
  const repo = createExampleWorriesFirestoreRepository({ db: db as never });

  const first = await repo.processFeedbackJob({ jobId: 'reply1', now });
  const second = await repo.processFeedbackJob({ jobId: 'reply1', now });

  assert.equal(first.status, 'completed');
  assert.equal(second.status, 'idempotent');
  assert.equal(db.store.get('feedbacks/reply1')?.type, 'like');
  assert.equal(db.store.get('feedbacks/reply1')?.comment, null);
  assert.equal(db.store.get('feedbacks/reply1')?.commentVisibility, 'none');
  assert.equal(db.store.get('feedbacks/reply1')?.isForExampleReply, true);
  assert.equal(db.store.get('users/recipient')?.helpedCount, 1);
  assert.equal(db.store.get('exampleFeedbackJobs/reply1')?.status, 'completed');
});

test('incompatible existing feedback skips without helpedCount mutation', async () => {
  const db = createFakeFirestore({
    'exampleFeedbackJobs/reply1': {
      kind: 'example_like',
      runAfter: new Date('2026-05-13T00:10:00.000Z'),
      status: 'scheduled',
      replyId: 'reply1',
      targetUid: 'recipient',
      attempts: 0,
    },
    'replies/reply1': {
      replierUid: 'recipient',
      status: 'active',
      isAiGenerated: false,
      isExampleReply: true,
    },
    'feedbacks/reply1': {
      type: 'dislike',
      helpedCountApplied: false,
      isForExampleReply: true,
    },
    'users/recipient': {
      helpedCount: 0,
    },
  });
  const repo = createExampleWorriesFirestoreRepository({ db: db as never });

  const result = await repo.processFeedbackJob({
    jobId: 'reply1',
    now: new Date('2026-05-13T00:20:00.000Z'),
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'feedback_conflict');
  assert.equal(db.store.get('users/recipient')?.helpedCount, 0);
  assert.equal(db.store.get('exampleFeedbackJobs/reply1')?.status, 'skipped');
});
