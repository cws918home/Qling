import test from 'node:test';
import assert from 'node:assert/strict';
import { moderateReplyForPublication } from './moderation';

test('reply moderation rejection uses canonical copy and high-risk help', async () => {
  const result = await moderateReplyForPublication({
    content: 'reply',
    provider: async () => ({ status: 'rejected', reason: 'violence danger' }),
  });

  assert.equal(result.status, 'rejected');
  if (result.status !== 'rejected') return;
  assert.equal(result.reasonCode, 'crime_violence_victim');
  assert.equal(result.userMessage, '범죄나 폭력 피해와 관련된 위험 표현이 포함되어 전송할 수 없습니다.');
  assert.equal(result.helpMessage?.length > 0, true);
});
