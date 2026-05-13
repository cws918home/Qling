import type { User } from 'firebase/auth';

export type ClientPublishWorryResult =
  | { status: 'published'; worryId: string; deliveryIds: string[]; moderationLogId: string; warnings: string[] }
  | { status: 'rejected'; reason: string }
  | { status: 'failed'; reason: string; code?: string };

export async function publishWorryViaApi(params: {
  user: User;
  content: string;
  fetchImpl?: typeof fetch;
}): Promise<ClientPublishWorryResult> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const idToken = await params.user.getIdToken();

  const response = await fetchImpl('/api/worries/publish', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: params.content }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      status: 'failed',
      code: body?.error?.code,
      reason: body?.error?.message ?? '고민 전송에 실패했습니다.',
    };
  }

  if (body?.status === 'published') {
    return {
      status: 'published',
      worryId: body.worryId,
      deliveryIds: Array.isArray(body.deliveryIds) ? body.deliveryIds : [],
      moderationLogId: body.moderationLogId,
      warnings: [],
    };
  }

  if (body?.status === 'rejected') {
    return {
      status: 'rejected',
      reason: body.userMessage ?? '부적절한 표현이 감지되었습니다.',
    };
  }

  return {
    status: 'failed',
    reason: '고민 전송 응답을 해석할 수 없습니다.',
  };
}
