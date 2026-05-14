import { createAdminHidingRepository } from './firestoreRepository';
import type {
  AdminHidingRepository,
  HideContentParams,
  HideContentResult,
} from './types';

function mapError(error: unknown): HideContentResult {
  if (error instanceof Error) {
    switch (error.message) {
      case 'target_missing':
        return { status: 'not_found', code: 'target_missing', message: '숨김 대상을 찾을 수 없습니다.' };
      case 'recipient_missing':
        return { status: 'conflict', code: 'recipient_missing', message: '활성 전달 수신자 문서를 찾을 수 없습니다.' };
      case 'recipient_counter_malformed':
        return { status: 'conflict', code: 'recipient_counter_malformed', message: '활성 전달 수신자 카운터가 올바르지 않습니다.' };
      case 'delivery_malformed':
        return { status: 'conflict', code: 'delivery_malformed', message: '전달 데이터 상태가 올바르지 않습니다.' };
      default:
        return {
          status: 'server_error',
          code: 'transaction_aborted',
          message: '숨김 처리 중 문제가 발생했습니다.',
          details: error.message,
        };
    }
  }

  return {
    status: 'server_error',
    code: 'transaction_aborted',
    message: '숨김 처리 중 문제가 발생했습니다.',
    details: error,
  };
}

export async function hideContent(params: HideContentParams & {
  repository?: AdminHidingRepository;
}): Promise<HideContentResult> {
  const repository = params.repository ?? createAdminHidingRepository({ db: params.db });

  try {
    if (params.targetType === 'worry') {
      return await repository.hideWorry(params);
    }
    if (params.targetType === 'delivery') {
      return await repository.hideDelivery(params);
    }
    return await repository.hideReply(params);
  } catch (error) {
    return mapError(error);
  }
}
