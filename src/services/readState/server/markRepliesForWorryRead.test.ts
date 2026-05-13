import test from 'node:test';
import assert from 'node:assert/strict';
import { markRepliesForWorryRead } from './markRepliesForWorryRead';
import type { ReadStateRepository } from './types';

function repository(captured: Array<unknown>): ReadStateRepository {
  return {
    markDeliveryRead: async () => {
      throw new Error('unused');
    },
    markRepliesForWorryRead: async params => {
      captured.push(params);
      return { status: 'read', worryId: params.worryId, markedCount: 0 };
    },
  };
}

test('reply read use case accepts no body empty body and valid replyIds', async () => {
  const captured: Array<unknown> = [];
  const repo = repository(captured);

  await markRepliesForWorryRead({ repository: repo, authorUid: 'author', worryId: 'w1', body: undefined });
  await markRepliesForWorryRead({ repository: repo, authorUid: 'author', worryId: 'w1', body: {} });
  await markRepliesForWorryRead({ repository: repo, authorUid: 'author', worryId: 'w1', body: { replyIds: ['r1'] } });

  assert.deepEqual(captured, [
    { authorUid: 'author', worryId: 'w1', replyIds: undefined },
    { authorUid: 'author', worryId: 'w1', replyIds: undefined },
    { authorUid: 'author', worryId: 'w1', replyIds: ['r1'] },
  ]);
});

test('reply read use case rejects malformed replyIds before repository writes', async () => {
  const captured: Array<unknown> = [];
  const result = await markRepliesForWorryRead({
    repository: repository(captured),
    authorUid: 'author',
    worryId: 'w1',
    body: { replyIds: ['r1', 2] },
  });

  assert.deepEqual(result, {
    status: 'validation_error',
    code: 'invalid_reply_ids',
    message: 'replyIds는 문자열 배열이어야 합니다.',
  });
  assert.deepEqual(captured, []);
});
