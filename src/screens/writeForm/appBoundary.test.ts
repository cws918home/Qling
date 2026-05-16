import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('src/App.tsx', 'utf8');

test('App.tsx no longer imports write publication API clients', () => {
  assert.doesNotMatch(appSource, /services\/worryPublication\/apiClient/);
  assert.doesNotMatch(appSource, /services\/replyPublication\/apiClient/);
  assert.doesNotMatch(appSource, /publishWorryViaApi|publishReplyViaApi/);
});

test('App.tsx delegates write-form routes to containers instead of inline publication handlers', () => {
  assert.match(appSource, /<WriteWorryContainer/);
  assert.match(appSource, /<WriteReplyContainer/);
  assert.doesNotMatch(appSource, /const publishWorry = async/);
  assert.doesNotMatch(appSource, /const sendReply = async/);
  assert.doesNotMatch(appSource, /function WriteForm\(/);
  assert.doesNotMatch(appSource, /worryDraft|replyDrafts/);
});
