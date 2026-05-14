import test from 'node:test';
import assert from 'node:assert/strict';
import { rematchDueDeliveries } from './rematchDueDeliveries';
import type { RematchRepository, RematchScan } from './types';

const now = new Date('2026-05-13T00:00:00.000Z');
const nineHoursAgo = new Date(now.getTime() - 9 * 60 * 60 * 1000);

function scan(overrides: Partial<RematchScan> = {}): RematchScan {
  return {
    worryId: 'worry1',
    author: { uid: 'author', gender: 'female', interests: ['career'] },
    matchingCategories: ['career'],
    humanDeliveryCount: 5,
    humanDeliveryLimit: 15,
    initialDeliveryBatchId: 'batch0',
    batches: [{ id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo }],
    sourceDeliveries: [
      { id: 'worry1_r0a', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0a', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0b', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0b', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0c', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0c', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0d', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0d', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0e', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0e', selectionType: 'random', answeredAt: null },
    ],
    allDeliveries: ['r0a', 'r0b', 'r0c', 'r0d', 'r0e'].map(uid => ({
      id: `worry1_${uid}`,
      worryId: 'worry1',
      recipientUid: uid,
      isAiRecipient: false,
    })),
    answeredUids: new Set(),
    candidates: ['r1a', 'r1b', 'r1c', 'r1d', 'r1e', 'r1f'].map(uid => ({
      uid,
      gender: 'female',
      interests: ['career'],
      helpedCount: 0,
      activeDeliveryCount: 0,
    })),
    ...overrides,
  };
}

function repository(scans: RematchScan[], options: {
  lock?: boolean;
  onCommit?: RematchRepository['commitRematchBatch'];
} = {}): RematchRepository & { commits: number; completes: number } {
  return {
    commits: 0,
    completes: 0,
    createRunId: () => 'run1',
    fetchScans: async () => scans,
    acquireRunLock: async () => options.lock ?? true,
    completeRun: async () => {
      repo.completes += 1;
    },
    commitRematchBatch: async params => {
      repo.commits += 1;
      if (options.onCommit) return options.onCommit(params);
      return {
        status: 'created',
        worryId: params.scan.worryId,
        batchId: `${params.scan.worryId}_rematch_${params.nextRound}`,
        deliveryIds: params.recipients.map(recipient => `${params.scan.worryId}_${recipient.uid}`),
        recipientUids: params.recipients.map(recipient => recipient.uid),
        createdCount: params.recipients.length,
      };
    },
  } as RematchRepository & { commits: number; completes: number };
}

let repo: ReturnType<typeof repository>;

test('missing initialDeliveryBatchId returns no_source_batch and performs no core writes', async () => {
  repo = repository([scan({ initialDeliveryBatchId: undefined })]);
  const result = await rematchDueDeliveries({
    db: {} as never,
    messaging: null,
    now,
    repository: repo,
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.results[0]?.reason, 'no_source_batch');
  assert.equal(repo.commits, 0);
});

test('malformed or missing Round 0 source returns no_source_batch and performs no core writes', async () => {
  for (const badScan of [
    scan({ initialDeliveryBatchId: 'missing' }),
    scan({ initialDeliveryBatchId: 'batch0', batches: [{ id: 'batch0', worryId: 'other', batchRound: 0, createdAt: nineHoursAgo }] }),
    scan({ initialDeliveryBatchId: 'batch0', batches: [{ id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo, reason: 'rematch_timeout' }] }),
    scan({ initialDeliveryBatchId: 'batch0', batches: [{ id: 'batch0', worryId: 'worry1', batchRound: 1, createdAt: nineHoursAgo, reason: 'rematch_timeout' }] }),
    scan({ initialDeliveryBatchId: 'batch0', batches: [{ id: 'batch0', worryId: 'worry1', batchRound: 2, createdAt: nineHoursAgo, reason: 'rematch_timeout' }] }),
  ]) {
    repo = repository([badScan]);
    const result = await rematchDueDeliveries({
      db: {} as never,
      messaging: null,
      now,
      repository: repo,
      pushAdapter: async () => undefined,
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.results[0]?.reason, 'no_source_batch');
    assert.equal(repo.commits, 0);
  }
});

test('valid Round 0 creates Round 1 and existing Round 1 blocks another Round 1', async () => {
  for (const reason of ['initial', undefined]) {
    repo = repository([scan({
      batches: [{ id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo, reason }],
    })]);
    const roundOne = await rematchDueDeliveries({
      db: {} as never,
      messaging: null,
      now,
      repository: repo,
      random: () => 0,
      pushAdapter: async () => undefined,
    });
    assert.equal(roundOne.status, 'completed');
    assert.equal(roundOne.createdDeliveryCount, 5);
    assert.equal(repo.commits, 1);
  }

  repo = repository([scan({
    batches: [
      { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo },
      { id: 'worry1_rematch_1', worryId: 'worry1', batchRound: 1, createdAt: now },
    ],
  })]);
  await rematchDueDeliveries({ db: {} as never, messaging: null, now, repository: repo, pushAdapter: async () => undefined });
  assert.equal(repo.commits, 0);
});

test('zero-initial Round 0 batch enters rematch and targets later human deliveries', async () => {
  repo = repository([scan({
    humanDeliveryCount: 0,
    sourceDeliveries: [],
    allDeliveries: [],
  })], {
    onCommit: async params => {
      assert.equal(params.nextRound, 1);
      assert.equal(params.sourceBatch.id, 'batch0');
      assert.equal(params.targetCount, 5);
      assert.equal(params.recipients.length, 5);
      return {
        status: 'created',
        worryId: params.scan.worryId,
        batchId: 'worry1_rematch_1',
        deliveryIds: params.recipients.map(recipient => `worry1_${recipient.uid}`),
        recipientUids: params.recipients.map(recipient => recipient.uid),
        createdCount: params.recipients.length,
      };
    },
  });

  const result = await rematchDueDeliveries({
    db: {} as never,
    messaging: null,
    now,
    repository: repo,
    random: () => 0,
    pushAdapter: async () => undefined,
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.createdDeliveryCount, 5);
  assert.equal(repo.commits, 1);
});

test('partial initial Round 0 batch enters rematch and excludes original recipients', async () => {
  repo = repository([scan({
    humanDeliveryCount: 4,
    sourceDeliveries: [
      { id: 'worry1_r0a', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0a', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0b', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0b', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0c', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0c', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0d', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0d', selectionType: 'matched', answeredAt: null },
    ],
    allDeliveries: ['r0a', 'r0b', 'r0c', 'r0d'].map(uid => ({
      id: `worry1_${uid}`,
      worryId: 'worry1',
      recipientUid: uid,
      isAiRecipient: false,
    })),
    candidates: ['r0a', 'r1a', 'r1b', 'r1c', 'r1d', 'r1e'].map(uid => ({
      uid,
      gender: 'female',
      interests: ['career'],
      helpedCount: 0,
      activeDeliveryCount: 0,
    })),
  })], {
    onCommit: async params => {
      assert.equal(params.targetCount, 5);
      assert.equal(params.recipients.some(recipient => recipient.uid === 'r0a'), false);
      assert.equal(params.recipients.length, 5);
      return {
        status: 'created',
        worryId: params.scan.worryId,
        batchId: 'worry1_rematch_1',
        deliveryIds: params.recipients.map(recipient => `worry1_${recipient.uid}`),
        recipientUids: params.recipients.map(recipient => recipient.uid),
        createdCount: params.recipients.length,
      };
    },
  });

  const result = await rematchDueDeliveries({
    db: {} as never,
    messaging: null,
    now,
    repository: repo,
    random: () => 0,
    pushAdapter: async () => undefined,
  });

  assert.equal(result.status, 'completed');
  assert.equal(result.createdDeliveryCount, 5);
  assert.equal(repo.commits, 1);
});

test('Round 1 source creates Round 2 and Round 2 blocks Round 3', async () => {
  repo = repository([scan({
    humanDeliveryCount: 10,
    batches: [
      { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000) },
      { id: 'batch1', worryId: 'worry1', batchRound: 1, createdAt: nineHoursAgo },
    ],
    sourceDeliveries: [
      { id: 'worry1_r1a', worryId: 'worry1', batchId: 'batch1', recipientUid: 'r1a', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r1b', worryId: 'worry1', batchId: 'batch1', recipientUid: 'r1b', selectionType: 'random', answeredAt: null },
    ],
  })]);
  const roundTwo = await rematchDueDeliveries({
    db: {} as never,
    messaging: null,
    now,
    repository: repo,
    random: () => 0,
    pushAdapter: async () => undefined,
  });
  assert.equal(roundTwo.status, 'completed');
  assert.equal(roundTwo.createdDeliveryCount, 5);

  repo = repository([scan({
    batches: [
      { id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo },
      { id: 'batch1', worryId: 'worry1', batchRound: 1, createdAt: nineHoursAgo },
      { id: 'batch2', worryId: 'worry1', batchRound: 2, createdAt: nineHoursAgo },
    ],
  })]);
  const blocked = await rematchDueDeliveries({ db: {} as never, messaging: null, now, repository: repo });
  assert.equal(blocked.status, 'completed');
  assert.equal(blocked.results[0]?.reason, 'round_complete');
  assert.equal(repo.commits, 0);
});

test('random slot policy uses the source batch random recipient answer state', async () => {
  repo = repository([scan({
    sourceDeliveries: [
      { id: 'worry1_r0a', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0a', selectionType: 'matched', answeredAt: null },
      { id: 'worry1_r0e', worryId: 'worry1', batchId: 'batch0', recipientUid: 'r0e', selectionType: 'random', answeredAt: now },
    ],
  })], {
    onCommit: async params => {
      assert.equal(params.recipients.every(recipient => recipient.selectionType === 'matched'), true);
      return { status: 'created', worryId: 'worry1', deliveryIds: [], recipientUids: [], createdCount: 0 };
    },
  });
  await rematchDueDeliveries({ db: {} as never, messaging: null, now, repository: repo, random: () => 0 });
});

test('dry run never commits or calls push', async () => {
  let pushCalls = 0;
  repo = repository([scan()]);
  const result = await rematchDueDeliveries({
    db: {} as never,
    messaging: null,
    now,
    dryRun: true,
    repository: repo,
    pushAdapter: async () => {
      pushCalls += 1;
    },
  });

  assert.equal(result.status, 'completed');
  assert.equal(repo.commits, 0);
  assert.equal(repo.completes, 0);
  assert.equal(pushCalls, 0);
});

test('push failure after commit does not change completed result', async () => {
  repo = repository([scan()]);
  const result = await rematchDueDeliveries({
    db: {} as never,
    messaging: null,
    now,
    repository: repo,
    pushAdapter: async () => {
      throw new Error('push down');
    },
  });

  assert.equal(result.status, 'completed');
  assert.equal(repo.commits, 1);
});
