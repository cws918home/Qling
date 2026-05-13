export type LegacyReplyFeedback = 'helpful' | 'not_helpful';
export type ReplyFeedbackType = 'like' | 'dislike';
export type ReplyFeedback = LegacyReplyFeedback;
export type CommentVisibility = 'replier' | 'admin_only' | 'none';

export interface ReplyFeedbackTarget {
  id: string;
  senderId: string;
  source?: 'prd_replies' | 'legacy_letters';
  isAiGenerated?: boolean;
}

export interface SubmitReplyFeedbackResult {
  status: 'saved';
  feedbackId?: string;
  helpedCountApplied?: boolean;
  feedback?: LegacyReplyFeedback;
}

export interface ReplyFeedbackPersistence {
  saveReplyFeedback(replyId: string, feedbackType: LegacyReplyFeedback): Promise<void>;
  incrementHelpedCount(replierId: string): Promise<void>;
}

export interface SubmitReplyFeedbackInput {
  replyId: string;
  type: ReplyFeedbackType;
  comment?: string;
}

export interface ReplyFeedbackApiClient {
  submitReplyFeedback(input: SubmitReplyFeedbackInput): Promise<SubmitReplyFeedbackResult>;
}

export interface ReplyFeedbackDoc {
  replyId: string;
  worryId: string;
  deliveryId: string;
  publisherUid: string;
  replierUid: string;
  type: ReplyFeedbackType;
  comment: string | null;
  commentVisibility: CommentVisibility;
  commentModerationLogId: string | null;
  helpedCountApplied: boolean;
  isForAiReply: boolean;
  isForExampleReply: boolean;
  createdAt: unknown;
  updatedAt: unknown;
}

export type ServerReplyFeedbackResult =
  | { status: 'saved'; feedbackId: string; helpedCountApplied: boolean }
  | { status: 'validation_error'; code: 'invalid_type' | 'comment_empty' | 'comment_too_long'; message: string }
  | { status: 'rejected'; code: 'comment_rejected'; message: string; moderationLogId: string }
  | { status: 'provider_error'; code: 'provider_error' | 'provider_invalid'; message: string; details?: unknown }
  | { status: 'forbidden'; code: 'not_worry_publisher' | 'reply_worry_mismatch' | 'publisher_reply_forbidden' | 'invalid_reply'; message: string }
  | { status: 'not_found'; code: 'reply_missing' | 'worry_missing'; message: string }
  | { status: 'conflict'; code: 'feedback_conflict'; message: string }
  | { status: 'server_error'; code: 'transaction_aborted' | 'firebase_unavailable'; message: string; details?: unknown };
