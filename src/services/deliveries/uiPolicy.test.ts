import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPassResultToSuppressedDeliveryIds,
  filterSuppressedFeedWorries,
} from './uiPolicy';
import type { HomeWorryFeedLetter } from '../homeWorryFeed';

test('successful pass suppresses the card before listener reconciliation', () => {
  const suppressed = applyPassResultToSuppressedDeliveryIds({
    result: { status: 'passed', deliveryId: 'd1', replacementStatus: 'created' },
    deliveryId: 'd1',
    suppressedDeliveryIds: new Set(),
  });
  const visible = filterSuppressedFeedWorries({
    suppressedDeliveryIds: suppressed,
    feedWorries: [
      { id: 'd1', deliveryId: 'd1' },
      { id: 'd2', deliveryId: 'd2' },
    ] as HomeWorryFeedLetter[],
  });

  assert.deepEqual(visible.map(item => item.deliveryId), ['d2']);
});

test('failed pass keeps the card visible', () => {
  const suppressed = applyPassResultToSuppressedDeliveryIds({
    result: { status: 'failed', reason: 'no' },
    deliveryId: 'd1',
    suppressedDeliveryIds: new Set(),
  });
  const visible = filterSuppressedFeedWorries({
    suppressedDeliveryIds: suppressed,
    feedWorries: [{ id: 'd1', deliveryId: 'd1' }] as HomeWorryFeedLetter[],
  });

  assert.deepEqual(visible.map(item => item.deliveryId), ['d1']);
});
