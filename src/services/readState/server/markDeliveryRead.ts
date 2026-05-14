import type {
  ReadStateRepository,
  ServerMarkDeliveryReadResult,
} from './types';

export async function markDeliveryRead(params: {
  repository: ReadStateRepository;
  recipientUid: string;
  deliveryId: string;
}): Promise<ServerMarkDeliveryReadResult> {
  try {
    return await params.repository.markDeliveryRead({
      recipientUid: params.recipientUid,
      deliveryId: params.deliveryId,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'delivery_missing') {
        return { status: 'not_found', code: 'delivery_missing', message: '전달된 고민을 찾을 수 없습니다.' };
      }
      if (error.message === 'not_delivery_recipient') {
        return { status: 'forbidden', code: 'not_delivery_recipient', message: '이 고민을 읽을 수 없습니다.' };
      }
      if (error.message === 'delivery_hidden') {
        return { status: 'conflict', code: 'delivery_hidden', message: '숨김 처리된 고민입니다.' };
      }
    }

    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: '읽음 상태 저장 중 문제가 발생했습니다.',
      details: error,
    };
  }
}
