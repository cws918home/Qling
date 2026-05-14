import type { Firestore } from 'firebase-admin/firestore';

export type AdminHideTargetType = 'worry' | 'delivery' | 'reply';

export interface HideContentParams {
  db: Firestore;
  targetType: AdminHideTargetType;
  targetId: string;
  hiddenReason: string;
  hiddenBy: string;
}

export interface AdminHiddenFields extends Record<string, unknown> {
  status: 'hidden';
  hiddenAt: unknown;
  hiddenReason: string;
  hiddenBy: string;
  updatedAt: unknown;
}

export type HideContentResult =
  | {
    status: 'hidden';
    targetType: AdminHideTargetType;
    targetId: string;
    alreadyHidden: boolean;
    counterDecremented: boolean;
  }
  | {
    status: 'not_found';
    code: 'target_missing';
    message: string;
  }
  | {
    status: 'conflict';
    code: 'recipient_missing' | 'recipient_counter_malformed' | 'delivery_malformed';
    message: string;
  }
  | {
    status: 'server_error';
    code: 'transaction_aborted';
    message: string;
    details?: unknown;
  };

export interface AdminHidingRepository {
  hideWorry(params: Omit<HideContentParams, 'db' | 'targetType'>): Promise<HideContentResult>;
  hideDelivery(params: Omit<HideContentParams, 'db' | 'targetType'>): Promise<HideContentResult>;
  hideReply(params: Omit<HideContentParams, 'db' | 'targetType'>): Promise<HideContentResult>;
}
