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

test('reply API client maps malformed responses and preserves created reply id', async () => {
  const published = await publishReplyViaApi({
    user: { getIdToken: async () => 'token' } as never,
    deliveryId: 'delivery1',
    content: 'reply',
    fetchImpl: async () => new Response(JSON.stringify({
      status: 'published',
      replyId: 'reply-created',
    }), { status: 200 }),
  });
  const malformed = await publishReplyViaApi({
    user: { getIdToken: async () => 'token' } as never,
    deliveryId: 'delivery1',
    content: 'reply',
    fetchImpl: async () => new Response(JSON.stringify({ nope: true }), { status: 200 }),
  });

  assert.deepEqual(published, { status: 'published', replyId: 'reply-created' });
  assert.deepEqual(malformed, {
    status: 'failed',
    reason: '답장 전송 응답을 해석할 수 없습니다.',
  });
});

test('reply API client leaves thrown network errors for the container retry path', async () => {
  await assert.rejects(() => publishReplyViaApi({
    user: { getIdToken: async () => 'token' } as never,
    deliveryId: 'delivery1',
    content: 'reply',
    fetchImpl: async () => { throw new Error('network down'); },
  }), /network down/);
});
