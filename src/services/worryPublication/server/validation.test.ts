import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorryContent } from './validation';

test('trims content before saving', () => {
  assert.deepEqual(validateWorryContent('  hello  '), {
    status: 'valid',
    content: 'hello',
  });
});

test('empty content returns validation error', () => {
  const result = validateWorryContent('   ');
  assert.equal(result.status, 'validation_error');
  if (result.status !== 'validation_error') return;
  assert.equal(result.code, 'empty');
});

test('more than 1000 chars returns validation error', () => {
  const result = validateWorryContent('a'.repeat(1001));
  assert.equal(result.status, 'validation_error');
  if (result.status !== 'validation_error') return;
  assert.equal(result.code, 'too_long');
});

test('non-string content returns invalid content type', () => {
  const result = validateWorryContent(null);
  assert.equal(result.status, 'validation_error');
  if (result.status !== 'validation_error') return;
  assert.equal(result.code, 'invalid_content_type');
});
