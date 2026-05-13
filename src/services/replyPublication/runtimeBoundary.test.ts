import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('App reply submission uses server API and does not import legacy human reply writer', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(source, /publishReplyViaApi/);
  assert.doesNotMatch(source, /publishReplyWithProductionAdapters/);
  assert.match(source, /이전 형식의 사연에는 새 답장을 보낼 수 없습니다/);
});
