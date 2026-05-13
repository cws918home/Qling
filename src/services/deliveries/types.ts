import type { HumanCandidate, RankedHumanCandidate } from '../matching/server/recipientPolicy';

export type ServerTimestampValue = unknown;
export type ReplacementStatus = 'created' | 'shortfall' | 'not_applicable';

export interface DeliveryPassPublicResult {
  status: 'passed';
  deliveryId: string;
  replacementDeliveryId?: string;
  replacementStatus: ReplacementStatus;
}

export interface DeliveryPassInternalResult extends DeliveryPassPublicResult {
  attemptId?: string;
  warnings?: string[];
}

export type ServerPassDeliveryResult =
  | DeliveryPassInternalResult
  | { status: 'validation_error'; code: 'invalid_body'; message: string }
  | { status: 'forbidden'; code: 'not_delivery_recipient'; message: string }
  | { status: 'not_found'; code: 'delivery_missing' | 'worry_missing'; message: string }
  | { status: 'conflict'; code: 'delivery_hidden' | 'delivery_not_active' | 'worry_hidden' | 'delivery_terminal_timestamp'; message: string }
  | { status: 'server_error'; code: 'transaction_aborted' | 'data_integrity_error'; message: string; details?: unknown };

export interface PassReplacementAttemptWriteModel {
  id: string;
  passedDeliveryId: string;
  worryId: string;
  passerUid: string;
  authorUid: string;
  status: 'created' | 'shortfall';
  selectedRecipientUid?: string;
  createdDeliveryId?: string;
  replacementReason: 'pass';
  shortfallReason?: string;
  replacementPushStatus?: 'pending' | 'sent' | 'failed' | 'skipped_no_token';
  replacementPushLogIds?: string[];
  replacementPushWarnings?: string[];
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
}

export interface PassReplacementDeliveryWriteModel {
  id: string;
  worryId: string;
  recipientUid: string;
  authorUid: string;
  status: 'active';
  answeredAt: null;
  passedAt: null;
  answerableUntil: null;
  batchId: null;
  batchRound: null;
  selectionType: 'matched';
  matchOverlapCount: number;
  matchCategoriesSnapshot: string[];
  recipientInterestsSnapshot: string[];
  recipientGenderSnapshot: string;
  recipientHelpedCountSnapshot: number;
  authorGenderSnapshot: string;
  isAiRecipient: false;
  createdByPassDeliveryId: string;
  replacementForDeliveryId: string;
  replacementReason: 'pass';
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
}

export interface PassReplacementScan {
  candidates: HumanCandidate[];
  excludedUids: Set<string>;
  existingHumanDeliveryCount: number;
  replierUids: Set<string>;
  author: { uid: string; gender: string };
  matchingCategories: string[];
}

export interface DeliveryPassRepository {
  fetchReplacementScan(params: { deliveryId: string }): Promise<PassReplacementScan>;
  commitPassDelivery(params: {
    uid: string;
    deliveryId: string;
    selectedRecipient: RankedHumanCandidate | null;
    existingHumanDeliveryCount: number;
  }): Promise<DeliveryPassInternalResult | { status: 'candidate_unavailable' }>;
  markReplacementPushResult(params: {
    attemptId: string;
    status: 'sent' | 'failed' | 'skipped_no_token';
    logIds: string[];
    warnings: string[];
  }): Promise<void>;
}
