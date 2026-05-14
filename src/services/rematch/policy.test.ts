import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTargetCount,
  chooseNextRematchSource,
  selectRematchRecipients,
} from './policy';
import type { RematchScan } from './types';

const now = new Date('2026-05-14T00:00:00.000Z');
const nineHoursAgo = new Date(now.getTime() - 9 * 60 * 60 * 1000);

function delivery(uid: string, answeredAt: unknown | null = null) {
  return {
    id: `worry1_${uid}`,
    worryId: 'worry1',
    batchId: 'batch0',
    recipientUid: uid,
    selectionType: 'matched' as const,
    answeredAt,
    isAiRecipient: false,
  };
}

function scan(overrides: Partial<RematchScan> = {}): RematchScan {
  return {
    worryId: 'worry1',
    author: { uid: 'author', gender: 'female', interests: ['career'] },
    matchingCategories: ['career'],
    humanDeliveryCount: 5,
    humanDeliveryLimit: 15,
    initialDeliveryBatchId: 'batch0',
    batches: [{ id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo, reason: 'initial' }],
    sourceDeliveries: [
      delivery('r0a'),
      delivery('r0b'),
      delivery('r0c'),
      delivery('r0d'),
      delivery('r0e'),
    ],
    allDeliveries: [],
    answeredUids: new Set(),
    candidates: [],
    ...overrides,
  };
}

test('target count uses PRD 5-slot formula for a full source batch with no answers', () => {
  assert.equal(calculateTargetCount({ scan: scan(), sourceBatchId: 'batch0' }), 5);
});

test('target count subtracts answered human deliveries from 5 for a full source batch', () => {
  assert.equal(calculateTargetCount({
    scan: scan({
      sourceDeliveries: [
        delivery('r0a', now),
        delivery('r0b', now),
        delivery('r0c'),
        delivery('r0d'),
        delivery('r0e'),
      ],
    }),
    sourceBatchId: 'batch0',
  }), 3);
});

test('target count stays 5 for a partial source batch with two created and no answers', () => {
  assert.equal(calculateTargetCount({
    scan: scan({
      sourceDeliveries: [
        delivery('r1a'),
        delivery('r1b'),
      ],
    }),
    sourceBatchId: 'batch0',
  }), 5);
});

test('target count is 4 for a partial source batch with two created and one answer', () => {
  assert.equal(calculateTargetCount({
    scan: scan({
      sourceDeliveries: [
        delivery('r1a', now),
        delivery('r1b'),
      ],
    }),
    sourceBatchId: 'batch0',
  }), 4);
});

test('remaining capacity caps target count', () => {
  assert.equal(calculateTargetCount({
    scan: scan({ humanDeliveryCount: 13, humanDeliveryLimit: 15 }),
    sourceBatchId: 'batch0',
  }), 2);
});

test('humanDeliveryLimit fallback 15 still caps target count correctly', () => {
  assert.equal(calculateTargetCount({
    scan: scan({ humanDeliveryCount: 14, humanDeliveryLimit: Number.NaN }),
    sourceBatchId: 'batch0',
  }), 1);
});

test('all five answered source slots produce no target deliveries', () => {
  assert.equal(calculateTargetCount({
    scan: scan({
      sourceDeliveries: [
        delivery('r0a', now),
        delivery('r0b', now),
        delivery('r0c', now),
        delivery('r0d', now),
        delivery('r0e', now),
      ],
    }),
    sourceBatchId: 'batch0',
  }), 0);
});

test('Round 1 source accepts initial reason and legacy missing reason', () => {
  for (const reason of ['initial', undefined]) {
    const result = chooseNextRematchSource({
      scan: scan({
        batches: [{ id: 'batch0', worryId: 'worry1', batchRound: 0, createdAt: nineHoursAgo, reason }],
      }),
      now,
    });

    assert.equal(result.status, 'due');
    if (result.status === 'due') {
      assert.equal(result.nextRound, 1);
      assert.equal(result.sourceBatch.id, 'batch0');
    }
  }
});

test('Round 1 source rejects non-initial reason and later-round batches', () => {
  for (const batch of [
    { id: 'batch0', worryId: 'worry1', batchRound: 0 as const, createdAt: nineHoursAgo, reason: 'rematch_timeout' },
    { id: 'batch0', worryId: 'worry1', batchRound: 0 as const, createdAt: nineHoursAgo, reason: 'other' },
    { id: 'batch0', worryId: 'worry1', batchRound: 1 as const, createdAt: nineHoursAgo, reason: 'rematch_timeout' },
    { id: 'batch0', worryId: 'worry1', batchRound: 2 as const, createdAt: nineHoursAgo, reason: 'rematch_timeout' },
  ]) {
    assert.deepEqual(chooseNextRematchSource({
      scan: scan({ batches: [batch] }),
      now,
    }), { status: 'skip', reason: 'no_source_batch' });
  }
});

test('selectRematchRecipients excludes deleted users and allows missing deleted field', () => {
  const selected = selectRematchRecipients({
    scan: scan({
      candidates: [
        { uid: 'deleted', deleted: true, gender: 'female', interests: ['career'] },
        { uid: 'missingDeleted', gender: 'female', interests: ['career'] },
      ],
    }),
    targetCount: 2,
    includeRandom: false,
    random: () => 0,
  });

  assert.deepEqual(selected.map(candidate => candidate.uid), ['missingDeleted']);
});
