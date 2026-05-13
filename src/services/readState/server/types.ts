import type { Firestore } from 'firebase-admin/firestore';

export type ServerTimestampValue = unknown;

export interface DeliveryReadStateWriteModel {
  deliveryId: string;
  worryId: string;
  recipientUid: string;
  readAt: ServerTimestampValue;
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
}

export interface ReplyReadStateWriteModel {
  replyId: string;
  worryId: string;
  authorUid: string;
  readByAuthorAt: ServerTimestampValue;
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
}

export type MarkDeliveryReadCommitResult = {
  status: 'read';
  deliveryId: string;
  readAt: ServerTimestampValue;
  idempotent?: true;
};

export type MarkRepliesForWorryReadCommitResult = {
  status: 'read';
  worryId: string;
  markedCount: number;
};

export interface ReadStateRepository {
  markDeliveryRead(params: {
    recipientUid: string;
    deliveryId: string;
  }): Promise<MarkDeliveryReadCommitResult>;

  markRepliesForWorryRead(params: {
    authorUid: string;
    worryId: string;
    replyIds?: string[];
  }): Promise<MarkRepliesForWorryReadCommitResult>;
}

export type ServerMarkDeliveryReadResult =
  | MarkDeliveryReadCommitResult
  | { status: 'not_found'; code: 'delivery_missing'; message: string }
  | { status: 'forbidden'; code: 'not_delivery_recipient'; message: string }
  | { status: 'conflict'; code: 'delivery_hidden'; message: string }
  | { status: 'server_error'; code: 'transaction_aborted' | 'firebase_unavailable'; message: string; details?: unknown };

export type ServerMarkRepliesForWorryReadResult =
  | MarkRepliesForWorryReadCommitResult
  | { status: 'validation_error'; code: 'invalid_reply_ids'; message: string }
  | { status: 'not_found'; code: 'worry_missing' | 'reply_missing'; message: string }
  | { status: 'forbidden'; code: 'not_worry_author' | 'reply_not_for_worry_author'; message: string }
  | { status: 'server_error'; code: 'transaction_aborted' | 'firebase_unavailable'; message: string; details?: unknown };

export interface ReadStateServiceDeps {
  db: Firestore;
  repository?: ReadStateRepository;
}
