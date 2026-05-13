import test from 'node:test';
import assert from 'node:assert/strict';
import {
  markDeliveryReadWithServer,
  markRepliesForWorryReadWithServer,
} from './apiClient';

const user = {
  getIdToken: async () => 'token',
};

test('delivery read client posts authenticated empty body', async () => {
  let request: { url: string; init: RequestInit } | null = null;
  const result = await markDeliveryReadWithServer({
    user: user as never,
    deliveryId: 'delivery/1',
    fetchImpl: async (url, init) => {
      request = { url: String(url), init: init ?? {} };
      return new Response(JSON.stringify({ status: 'read', deliveryId: 'delivery/1', readAt: 'ts' }), { status: 200 });
    },
  });

  assert.deepEqual(result, { status: 'read', deliveryId: 'delivery/1', readAt: 'ts', idempotent: undefined });
  assert.equal(request?.url, '/api/deliveries/delivery%2F1/read');
  assert.equal((request?.init.headers as Record<string, string>).Authorization, 'Bearer token');
  assert.equal(request?.init.body, '{}');
});

test('replies read client posts optional subset and maps failures', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const ok = await markRepliesForWorryReadWithServer({
    user: user as never,
    worryId: 'w1',
    replyIds: ['r1'],
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      return new Response(JSON.stringify({ status: 'read', worryId: 'w1', markedCount: 1 }), { status: 200 });
    },
  });
  const failed = await markRepliesForWorryReadWithServer({
    user: user as never,
    worryId: 'w1',
    fetchImpl: async () => new Response(JSON.stringify({ error: { code: 'not_worry_author', message: 'no' } }), { status: 403 }),
  });

  assert.deepEqual(ok, { status: 'read', worryId: 'w1', markedCount: 1 });
  assert.equal(calls[0].url, '/api/worries/w1/replies/read');
  assert.equal(calls[0].body, JSON.stringify({ replyIds: ['r1'] }));
  assert.deepEqual(failed, { status: 'failed', code: 'not_worry_author', reason: 'no' });
});
