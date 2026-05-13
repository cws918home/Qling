export type ReplyContentValidationResult =
  | { status: 'valid'; content: string }
  | { status: 'validation_error'; code: 'empty' | 'too_long' | 'invalid_content_type'; message: string };

export const MAX_REPLY_CONTENT_LENGTH = 1000;

export function validateReplyContent(content: unknown): ReplyContentValidationResult {
  if (typeof content !== 'string') {
    return {
      status: 'validation_error',
      code: 'invalid_content_type',
      message: '답장 내용은 문자열이어야 합니다.',
    };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return {
      status: 'validation_error',
      code: 'empty',
      message: '답장 내용을 입력해주세요.',
    };
  }

  if (trimmed.length > MAX_REPLY_CONTENT_LENGTH) {
    return {
      status: 'validation_error',
      code: 'too_long',
      message: '답장 내용은 1000자 이내로 입력해주세요.',
    };
  }

  return { status: 'valid', content: trimmed };
}
