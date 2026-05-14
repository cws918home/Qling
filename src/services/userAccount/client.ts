import type { User } from 'firebase/auth';

export type DeleteMyAccountClientResult =
  | { status: 'deleted' }
  | { status: 'failed'; reason: string; code?: string };

export async function deleteMyAccountViaApi(params: {
  user: User;
  fetchImpl?: typeof fetch;
}): Promise<DeleteMyAccountClientResult> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const idToken = await params.user.getIdToken();

  const response = await fetchImpl('/api/users/me/delete', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirm: true }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      status: 'failed',
      code: body?.error?.code,
      reason: body?.error?.message ?? '계정 삭제에 실패했습니다.',
    };
  }

  if (body?.status === 'deleted') {
    return { status: 'deleted' };
  }

  return {
    status: 'failed',
    reason: '계정 삭제 응답을 해석할 수 없습니다.',
  };
}
