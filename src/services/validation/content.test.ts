import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_MAX_LENGTH, validateContent, validateDraftContent } from './content';

test('shared validator trims accepted content', () => {
  assert.deepEqual(validateContent('  힘내  ', 'reply'), {
    status: 'valid',
    content: '힘내',
  });
});

test('shared validator rejects empty and whitespace-only content', () => {
  assert.deepEqual(validateContent('   ', 'worry'), {
    status: 'validation_error',
    code: 'empty',
    message: '고민 내용을 입력해주세요.',
  });
});

test('shared validator rejects content over 1000 trimmed characters', () => {
  const result = validateContent(` ${'a'.repeat(CONTENT_MAX_LENGTH + 1)} `, 'feedback_comment');
  assert.equal(result.status, 'validation_error');
  if (result.status !== 'validation_error') return;
  assert.equal(result.code, 'too_long');
});

test('shared validator rejects non-string server input', () => {
  const result = validateContent(null, 'reply');
  assert.equal(result.status, 'validation_error');
  if (result.status !== 'validation_error') return;
  assert.equal(result.code, 'invalid_content_type');
});

test('draft validator uses the same short-content policy', () => {
  assert.deepEqual(validateDraftContent('힘내', 'worry'), {
    status: 'valid',
    content: '힘내',
  });
});
