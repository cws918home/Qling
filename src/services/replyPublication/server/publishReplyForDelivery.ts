import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import {
  REPLY_MODERATION_MODEL,
  REPLY_MODERATION_PROVIDER,
  moderateReplyForPublication,
} from './moderation';
import {
  createReplyPublicationRepository,
  serverTimestamp,
} from './firestoreRepository';
import { sendNewReplyPushAfterCommit } from './pushLogs';
import { validateReplyContent } from './validation';
import type {
  ReplyModerationLogWriteModel,
  ReplyModerationProvider,
  ReplyPublicationRepository,
  ServerPublishReplyResult,
} from './types';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mapTransactionError(error: unknown): ServerPublishReplyResult {
  const code = errorMessage(error);
  if (code === 'delivery_missing') {
    return { status: 'not_found', code, message: '답장할 전달을 찾을 수 없습니다.' };
  }
  if (code === 'worry_missing') {
    return { status: 'not_found', code, message: '원본 사연을 찾을 수 없습니다.' };
  }
  if (code === 'not_delivery_recipient') {
    return { status: 'forbidden', code, message: '이 전달에 답장할 권한이 없습니다.' };
  }
  if (code === 'delivery_hidden') {
    return { status: 'conflict', code, message: '숨겨진 전달에는 답장할 수 없습니다.' };
  }
  if (code === 'delivery_not_active' || code === 'duplicate_reply') {
    return { status: 'conflict', code, message: '이미 처리된 전달입니다.' };
  }
  return {
    status: 'server_error',
    code: 'transaction_aborted',
    message: '답장 저장 중 문제가 발생했습니다.',
    details: code,
  };
}

function buildModerationLog(params: {
  id: string;
  deliveryId: string;
  replierUid: string;
  content: string;
  status: ReplyModerationLogWriteModel['status'];
  reasonCode: string;
  userMessage: string;
  helpMessage: string | null;
  rawProviderResponse: unknown | null;
}): ReplyModerationLogWriteModel {
  const timestamp = serverTimestamp();
  return {
    id: params.id,
    targetType: 'reply',
    targetId: params.deliveryId,
    uid: params.replierUid,
    originalContent: params.content,
    status: params.status,
    reasonCode: params.reasonCode,
    userMessage: params.userMessage,
    helpMessage: params.helpMessage,
    rawProviderResponse: params.rawProviderResponse,
    provider: REPLY_MODERATION_PROVIDER,
    model: REPLY_MODERATION_MODEL,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function publishReplyForDelivery(params: {
  db: Firestore;
  messaging: Messaging | null;
  replierUid: string;
  deliveryId: string;
  content: unknown;
  moderationProvider: ReplyModerationProvider;
  repository?: ReplyPublicationRepository;
}): Promise<ServerPublishReplyResult> {
  const validation = validateReplyContent(params.content);
  if (validation.status === 'validation_error') {
    return validation;
  }

  const repository =
    params.repository ?? createReplyPublicationRepository({ db: params.db });
  const ids = repository.createIds();

  const moderation = await moderateReplyForPublication({
    content: validation.content,
    provider: params.moderationProvider,
  });

  if (moderation.status === 'provider_error') {
    return {
      status: 'provider_error',
      code: 'provider_error',
      message: '답장 검토 중 문제가 발생했습니다.',
      details: errorMessage(moderation.error),
    };
  }

  if (moderation.status === 'provider_invalid') {
    return {
      status: 'provider_error',
      code: 'provider_invalid',
      message: '답장 검토 결과를 해석할 수 없습니다.',
      details: moderation.rawProviderResponse,
    };
  }

  if (moderation.status === 'rejected') {
    const moderationLog = buildModerationLog({
      id: ids.moderationLogId,
      deliveryId: params.deliveryId,
      replierUid: params.replierUid,
      content: validation.content,
      status: 'rejected',
      reasonCode: moderation.reasonCode,
      userMessage: moderation.userMessage,
      helpMessage: moderation.helpMessage,
      rawProviderResponse: moderation.rawProviderResponse,
    });

    const committed = await repository.commitRejectedReplyModeration({ moderationLog });
    return {
      status: 'rejected',
      reasonCode: moderation.reasonCode,
      userMessage: moderation.userMessage,
      helpMessage: moderation.helpMessage ?? undefined,
      moderationLogId: committed.moderationLogId,
    };
  }

  const moderationLog = buildModerationLog({
    id: ids.moderationLogId,
    deliveryId: params.deliveryId,
    replierUid: params.replierUid,
    content: validation.content,
    status: 'approved',
    reasonCode: 'approved',
    userMessage: '',
    helpMessage: null,
    rawProviderResponse: moderation.rawProviderResponse,
  });

  try {
    const committed = await repository.commitApprovedReplyPublication({
      deliveryId: params.deliveryId,
      replierUid: params.replierUid,
      content: validation.content,
      moderationLog,
    });

    if (committed.status === 'created') {
      await sendNewReplyPushAfterCommit({
        db: params.db,
        messaging: params.messaging,
        reply: committed.reply,
      });
    }

    return {
      status: 'published',
      replyId: committed.replyId,
      idempotent: committed.status === 'idempotent' ? true : undefined,
    };
  } catch (error) {
    return mapTransactionError(error);
  }
}
