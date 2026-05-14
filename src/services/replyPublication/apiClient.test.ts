import test from 'node:test';
import assert from 'node:assert/strict';
import { publishReplyViaApi } from './apiClient';

test('reply API client posts content to deterministic delivery reply endpoint with token', async () => {
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  const result = await publishReplyViaApi({
    user: { getIdToken: async () => 'token' } as never,
    deliveryId: 'delivery/one',
    content: 'reply',
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(JSON.stringify({ status: 'published', replyId: 'delivery/one' }), { status: 200 });
    },
  });

  assert.deepEqual(result, { status: 'published', replyId: 'delivery/one' });
  assert.equal(capturedUrl, '/api/deliveries/delivery%2Fone/replies');
  assert.equal(capturedInit?.method, 'POST');
  assert.equal((capturedInit?.headers as Record<string, string>).Authorization, 'Bearer token');
  assert.equal(capturedInit?.body, JSON.stringify({ content: 'reply' }));
});

test('reply API client maps rejection and error responses', async () => {
  const rejected = await publishReplyViaApi({
    user: { getIdToken: async () => 'token' } as never,
    deliveryId: 'delivery1',
    content: 'bad',
    fetchImpl: async () => new Response(JSON.stringify({
      status: 'rejected',
      reasonCode: 'spam_promotion',
      userMessage: 'blocked',
      helpMessage: 'help',
      moderationLogId: 'mod1',
    }), { status: 200 }),
  });
  const failed = await publishReplyViaApi({
    user: { getIdToken: async () => 'token' } as never,
    deliveryId: 'delivery1',
    content: 'bad',
    fetchImpl: async () => new Response(JSON.stringify({
      error: { code: 'duplicate_reply', message: 'already' },
    }), { status: 409 }),
  });

  assert.deepEqual(rejected, {
    status: 'rejected',
    reason: 'blocked',
    reasonCode: 'spam_promotion',
    userMessage: 'blocked',
    helpMessage: 'help',
    moderationLogId: 'mod1',
  });
  assert.deepEqual(failed, {
    status: 'failed',
    code: 'duplicate_reply',
    reason: 'already',
  });
});
