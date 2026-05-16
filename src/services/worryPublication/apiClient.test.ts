import test from 'node:test';
import assert from 'node:assert/strict';
import { publishWorryViaApi } from './apiClient';

test('wrapper sends Authorization bearer token and only content body', async () => {
  let request: { url: string; init?: RequestInit } | null = null;
  const result = await publishWorryViaApi({
    user: { getIdToken: async () => 'token' } as never,
    content: 'hello',
    fetchImpl: async (url, init) => {
      request = { url: String(url), init };
      return new Response(JSON.stringify({
        status: 'published',
        worryId: 'worry1',
        deliveryIds: ['d1'],
        moderationLogId: 'm1',
      }), { status: 200 });
    },
  });

  assert.equal(result.status, 'published');
  assert.equal(request?.url, '/api/worries/publish');
  assert.equal((request?.init?.headers as Record<string, string>).Authorization, 'Bearer token');
  assert.deepEqual(JSON.parse(String(request?.init?.body)), { content: 'hello' });
});

test('worry API client preserves structured rejection fields', async () => {
  const result = await publishWorryViaApi({
    user: { getIdToken: async () => 'token' } as never,
    content: 'bad',
    fetchImpl: async () => new Response(JSON.stringify({
      status: 'rejected',
      reasonCode: 'crime_violence_victim',
      userMessage: 'blocked',
      helpMessage: 'help',
      moderationLogId: 'mod1',
    }), { status: 200 }),
  });

  assert.deepEqual(result, {
    status: 'rejected',
    reason: 'blocked',
    reasonCode: 'crime_violence_victim',
    userMessage: 'blocked',
    helpMessage: 'help',
    moderationLogId: 'mod1',
  });
});

test('worry API client preserves failed responses and created id route inputs', async () => {
  const published = await publishWorryViaApi({
    user: { getIdToken: async () => 'token' } as never,
    content: 'ok',
    fetchImpl: async () => new Response(JSON.stringify({
      status: 'published',
      worryId: 'created-worry',
      deliveryIds: [],
      moderationLogId: 'mod1',
    }), { status: 200 }),
  });
  const failed = await publishWorryViaApi({
    user: { getIdToken: async () => 'token' } as never,
    content: 'bad',
    fetchImpl: async () => new Response(JSON.stringify({
      error: { code: 'provider_error', message: 'moderation unavailable' },
    }), { status: 503 }),
  });
  const malformed = await publishWorryViaApi({
    user: { getIdToken: async () => 'token' } as never,
    content: 'bad',
    fetchImpl: async () => new Response(JSON.stringify({ nope: true }), { status: 200 }),
  });

  assert.equal(published.status, 'published');
  assert.equal(published.status === 'published' ? published.worryId : '', 'created-worry');
  assert.deepEqual(failed, {
    status: 'failed',
    code: 'provider_error',
    reason: 'moderation unavailable',
  });
  assert.deepEqual(malformed, {
    status: 'failed',
    reason: '고민 전송 응답을 해석할 수 없습니다.',
  });
});

test('worry API client leaves thrown network errors for the container retry path', async () => {
  await assert.rejects(() => publishWorryViaApi({
    user: { getIdToken: async () => 'token' } as never,
    content: 'ok',
    fetchImpl: async () => { throw new Error('network down'); },
  }), /network down/);
});
