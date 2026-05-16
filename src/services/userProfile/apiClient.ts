import type { User } from 'firebase/auth';
import type { CompleteOnboardingInput, CompleteOnboardingResult, NicknameReservationResult } from './types';

async function authHeaders(user: User) {
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    'Content-Type': 'application/json',
  };
}

async function parseJson(response: Response) {
  return response.json().catch(() => null);
}

export async function reserveNicknameViaApi(params: {
  readonly user: User;
  readonly nickname: string;
}): Promise<NicknameReservationResult> {
  const response = await fetch('/api/users/me/nickname-reservation', {
    method: 'POST',
    headers: await authHeaders(params.user),
    body: JSON.stringify({ nickname: params.nickname }),
  });
  const body = await parseJson(response);
  if (response.ok) return body as NicknameReservationResult;
  return {
    status: response.status === 409 ? 'duplicate' : 'server_error',
    code: body?.error?.code ?? 'network_failed',
    message: body?.error?.message ?? '닉네임 확인 중 문제가 발생했어요.',
  };
}

export async function completeOnboardingViaApi(params: {
  readonly user: User;
  readonly profile: CompleteOnboardingInput;
}): Promise<CompleteOnboardingResult> {
  const response = await fetch('/api/users/me/onboarding-profile', {
    method: 'POST',
    headers: await authHeaders(params.user),
    body: JSON.stringify(params.profile),
  });
  const body = await parseJson(response);
  if (response.ok) return body as CompleteOnboardingResult;
  return {
    status: 'server_error',
    code: body?.error?.code ?? 'profile_save_failed',
    message: body?.error?.message ?? '프로필 저장 중 문제가 발생했어요.',
  };
}

export async function createExampleWorriesViaApi(params: {
  readonly user: User;
}): Promise<unknown> {
  const response = await fetch('/api/users/me/example-worries', {
    method: 'POST',
    headers: await authHeaders(params.user),
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const body = await parseJson(response);
    throw new Error(body?.error?.message ?? 'Example worry creation failed.');
  }
  return parseJson(response);
}
