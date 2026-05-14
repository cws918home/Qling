import test from 'node:test';
import assert from 'node:assert/strict';
import { createRematchRepository } from './firestoreRepository';
import type { RematchScan, SelectedRematchRecipient } from './types';

type Store = Map<string, Record<string, unknown>>;

const now = new Date('2026-05-13T00:00:00.000Z');
const nineHoursAgo = new Date(now.getTime() - 9 * 60 * 60 * 1000);

function clone(value: Record<string, unknown>) {
  return { ...value };
}

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
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, clone(value)]));

  function snapshot(path: string, state: Store) {
    return {
      id: path.split('/').at(-1) ?? '',
      path,
      exists: state.has(path),
      data: () => {
        const data = state.get(path);
        return data ? clone(data) : undefined;
      },
    };
  }

  function queryRef(name: string, filters: Array<[string, unknown]> = [], maxResults?: number) {
    return {
      __query: true,
      collectionName: name,
      filters,
      maxResults,
      where(field: string, op: string, expected: unknown) {
        assert.equal(op, '==');
        return queryRef(name, [...filters, [field, expected]], maxResults);
      },
      limit(limitValue: number) {
        return queryRef(name, filters, limitValue);
      },
      async get() {
        return querySnapshot(name, filters, store, maxResults);
      },
    };
  }

  function querySnapshot(name: string, filters: Array<[string, unknown]>, state: Store, maxResults?: number) {
    const prefix = `${name}/`;
    const docs = [...state.entries()]
      .filter(([path, data]) => (
        path.startsWith(prefix)
        && !path.slice(prefix.length).includes('/')
        && filters.every(([field, expected]) => data[field] === expected)
      ))
      .slice(0, maxResults)
      .map(([path]) => snapshot(path, state));
    return { empty: docs.length === 0, docs };
  }

  return {
    store,
    collection(name: string) {
      return {
        doc(id = `${name}-generated`) {
          return {
            id,
            path: `${name}/${id}`,
            async get() {
              return snapshot(`${name}/${id}`, store);
            },
          };
        },
        where(field: string, op: string, expected: unknown) {
          assert.equal(op, '==');
          return queryRef(name, [[field, expected]]);
        },
        async get() {
          return querySnapshot(name, [], store);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      const staged = new Map<string, Record<string, unknown>>();
      let hasWritten = false;
      const stateWithStaged = () => new Map([...store.entries(), ...staged.entries()]);
      const result = await callback({
        get: async (ref: { path?: string; __query?: boolean; collectionName?: string; filters?: Array<[string, unknown]>; maxResults?: number }) => {
          if (hasWritten) throw new Error(`read_after_write:${ref.path ?? ref.collectionName}`);
          if (ref.__query && ref.collectionName && ref.filters) {
            return querySnapshot(ref.collectionName, ref.filters, stateWithStaged(), ref.maxResults);
          }
          return snapshot(ref.path as string, stateWithStaged());
        },
        set: (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          hasWritten = true;
          const current = stateWithStaged().get(ref.path) ?? {};
          staged.set(ref.path, options?.merge ? applyFieldValue(current, data) : clone(data));
        },
        update: (ref: { path: string }, data: Record<string, unknown>) => {
          hasWritten = true;
          const current = stateWithStaged().get(ref.path) ?? {};
          staged.set(ref.path, applyFieldValue(current, data));
        },
      });
      for (const [path, data] of staged) store.set(path, data);
      return result;
    },
  };
}

function selected(uid: string, selectionType: 'matched' | 'random' = 'matched'): SelectedRematchRecipient {
  return {
    uid,
    gender: 'female',
    interests: ['career'],
    helpedCount: 0,
    activeDeliveryCount: 0,
    matchOverlapCount: 1,
    randomTieBreaker: 0,
    selectionType,
    slotIndex: 0,
  };
}

function baseState(overrides: Record<string, Record<string, unknown>> = {}) {
  return {
    'users/author': { gender: 'female', interests: ['career'] },
    'users/r0a': { activeDeliveryCount: 1 },
    'users/r1a': { gender: 'female', interests: ['career'], activeDeliveryCount: 0 },
    'users/r1b': { gender: 'female', interests: ['career'], activeDeliveryCount: 9 },
    'worries/worry1': {
      authorUid: 'author',
      status: 'active',
      matchingCategories: ['career'],
      initialDeliveryBatchId: 'batch0',
      humanDeliveryCount: 5,
      humanDeliveryLimit: 15,
    },
    'deliveryBatches/batch0': {
      worryId: 'worry1',
      batchRound: 0,
      createdAt: nineHoursAgo,
      reason: 'initial',
    },
    'deliveries/worry1_r0a': {
      worryId: 'worry1',
      batchId: 'batch0',
      batchRound: 0,
      recipientUid: 'r0a',
      authorUid: 'author',
      status: 'active',
      selectionType: 'random',
      answeredAt: null,
      isAiRecipient: false,
    },
    ...overrides,
  };
}

async function fetchScan(db: ReturnType<typeof createFakeFirestore>): Promise<RematchScan> {
  const repo = createRematchRepository({ db: db as never });
  const scans = await repo.fetchScans({ now, limit: 10 });
  assert.equal(scans.length, 1);
  return scans[0];
}

test('commit creates deterministic Round 1 batch and deliveries without changing old active delivery', async () => {
  const db = createFakeFirestore(baseState());
  const repo = createRematchRepository({ db: db as never });
  const scan = await fetchScan(db);
  const result = await repo.commitRematchBatch({
    runId: 'run1',
    now,
    scan,
    sourceBatch: { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo },
    targetCount: 2,
    recipients: [selected('r1a'), selected('r1b', 'random')],
    nextRound: 1,
    rematchEligibleAfter: new Date(now.getTime() + 8 * 60 * 60 * 1000),
  });

  assert.equal(result.status, 'created');
  assert.equal(result.batchId, 'worry1_rematch_1');
  assert.deepEqual(result.deliveryIds, ['worry1_r1a', 'worry1_r1b']);
  assert.equal(db.store.get('deliveries/worry1_r0a')?.status, 'active');
  assert.equal(db.store.get('users/r0a')?.activeDeliveryCount, 1);
  assert.equal(db.store.get('users/r1a')?.activeDeliveryCount, 1);
  assert.equal(db.store.get('users/r1b')?.activeDeliveryCount, 10);
  assert.equal(db.store.get('deliveries/worry1_r1a')?.batchRound, 1);
  assert.equal(db.store.get('deliveries/worry1_r1a')?.createdByRematchRunId, 'run1');
  assert.ok(db.store.get('deliveries/worry1_r1a')?.rematchEligibleAfter);
  assert.equal(db.store.get('deliveryBatches/worry1_rematch_1')?.sourceBatchId, 'batch0');
  assert.equal(db.store.get('deliveryBatches/worry1_rematch_1')?.sourceBatchRound, 0);
  assert.equal(db.store.get('deliveryBatches/worry1_rematch_1')?.reason, 'rematch_timeout');
  assert.equal(db.store.get('worries/worry1')?.lastRematchRunId, 'run1');
});

test('example worries are skipped during scan', async () => {
  const db = createFakeFirestore(baseState({
    'worries/worry1': {
      authorUid: 'author',
      status: 'active',
      matchingCategories: ['career'],
      initialDeliveryBatchId: 'batch0',
      humanDeliveryCount: 5,
      humanDeliveryLimit: 15,
      isExample: true,
    },
  }));
  const repo = createRematchRepository({ db: db as never });

  const scans = await repo.fetchScans({ now, limit: 10 });

  assert.deepEqual(scans, []);
});

test('example worries are skipped during transaction recheck without delivery batch creation', async () => {
  const db = createFakeFirestore(baseState());
  const repo = createRematchRepository({ db: db as never });
  const scan = await fetchScan(db);
  db.store.set('worries/worry1', {
    ...(db.store.get('worries/worry1') ?? {}),
    isExample: true,
  });

  const result = await repo.commitRematchBatch({
    runId: 'run1',
    now,
    scan,
    sourceBatch: { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo },
    targetCount: 1,
    recipients: [selected('r1a')],
    nextRound: 1,
    rematchEligibleAfter: new Date(now.getTime() + 8 * 60 * 60 * 1000),
  });

  assert.equal(result.status, 'skipped');
  assert.equal(result.reason, 'example_worry');
  assert.equal(db.store.has('deliveryBatches/worry1_rematch_1'), false);
  assert.equal(db.store.has('deliveries/worry1_r1a'), false);
});

test('candidate with stale newly-created deterministic delivery is skipped without counter increment', async () => {
  const db = createFakeFirestore(baseState({
    'deliveries/worry1_r1a': {
      worryId: 'worry1',
      recipientUid: 'r1a',
      authorUid: 'author',
      status: 'active',
      isAiRecipient: false,
    },
  }));
  const repo = createRematchRepository({ db: db as never });
  const scan = await fetchScan(db);
  const result = await repo.commitRematchBatch({
    runId: 'run1',
    now,
    scan,
    sourceBatch: { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo },
    targetCount: 1,
    recipients: [selected('r1a')],
    nextRound: 1,
    rematchEligibleAfter: new Date(now.getTime() + 8 * 60 * 60 * 1000),
  });

  assert.equal(result.status, 'candidate_unavailable');
  assert.equal(db.store.get('users/r1a')?.activeDeliveryCount, 0);
});

test('passed, answered, and over-limit users are excluded in final transaction recheck', async () => {
  const db = createFakeFirestore(baseState({
    'users/passed': { gender: 'female', interests: ['career'], activeDeliveryCount: 0 },
    'users/answered': { gender: 'female', interests: ['career'], activeDeliveryCount: 0 },
    'users/over': { gender: 'female', interests: ['career'], activeDeliveryCount: 10 },
    'deliveries/pass-attempt': { worryId: 'worry1', passerUid: 'passed', isAiRecipient: false },
    'replies/reply1': { worryId: 'worry1', replierUid: 'answered' },
  }));
  const repo = createRematchRepository({ db: db as never });
  const scan = await fetchScan(db);
  const result = await repo.commitRematchBatch({
    runId: 'run1',
    now,
    scan,
    sourceBatch: { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo },
    targetCount: 3,
    recipients: [selected('passed'), selected('answered'), selected('over')],
    nextRound: 1,
    rematchEligibleAfter: new Date(now.getTime() + 8 * 60 * 60 * 1000),
  });

  assert.equal(result.status, 'candidate_unavailable');
  assert.equal(db.store.has('deliveryBatches/worry1_rematch_1'), false);
});

test('existing Round 1 batch makes retry idempotent with no double increment', async () => {
  const db = createFakeFirestore(baseState({
    'deliveryBatches/worry1_rematch_1': {
      worryId: 'worry1',
      batchRound: 1,
      sourceBatchId: 'batch0',
      createdAt: now,
    },
  }));
  const repo = createRematchRepository({ db: db as never });
  const scan = await fetchScan(db);
  const result = await repo.commitRematchBatch({
    runId: 'run2',
    now,
    scan,
    sourceBatch: { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo },
    targetCount: 1,
    recipients: [selected('r1a')],
    nextRound: 1,
    rematchEligibleAfter: null,
  });

  assert.equal(result.status, 'idempotent');
  assert.equal(db.store.get('users/r1a')?.activeDeliveryCount, 0);
});
