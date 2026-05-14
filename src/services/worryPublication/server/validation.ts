import { CONTENT_MAX_LENGTH, validateContent, type ContentValidationResult } from '../../validation/content';

export type WorryContentValidationResult = ContentValidationResult;
export const MAX_WORRY_CONTENT_LENGTH = CONTENT_MAX_LENGTH;

export function validateWorryContent(content: unknown): WorryContentValidationResult {
  return validateContent(content, 'worry');
}
