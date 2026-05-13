import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { processSimpleModerationResponse, type SimpleProvider } from '../../server/moderationResponses';
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
  saveFeedback(params: {
    publisherUid: string;
    replyId: string;
    type: ReplyFeedbackType;
    comment: string | null;
    commentModerationLogId: string | null;
    moderationLog?: Record<string, unknown>;
  }): Promise<{ feedbackId: string; helpedCountApplied: boolean }>;
}

export async function submitReplyFeedbackOnServer(params: SubmitReplyFeedbackOnServerParams & {
  db: Firestore;
  moderationProvider: SimpleProvider;
  repository?: ReplyFeedbackRepository;
}): Promise<ServerReplyFeedbackResult> {
  const repository = params.repository ?? createReplyFeedbackRepository({ db: params.db });
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
      reasonCode: moderation.statusCode === 200 && moderation.body.status === 'rejected' ? moderation.body.reason : '',
      userMessage: moderation.statusCode === 200 && moderation.body.status === 'rejected'
        ? moderation.body.reason
        : '',
      helpMessage: null,
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
      return {
        status: 'rejected',
        code: 'comment_rejected',
        message: moderation.body.reason,
        moderationLogId: commentModerationLogId,
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

    return { status: 'saved', ...saved };
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

  if (typeof value !== 'string') {
    return { status: 'error', result: { status: 'validation_error', code: 'comment_empty', message: '코멘트를 입력해 주세요.' } };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { status: 'error', result: { status: 'validation_error', code: 'comment_empty', message: '코멘트를 입력해 주세요.' } };
  }

  if (trimmed.length > 1000) {
    return { status: 'error', result: { status: 'validation_error', code: 'comment_too_long', message: '코멘트는 1000자 이내로 입력해 주세요.' } };
  }

  return { status: 'ok', comment: trimmed };
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
