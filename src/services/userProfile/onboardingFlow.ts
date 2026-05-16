import type { User } from 'firebase/auth';
import type { CompleteOnboardingInput, CompleteOnboardingResult } from './types';

export type OnboardingFlowDeps = {
  readonly completeOnboarding: (params: {
    readonly user: User;
    readonly profile: CompleteOnboardingInput;
  }) => Promise<CompleteOnboardingResult>;
  readonly createExamples: (params: { readonly user: User }) => Promise<unknown>;
  readonly onComplete: (profile: unknown) => void;
  readonly onError: (message: string) => void;
};

export async function submitAvailableOnboarding(params: {
  readonly user: User | null;
  readonly disabled: boolean;
  readonly profile: CompleteOnboardingInput;
  readonly deps: OnboardingFlowDeps;
}): Promise<'blocked' | 'completed' | 'failed'> {
  if (!params.user || params.disabled) return 'blocked';

  try {
    const result = await params.deps.completeOnboarding({
      user: params.user,
      profile: params.profile,
    });
    if (result.status !== 'completed') {
      params.deps.onError(result.message);
      return 'failed';
    }

    await params.deps.createExamples({ user: params.user });
    params.deps.onComplete(result.profile);
    return 'completed';
  } catch (error) {
    params.deps.onError(error instanceof Error ? error.message : '온보딩 완료 중 문제가 발생했어요.');
    return 'failed';
  }
}
