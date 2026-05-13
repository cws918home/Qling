import type { User } from 'firebase/auth';

export type ClientMarkDeliveryReadResult =
  | { status: 'read'; deliveryId: string; readAt: unknown; idempotent?: true }
  | { status: 'failed'; reason: string; code?: string };

export type ClientMarkRepliesReadResult =
  | { status: 'read'; worryId: string; markedCount: number }
  | { status: 'failed'; reason: string; code?: string };

export async function markDeliveryReadWithServer(params: {
  user: User;
  deliveryId: string;
  fetchImpl?: typeof fetch;
}): Promise<ClientMarkDeliveryReadResult> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const idToken = await params.user.getIdToken();

  const response = await fetchImpl(`/api/deliveries/${encodeURIComponent(params.deliveryId)}/read`, {
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
      reason: body?.error?.message ?? '읽음 상태 저장에 실패했습니다.',
    };
  }

  if (body?.status === 'read') {
    return {
      status: 'read',
      deliveryId: body.deliveryId,
      readAt: body.readAt,
      idempotent: body.idempotent === true ? true : undefined,
    };
  }

  return { status: 'failed', reason: '읽음 상태 응답을 해석할 수 없습니다.' };
}

export async function markRepliesForWorryReadWithServer(params: {
  user: User;
  worryId: string;
  replyIds?: string[];
  fetchImpl?: typeof fetch;
}): Promise<ClientMarkRepliesReadResult> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const idToken = await params.user.getIdToken();
  const body = params.replyIds ? { replyIds: params.replyIds } : {};

  const response = await fetchImpl(`/api/worries/${encodeURIComponent(params.worryId)}/replies/read`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      status: 'failed',
      code: responseBody?.error?.code,
      reason: responseBody?.error?.message ?? '답장 읽음 상태 저장에 실패했습니다.',
    };
  }

  if (responseBody?.status === 'read') {
    return {
      status: 'read',
      worryId: responseBody.worryId,
      markedCount: typeof responseBody.markedCount === 'number' ? responseBody.markedCount : 0,
    };
  }

  return { status: 'failed', reason: '답장 읽음 상태 응답을 해석할 수 없습니다.' };
}
