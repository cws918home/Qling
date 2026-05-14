import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { processSimpleModerationResponse, type SimpleProvider } from '../../server/moderationResponses';
import { getModerationRejectionCopy } from '../moderation/rejectionCopy';
import { validateContent } from '../validation/content';
import { createReplyFeedbackPushService } from './feedbackPush';
import { createReplyFeedbackRepository } from './serverFirestore';
import type { ReplyFeedbackType, ServerReplyFeedbackResult } from './types';

export interface SubmitReplyFeedbackOnServerParams {
  publisherUid: string;
  replyId: string;
  type: unknown;
  comment?: unknown;
}

export interface ReplyFeedbackRepository {
  createModerationLogId(): string;
  saveRejectedCommentModeration(params: {
    moderationLogId: string;
    moderationLog: Record<string, unknown>;
  }): Promise<{ moderationLogId: string }>;
  saveFeedback(params: {
    publisherUid: string;
    replyId: string;
    type: ReplyFeedbackType;
    comment: string | null;
    commentModerationLogId: string | null;
    moderationLog?: Record<string, unknown>;
  }): Promise<ReplyFeedbackCommitResult>;
}

export interface ReplyFeedbackCommitResult {
  feedbackId: string;
  helpedCountApplied: boolean;
  replyLikedPush: null | {
    feedbackId: string;
    replyId: string;
    replierUid: string;
  };
}

export interface ReplyFeedbackPushService {
  sendReplyLiked(params: {
    feedbackId: string;
    replyId: string;
    replierUid: string;
  }): Promise<void>;
}

export interface ReplyFeedbackPushLogger {
  warn(message: string, details?: unknown): void;
}

export async function submitReplyFeedbackOnServer(params: SubmitReplyFeedbackOnServerParams & {
  db: Firestore;
  messaging?: Messaging | null;
  moderationProvider: SimpleProvider;
  repository?: ReplyFeedbackRepository;
  pushService?: ReplyFeedbackPushService;
  pushLogger?: ReplyFeedbackPushLogger;
}): Promise<ServerReplyFeedbackResult> {
  const repository = params.repository ?? createReplyFeedbackRepository({ db: params.db });
  const pushLogger = params.pushLogger ?? console;
  const pushService = params.pushService ?? createReplyFeedbackPushService({
    db: params.db,
    messaging: params.messaging ?? null,
    logger: pushLogger,
  });
  const typeResult = parseFeedbackType(params.type);
  if (!typeResult) {
    return { status: 'validation_error', code: 'invalid_type', message: '피드백 형식이 올바르지 않습니다.' };
  }

  const commentResult = parseComment(params.comment);
  if (commentResult.status === 'error') {
    return commentResult.result;
  }

  let commentModerationLogId: string | null = null;
  let moderationLog: Record<string, unknown> | undefined;
  if (commentResult.comment !== null) {
    const moderation = await processSimpleModerationResponse(commentResult.comment, params.moderationProvider);
    commentModerationLogId = repository.createModerationLogId();
    moderationLog = {
      targetType: 'feedback_comment',
      targetId: params.replyId,
      uid: params.publisherUid,
      originalContent: commentResult.comment,
      status: moderation.statusCode === 200 ? moderation.body.status : 'provider_error',
      reasonCode: moderation.statusCode === 200 && moderation.body.status === 'rejected'
        ? getModerationRejectionCopy(moderation.body.reason).reasonCode
        : '',
      userMessage: moderation.statusCode === 200 && moderation.body.status === 'rejected'
        ? getModerationRejectionCopy(moderation.body.reason).userMessage
        : '',
      helpMessage: moderation.statusCode === 200 && moderation.body.status === 'rejected'
        ? getModerationRejectionCopy(moderation.body.reason).helpMessage
        : null,
      rawProviderResponse: moderation.body,
      provider: 'feedback_comment',
      model: 'configured-provider',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (moderation.statusCode !== 200) {
      return { status: 'provider_error', code: 'provider_error', message: '코멘트 확인 중 문제가 발생했습니다.', details: moderation.body };
    }

    if (moderation.body.status === 'rejected') {
      const copy = getModerationRejectionCopy(moderation.body.reason);
      const committed = await repository.saveRejectedCommentModeration({
        moderationLogId: commentModerationLogId,
        moderationLog,
      });
      return {
        status: 'rejected',
        code: 'comment_rejected',
        message: copy.userMessage,
        reasonCode: copy.reasonCode,
        userMessage: copy.userMessage,
        helpMessage: copy.helpMessage ?? undefined,
        moderationLogId: committed.moderationLogId,
      };
    }
  }

  try {
    const saved = await repository.saveFeedback({
      publisherUid: params.publisherUid,
      replyId: params.replyId,
      type: typeResult,
      comment: commentResult.comment,
      commentModerationLogId,
      moderationLog,
    });

    if (saved.replyLikedPush) {
      try {
        await pushService.sendReplyLiked(saved.replyLikedPush);
      } catch (pushError) {
        pushLogger.warn('[FeedbackPush] Reply-liked push failed after feedback commit.', {
          feedbackId: saved.feedbackId,
          replyId: params.replyId,
          error: pushError instanceof Error ? pushError.message : pushError,
        });
      }
    }

    return {
      status: 'saved',
      feedbackId: saved.feedbackId,
      helpedCountApplied: saved.helpedCountApplied,
    };
  } catch (error) {
    if (error instanceof Error) {
      const mapped = mapRepositoryError(error.message);
      if (mapped) return mapped;
    }

    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: '피드백 저장 중 문제가 발생했습니다.',
      details: error instanceof Error ? error.message : error,
    };
  }
}

function parseFeedbackType(value: unknown): ReplyFeedbackType | null {
  return value === 'like' || value === 'dislike' ? value : null;
}

function parseComment(value: unknown): { status: 'ok'; comment: string | null } | { status: 'error'; result: ServerReplyFeedbackResult } {
  if (value === undefined || value === null) {
    return { status: 'ok', comment: null };
  }

  const validation = validateContent(value, 'feedback_comment');
  if (validation.status === 'validation_error') {
    return { status: 'error', result: validation };
  }

  return { status: 'ok', comment: validation.content };
}

function mapRepositoryError(code: string): ServerReplyFeedbackResult | null {
  switch (code) {
    case 'reply_missing':
      return { status: 'not_found', code: 'reply_missing', message: '답장을 찾을 수 없습니다.' };
    case 'worry_missing':
      return { status: 'not_found', code: 'worry_missing', message: '고민을 찾을 수 없습니다.' };
    case 'not_worry_publisher':
      return { status: 'forbidden', code: 'not_worry_publisher', message: '고민 작성자만 피드백을 남길 수 있습니다.' };
    case 'reply_worry_mismatch':
      return { status: 'forbidden', code: 'reply_worry_mismatch', message: '답장과 고민 정보가 일치하지 않습니다.' };
    case 'publisher_reply_forbidden':
      return { status: 'forbidden', code: 'publisher_reply_forbidden', message: '내 답장에는 피드백을 남길 수 없습니다.' };
    case 'invalid_reply':
      return { status: 'forbidden', code: 'invalid_reply', message: '피드백을 남길 수 없는 답장입니다.' };
    case 'feedback_conflict':
      return { status: 'conflict', code: 'feedback_conflict', message: '이미 다른 피드백이 저장되었습니다.' };
    default:
      return null;
  }
}
