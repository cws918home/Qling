import type { User } from 'firebase/auth';

export type ClientPublishReplyResult =
  | { status: 'published'; replyId: string }
  | { status: 'rejected'; reason: string; reasonCode?: string; moderationLogId?: string }
  | { status: 'failed'; reason: string; code?: string };

export async function publishReplyViaApi(params: {
  user: User;
  deliveryId: string;
  content: string;
  fetchImpl?: typeof fetch;
}): Promise<ClientPublishReplyResult> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const idToken = await params.user.getIdToken();

  const response = await fetchImpl(`/api/deliveries/${encodeURIComponent(params.deliveryId)}/replies`, {
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
      reason: body?.error?.message ?? '답장 전송에 실패했습니다.',
    };
  }

  if (body?.status === 'published') {
    return { status: 'published', replyId: body.replyId };
  }

  if (body?.status === 'rejected') {
    return {
      status: 'rejected',
      reason: body.userMessage ?? '부적절한 표현이 감지되었습니다.',
      reasonCode: body.reasonCode,
      moderationLogId: body.moderationLogId,
    };
  }

  return {
    status: 'failed',
    reason: '답장 전송 응답을 해석할 수 없습니다.',
  };
}
