import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('App reply submission uses server API and does not import legacy human reply writer', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(source, /publishReplyViaApi/);
  assert.doesNotMatch(source, /publishReplyWithProductionAdapters/);
  assert.doesNotMatch(source, /publishPublisherCommentWithProductionAdapters/);
  assert.match(source, /이전 형식의 고민에는 새 답장을 보낼 수 없습니다/);
});

test('legacy client reply publication adapters are not exposed at runtime', () => {
  const index = fs.readFileSync('src/services/replyPublication/index.ts', 'utf8');

  assert.doesNotMatch(index, /createReplyLetter/);
  assert.doesNotMatch(index, /updatePublisherComment/);
  assert.doesNotMatch(index, /publishReplyWithProductionAdapters/);
  assert.doesNotMatch(index, /publishPublisherCommentWithProductionAdapters/);
});
