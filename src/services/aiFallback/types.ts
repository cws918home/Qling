import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { ReplyModerationResult } from '../replyPublication/server/moderation';
import type { ReplyModerationProvider } from '../replyPublication/server/types';

export type AiFallbackSkipReason =
  | 'not_24h_elapsed'
  | 'human_delivery_cap_not_exhausted'
  | 'human_reply_exists'
  | 'ai_reply_exists'
  | 'example_worry'
  | 'worry_missing'
  | 'dry_run';

export type AiFallbackCandidateResult =
  | {
      status: 'created';
      worryId: string;
      replyId: string;
      moderationLogId: string;
      notification: 'sent' | 'attempted';
      warning?: string;
    }
  | {
      status: 'skipped';
      worryId: string;
      reason: AiFallbackSkipReason;
    }
  | {
      status: 'rejected';
      worryId: string;
      moderationLogId: string;
      reasonCode: string;
    }
  | {
      status: 'failed';
      worryId: string;
      error: string;
    };

export type CreateAiFallbacksResult =
  | {
      status: 'completed' | 'partial';
      runId: string;
      checkedCount: number;
      createdReplyCount: number;
      results: AiFallbackCandidateResult[];
      dryRun: boolean;
    }
  | {
      status: 'lock_busy';
      runId: string;
      checkedCount: 0;
      createdReplyCount: 0;
      results: [];
      dryRun: boolean;
    }
  | {
      status: 'provider_error';
      runId: string;
      code: 'generator_failed' | 'moderation_failed';
      message: string;
      details?: unknown;
    }
  | {
      status: 'server_error';
      runId?: string;
      code: 'transaction_aborted' | 'firebase_unavailable';
      message: string;
      details?: unknown;
    };

export type CreateAiFallbacks = (params: {
  now?: Date;
  dryRun?: boolean;
  limit?: number;
}) => Promise<CreateAiFallbacksResult>;

export interface AiFallbackCandidate {
  worryId: string;
  authorUid: string;
  content: string;
  createdAt: Date | null;
  humanDeliveryCount?: number;
  humanDeliveryLimit?: number;
  initialDeliveryBatchId?: string;
  initialDeliveryCreatedCount?: number;
  hasAiReply?: boolean;
  aiReplyId?: string;
}

export interface AiFallbackModerationLogWriteModel {
  id: string;
  targetType: 'ai_reply';
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
  createdAt: unknown;
  updatedAt: unknown;
}

export interface AiFallbackReplyWriteModel {
  id: string;
  deliveryId: string;
  worryId: string;
  authorUid: string;
  replierUid: 'ai_fallback';
  content: string;
  status: 'active';
  moderationLogId: string;
  createdAt: unknown;
  updatedAt: unknown;
  isAiGenerated: true;
  isExampleReply: false;
}

export type AiFallbackCommitResult =
  | {
      status: 'created';
      worryId: string;
      replyId: string;
      authorUid: string;
      moderationLogId: string;
    }
  | {
      status: 'skipped';
      worryId: string;
      reason: AiFallbackSkipReason;
    }
  | {
      status: 'rejected';
      worryId: string;
      moderationLogId: string;
      reasonCode: string;
    };

export interface AiFallbackRepository {
  createRunId(): string;
  createModerationLogId(): string;
  fetchCandidates(params: { now: Date; limit: number }): Promise<AiFallbackCandidate[]>;
  acquireRunLock(params: { runId: string; now: Date; lockUntil: Date }): Promise<boolean>;
  completeRun(params: {
    runId: string;
    now: Date;
    status: 'completed' | 'failed' | 'partial';
    checkedCount: number;
    createdReplyCount: number;
    error: string | null;
  }): Promise<void>;
  commitApprovedReply(params: {
    runId: string;
    now: Date;
    candidate: AiFallbackCandidate;
    content: string;
    moderationLog: AiFallbackModerationLogWriteModel;
  }): Promise<AiFallbackCommitResult>;
  commitRejectedReply(params: {
    runId: string;
    now: Date;
    candidate: AiFallbackCandidate;
    moderationLog: AiFallbackModerationLogWriteModel;
  }): Promise<AiFallbackCommitResult>;
}

export type AiReplyGenerator = (params: {
  worryContent: string;
}) => Promise<{ content: string }>;

export type AiFallbackPushAdapter = (params: {
  db: Firestore;
  messaging: Messaging | null;
  reply: { id: string; authorUid: string };
}) => Promise<void>;

export interface CreateAiFallbacksDependencies {
  db: Firestore;
  messaging: Messaging | null;
  generator: AiReplyGenerator;
  moderationProvider: ReplyModerationProvider;
  repository?: AiFallbackRepository;
  pushAdapter?: AiFallbackPushAdapter;
  clock?: () => Date;
  moderateAiReply?: (params: {
    content: string;
    provider: ReplyModerationProvider;
  }) => Promise<ReplyModerationResult>;
}
