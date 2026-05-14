import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';

export type ServerTimestampValue = unknown;

export type ReplyStatus = 'active' | 'hidden';

export interface ReplyWriteModel {
  id: string;
  deliveryId: string;
  worryId: string;
  authorUid: string;
  replierUid: string;
  content: string;
  status: ReplyStatus;
  publisherVisible: boolean;
  moderationLogId: string;
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
  isAiGenerated: false;
  isExampleReply: boolean;
}

export interface ReplyModerationLogWriteModel {
  id: string;
  targetType: 'reply' | 'example_reply';
  targetId: string;
  uid: string;
  originalContent: string;
  status: 'approved' | 'rejected';
  reasonCode: string;
  userMessage: string;
  helpMessage: string | null;
  rawProviderResponse: unknown | null;
  provider: string;
  model: string;
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
}

export type ReplyModerationProvider = (content: string, strictRetry?: boolean) => Promise<unknown>;

export type ReplyPublicationCommitResult =
  | {
      status: 'created';
      replyId: string;
      reply: ReplyWriteModel;
    }
  | {
      status: 'idempotent';
      replyId: string;
      reply: ReplyWriteModel;
    };

export interface ReplyPublicationRepository {
  createIds(): { moderationLogId: string };

  commitRejectedReplyModeration(params: {
    moderationLog: ReplyModerationLogWriteModel;
  }): Promise<{ moderationLogId: string }>;

  commitApprovedReplyPublication(params: {
    deliveryId: string;
    replierUid: string;
    content: string;
    moderationLog: ReplyModerationLogWriteModel;
  }): Promise<ReplyPublicationCommitResult>;
}

export type ServerPublishReplyResult =
  | { status: 'published'; replyId: string; idempotent?: boolean }
  | { status: 'rejected'; reasonCode: string; userMessage: string; helpMessage?: string; moderationLogId: string }
  | { status: 'validation_error'; code: 'empty' | 'too_long' | 'invalid_content_type'; message: string }
  | { status: 'provider_error'; code: 'provider_error' | 'provider_invalid'; message: string; details?: unknown }
  | { status: 'not_found'; code: 'delivery_missing' | 'worry_missing'; message: string }
  | { status: 'forbidden'; code: 'not_delivery_recipient'; message: string }
  | { status: 'conflict'; code: 'delivery_not_active' | 'delivery_hidden' | 'duplicate_reply'; message: string }
  | { status: 'server_error'; code: 'transaction_aborted' | 'firebase_unavailable'; message: string; details?: unknown };

export interface ReplyPublicationServiceDeps {
  db: Firestore;
  messaging: Messaging | null;
  moderationProvider: ReplyModerationProvider;
  clock?: () => Date;
  repository?: ReplyPublicationRepository;
}
