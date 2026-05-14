import type { HomeWorryFeedLetter } from '../homeWorryFeed';
import type { ClientPassDeliveryResult } from './apiClient';

export function applyPassResultToSuppressedDeliveryIds(params: {
  result: ClientPassDeliveryResult;
  deliveryId: string;
  suppressedDeliveryIds: Set<string>;
}): Set<string> {
  if (params.result.status !== 'passed') {
    return params.suppressedDeliveryIds;
  }
  return new Set(params.suppressedDeliveryIds).add(params.deliveryId);
}

export function filterSuppressedFeedWorries(params: {
  feedWorries: HomeWorryFeedLetter[];
  suppressedDeliveryIds: Set<string>;
}): HomeWorryFeedLetter[] {
  return params.feedWorries.filter(worry => (
    !worry.deliveryId || !params.suppressedDeliveryIds.has(worry.deliveryId)
  ));
}
