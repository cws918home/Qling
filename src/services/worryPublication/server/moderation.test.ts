import test from 'node:test';
import assert from 'node:assert/strict';
import {
  moderateWorryForPublication,
  normalizeWorryModerationForPublication,
} from './moderation';

test('approved moderation preserves raw, valid, invalid, and matching categories', () => {
  const result = normalizeWorryModerationForPublication({
    status: 'approved',
    categories: ['취업', '없는분류', ' 취업 ', '잡담'],
  });

  assert.equal(result.status, 'approved');
  if (result.status !== 'approved') return;
  assert.deepEqual(result.rawCategories, ['취업', '없는분류', '잡담']);
  assert.deepEqual(result.validCategories, ['취업', '잡담']);
  assert.deepEqual(result.invalidCategories, ['없는분류']);
  assert.deepEqual(result.matchingCategories, ['취업', '잡담']);
});

test('approved moderation with no valid categories falls back to 잡담 matching', () => {
  const result = normalizeWorryModerationForPublication({
    status: 'approved',
    categories: ['없는분류'],
  });

  assert.equal(result.status, 'approved');
  if (result.status !== 'approved') return;
  assert.deepEqual(result.rawCategories, ['없는분류']);
  assert.deepEqual(result.validCategories, []);
  assert.deepEqual(result.invalidCategories, ['없는분류']);
  assert.deepEqual(result.matchingCategories, ['잡담']);
});

test('rejected moderation maps reason code and message', () => {
  const result = normalizeWorryModerationForPublication({
    status: 'rejected',
    reason: '개인정보가 포함되어 있습니다.',
  });

  assert.equal(result.status, 'rejected');
  if (result.status !== 'rejected') return;
  assert.equal(result.reasonCode, 'personal_info');
  assert.equal(result.userMessage, '개인정보가 포함되어 있습니다.');
});

test('invalid provider output retries once', async () => {
  const calls: Array<boolean | undefined> = [];
  const result = await moderateWorryForPublication({
    content: 'content',
    provider: async (_content, strictRetry) => {
      calls.push(strictRetry);
      return strictRetry
        ? { status: 'approved', categories: ['잡담'] }
        : { nope: true };
    },
  });

  assert.equal(result.status, 'approved');
  assert.deepEqual(calls, [undefined, true]);
});

test('invalid provider output after retry returns provider invalid', async () => {
  const result = await moderateWorryForPublication({
    content: 'content',
    provider: async () => ({ nope: true }),
  });

  assert.equal(result.status, 'provider_invalid');
});

test('provider throw returns provider error', async () => {
  const result = await moderateWorryForPublication({
    content: 'content',
    provider: async () => {
      throw new Error('down');
    },
  });

  assert.equal(result.status, 'provider_error');
});
