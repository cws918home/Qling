import type { ClientPublishReplyResult } from '../../services/replyPublication/apiClient';
import type { ClientPublishWorryResult } from '../../services/worryPublication/apiClient';
import {
  routeAfterReplyPublish,
  routeAfterWorryPublish,
  type AppRouteState,
} from '../../services/appShell/prdNavigationPolicy';
import type { ScreenModerationState } from '../shared/contract';

export type WritePublicationPolicyResult = {
  readonly moderation: ScreenModerationState;
  readonly alertMessage?: string;
  readonly clearDraft: boolean;
  readonly route?: AppRouteState;
};

export function resolveWorryPublicationResult(
  result: ClientPublishWorryResult,
): WritePublicationPolicyResult {
  if (result.status === 'rejected') {
    const message = result.userMessage ?? result.reason ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    return {
      moderation: { status: 'rejected', reason: message, helpMessage: result.helpMessage },
      alertMessage: result.helpMessage ? `${message}\n\n${result.helpMessage}` : message,
      clearDraft: false,
    };
  }

  if (result.status === 'failed') {
    const message = `전송 실패: ${result.reason || '알 수 없는 오류'}`;
    return {
      moderation: { status: 'failed', message },
      alertMessage: message,
      clearDraft: false,
    };
  }

  return {
    moderation: { status: 'approved' },
    clearDraft: true,
    route: routeAfterWorryPublish({ worryId: result.worryId }),
  };
}

export function resolveReplyPublicationResult(
  result: ClientPublishReplyResult,
  target: { readonly deliveryId: string; readonly worryId: string },
): WritePublicationPolicyResult {
  if (result.status === 'rejected') {
    const message = result.userMessage ?? result.reason ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    return {
      moderation: { status: 'rejected', reason: message, helpMessage: result.helpMessage },
      alertMessage: result.helpMessage ? `${message}\n\n${result.helpMessage}` : message,
      clearDraft: false,
    };
  }

  if (result.status === 'failed') {
    const message = result.reason || '답장 전송 실패';
    return {
      moderation: { status: 'failed', message },
      alertMessage: message,
      clearDraft: false,
    };
  }

  return {
    moderation: { status: 'approved' },
    clearDraft: true,
    route: routeAfterReplyPublish({
      replyId: result.replyId,
      deliveryId: target.deliveryId,
      worryId: target.worryId,
    }),
  };
}
