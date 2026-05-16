import test from 'node:test';
import assert from 'node:assert/strict';
import { WORRY_CATEGORIES, WORRY_CATEGORY_SET } from './index';

test('domain categories preserve 워라밸 as target display and storage value', () => {
  assert.ok(WORRY_CATEGORIES.includes('워라밸'));
  assert.ok(WORRY_CATEGORY_SET.has('워라밸'));
  assert.equal(WORRY_CATEGORIES.includes('워라벨' as never), false);
});
