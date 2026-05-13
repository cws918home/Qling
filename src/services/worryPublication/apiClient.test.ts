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
