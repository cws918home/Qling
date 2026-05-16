import type { WorryCategory } from '@midnight-radio/domain';
import type { GenderValue } from './profileValidation';

export type NicknameReservationStatus =
  | 'available'
  | 'duplicate'
  | 'invalid'
  | 'conflict'
  | 'server_error';

export type NicknameReservationResult =
  | {
      readonly status: 'available';
      readonly uid: string;
      readonly nickname: string;
      readonly normalizedNickname: string;
    }
  | {
      readonly status: Exclude<NicknameReservationStatus, 'available'>;
      readonly code: string;
      readonly message: string;
    };

export type CompleteOnboardingInput = {
  readonly nickname: string;
  readonly gender: GenderValue;
  readonly age: number;
  readonly interests: readonly WorryCategory[];
};

export type UserProfileWriteModel = CompleteOnboardingInput & {
  readonly uid: string;
  readonly normalizedNickname: string;
};

export type CompleteOnboardingResult =
  | {
      readonly status: 'completed';
      readonly profile: UserProfileWriteModel;
    }
  | {
      readonly status: 'invalid' | 'reservation_missing' | 'reservation_conflict' | 'server_error';
      readonly code: string;
      readonly message: string;
    };

export type NicknameReservationRepository = {
  readonly reserveNickname: (params: {
    readonly uid: string;
    readonly nickname: string;
    readonly normalizedNickname: string;
  }) => Promise<NicknameReservationResult>;
  readonly completeOnboarding: (params: UserProfileWriteModel) => Promise<CompleteOnboardingResult>;
};
