export const CONTENT_MAX_LENGTH = 1000;

export type ContentSurface = 'worry' | 'reply' | 'feedback_comment';
export type ContentValidationCode = 'empty' | 'too_long' | 'invalid_content_type';

export type ContentValidationResult =
  | { status: 'valid'; content: string }
  | { status: 'validation_error'; code: ContentValidationCode; message: string };

const SURFACE_LABELS: Record<ContentSurface, string> = {
  worry: '고민 내용',
  reply: '답장 내용',
  feedback_comment: '코멘트',
};

export function validateContent(content: unknown, surface: ContentSurface): ContentValidationResult {
  const label = SURFACE_LABELS[surface];

  if (typeof content !== 'string') {
    return {
      status: 'validation_error',
      code: 'invalid_content_type',
      message: `${label}은 문자열이어야 합니다.`,
    };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return {
      status: 'validation_error',
      code: 'empty',
      message: surface === 'feedback_comment'
        ? '코멘트를 입력해 주세요.'
        : `${label}을 입력해주세요.`,
    };
  }

  if (trimmed.length > CONTENT_MAX_LENGTH) {
    return {
      status: 'validation_error',
      code: 'too_long',
      message: `${label}은 1000자 이내로 입력해주세요.`,
    };
  }

  return { status: 'valid', content: trimmed };
}

export function validateDraftContent(content: unknown, surface: ContentSurface): ContentValidationResult {
  return validateContent(content, surface);
}
