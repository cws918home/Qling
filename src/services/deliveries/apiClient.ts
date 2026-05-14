import type { User } from 'firebase/auth';

export type ClientPassDeliveryResult =
  | {
      status: 'passed';
      deliveryId: string;
      replacementDeliveryId?: string;
      replacementStatus: 'created' | 'shortfall' | 'not_applicable';
    }
  | { status: 'failed'; reason: string; code?: string };

export async function passDeliveryViaApi(params: {
  user: User;
  deliveryId: string;
  fetchImpl?: typeof fetch;
}): Promise<ClientPassDeliveryResult> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const idToken = await params.user.getIdToken();

  const response = await fetchImpl(`/api/deliveries/${encodeURIComponent(params.deliveryId)}/pass`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      status: 'failed',
      code: body?.error?.code,
      reason: body?.error?.message ?? '패스 처리에 실패했습니다.',
    };
  }

  if (
    body?.status === 'passed'
    && typeof body.deliveryId === 'string'
    && ['created', 'shortfall', 'not_applicable'].includes(body.replacementStatus)
  ) {
    return {
      status: 'passed',
      deliveryId: body.deliveryId,
      replacementDeliveryId: typeof body.replacementDeliveryId === 'string' ? body.replacementDeliveryId : undefined,
      replacementStatus: body.replacementStatus,
    };
  }

  return {
    status: 'failed',
    reason: '패스 응답을 해석할 수 없습니다.',
  };
}
