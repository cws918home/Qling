import type { AdminHiddenFields } from './types';

export function isAlreadyHidden(data: FirebaseFirestore.DocumentData): boolean {
  return data.status === 'hidden' || Boolean(data.hiddenAt);
}

export function buildHiddenFields(params: {
  hiddenReason: string;
  hiddenBy: string;
  timestamp: unknown;
}): AdminHiddenFields {
  return {
    status: 'hidden',
    hiddenAt: params.timestamp,
    hiddenReason: params.hiddenReason,
    hiddenBy: params.hiddenBy,
    updatedAt: params.timestamp,
  };
}

export function nextActiveDeliveryCount(current: number): {
  value: number;
  decremented: boolean;
} {
  return {
    value: Math.max(0, current - 1),
    decremented: current > 0,
  };
}
