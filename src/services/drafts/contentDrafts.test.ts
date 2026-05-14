import test from 'node:test';
import assert from 'node:assert/strict';
import { clearDraft, getDraft, setDraft } from './contentDrafts';

test('keyed drafts do not leak between reply or comment targets', () => {
  const drafts = setDraft(setDraft({}, 'reply-a', 'first'), 'reply-b', 'second');
  assert.equal(getDraft(drafts, 'reply-a'), 'first');
  assert.equal(getDraft(drafts, 'reply-b'), 'second');
});

test('clearing one successful target preserves other failed drafts', () => {
  const drafts = setDraft(setDraft({}, 'delivery-a', 'kept'), 'delivery-b', 'sent');
  assert.deepEqual(clearDraft(drafts, 'delivery-b'), { 'delivery-a': 'kept' });
});
