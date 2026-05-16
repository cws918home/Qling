import type { WorryCategory } from '@midnight-radio/domain';
import {
  isValidGender,
  normalizeInterests,
  validateAge,
  validateNickname,
  type GenderValue,
} from './profileValidation';
import type {
  CompleteOnboardingResult,
  NicknameReservationRepository,
  NicknameReservationResult,
} from './types';

export type OnboardingDraft = {
  readonly nickname: string;
  readonly gender: string;
  readonly age: string;
  readonly interests: readonly string[];
};

export type OnboardingDuplicateUiState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'duplicate'
  | 'invalid'
  | 'network-failed'
  | 'retry';

export function validateOnboardingDraft(draft: OnboardingDraft) {
  const nickname = validateNickname(draft.nickname);
  const age = validateAge(draft.age);
  const genderValid = isValidGender(draft.gender);
  const interests = normalizeInterests(draft.interests);

  return {
    valid: nickname.valid && age.valid && genderValid && interests.length > 0,
    nickname,
    age,
    gender: genderValid
      ? { valid: true as const, gender: draft.gender as GenderValue }
      : { valid: false as const, message: '성별을 선택해주세요.' },
    interests: interests.length > 0
      ? { valid: true as const, interests }
      : { valid: false as const, message: '관심 분야를 1개 이상 선택해주세요.' },
  };
}

export function canSubmitOnboarding(params: {
  readonly draft: OnboardingDraft;
  readonly duplicateState: OnboardingDuplicateUiState;
}): boolean {
  return params.duplicateState === 'available' && validateOnboardingDraft(params.draft).valid;
}

export function mapReservationResultToDuplicateState(
  result: NicknameReservationResult
): OnboardingDuplicateUiState {
  if (result.status === 'available') return 'available';
  if (result.status === 'duplicate') return 'duplicate';
  if (result.status === 'invalid') return 'invalid';
  if (result.status === 'conflict') return 'retry';
  return 'network-failed';
}

export async function reserveNickname(params: {
  readonly uid: string;
  readonly nickname: string;
  readonly repository: NicknameReservationRepository;
}): Promise<NicknameReservationResult> {
  const validation = validateNickname(params.nickname);
  if (validation.valid === false) {
    return {
      status: 'invalid',
      code: validation.error,
      message: validation.message,
    };
  }

  return params.repository.reserveNickname({
    uid: params.uid,
    nickname: validation.nickname,
    normalizedNickname: validation.normalizedNickname,
  });
}

export async function completeOnboarding(params: {
  readonly uid: string;
  readonly draft: OnboardingDraft;
  readonly repository: NicknameReservationRepository;
}): Promise<CompleteOnboardingResult> {
  const validation = validateOnboardingDraft(params.draft);
  if (!validation.valid || !validation.nickname.valid || !validation.age.valid || !validation.gender.valid || !validation.interests.valid) {
    return {
      status: 'invalid',
      code: 'invalid_profile',
      message: '온보딩 필수 입력값을 확인해주세요.',
    };
  }

  return params.repository.completeOnboarding({
    uid: params.uid,
    nickname: validation.nickname.nickname,
    normalizedNickname: validation.nickname.normalizedNickname,
    gender: validation.gender.gender,
    age: validation.age.age,
    interests: validation.interests.interests as WorryCategory[],
  });
}
