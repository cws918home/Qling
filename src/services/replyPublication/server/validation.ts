import { CONTENT_MAX_LENGTH, validateContent, type ContentValidationResult } from '../../validation/content';

export type ReplyContentValidationResult = ContentValidationResult;
export const MAX_REPLY_CONTENT_LENGTH = CONTENT_MAX_LENGTH;

export function validateReplyContent(content: unknown): ReplyContentValidationResult {
  return validateContent(content, 'reply');
}
