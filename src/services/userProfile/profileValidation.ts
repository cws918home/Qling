import { WORRY_CATEGORY_SET, type WorryCategory } from '@midnight-radio/domain';

export const NICKNAME_VALIDATION_MESSAGES = {
  required: '닉네임을 입력해주세요.',
  invalidCharacters: '닉네임은 한글, 영문, 숫자만 사용할 수 있어요.',
  tooShort: '닉네임은 2자 이상이어야 해요.',
  tooLong: '닉네임은 12자 이하여야 해요.',
} as const;

export const AGE_VALIDATION_MESSAGES = {
  required: '나이를 입력해주세요.',
  numeric: '나이는 숫자로 입력해주세요.',
  range: '나이는 만 14세부터 99세까지 입력할 수 있어요.',
} as const;

export type NicknameValidationError = keyof typeof NICKNAME_VALIDATION_MESSAGES;
export type AgeValidationError = keyof typeof AGE_VALIDATION_MESSAGES;
export type GenderValue = 'male' | 'female';

export type NicknameValidationResult =
  | {
      readonly valid: true;
      readonly nickname: string;
      readonly normalizedNickname: string;
    }
  | {
      readonly valid: false;
      readonly error: NicknameValidationError;
      readonly message: string;
    };

export type AgeValidationResult =
  | { readonly valid: true; readonly age: number }
  | { readonly valid: false; readonly error: AgeValidationError; readonly message: string };

const NICKNAME_PATTERN = /^[\p{Script=Hangul}A-Za-z0-9]+$/u;

export function normalizeNicknameInput(input: string): string {
  return input.trim().normalize('NFC');
}

export function normalizedNicknameKey(input: string): string {
  return normalizeNicknameInput(input).toLocaleLowerCase('und');
}

export function validateNickname(input: string): NicknameValidationResult {
  const nickname = normalizeNicknameInput(input);
  if (nickname.length === 0) {
    return invalidNickname('required');
  }
  if (nickname.length < 2) {
    return invalidNickname('tooShort');
  }
  if (nickname.length > 12) {
    return invalidNickname('tooLong');
  }
  if (!NICKNAME_PATTERN.test(nickname)) {
    return invalidNickname('invalidCharacters');
  }
  return {
    valid: true,
    nickname,
    normalizedNickname: normalizedNicknameKey(nickname),
  };
}

function invalidNickname(error: NicknameValidationError): NicknameValidationResult {
  return {
    valid: false,
    error,
    message: NICKNAME_VALIDATION_MESSAGES[error],
  };
}

export function validateAge(input: string): AgeValidationResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return invalidAge('required');
  }
  if (!/^\d+$/.test(trimmed)) {
    return invalidAge('numeric');
  }
  const age = Number(trimmed);
  if (age < 14 || age > 99) {
    return invalidAge('range');
  }
  return { valid: true, age };
}

function invalidAge(error: AgeValidationError): AgeValidationResult {
  return {
    valid: false,
    error,
    message: AGE_VALIDATION_MESSAGES[error],
  };
}

export function isValidGender(value: string): value is GenderValue {
  return value === 'male' || value === 'female';
}

export function normalizeInterests(values: readonly string[]): WorryCategory[] {
  const seen = new Set<string>();
  const normalized: WorryCategory[] = [];

  for (const value of values) {
    if (!WORRY_CATEGORY_SET.has(value) || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value as WorryCategory);
  }

  return normalized;
}
