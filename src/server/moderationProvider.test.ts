import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchFromOpenAI } from './moderationProvider';

test('OpenAI moderation provider uses OpenAI env key endpoint header and model', async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'test-openai-key';

  let request: { url: string; init: RequestInit } | null = null;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init: init ?? {} };
    return {
      ok: true,
      async json() {
        return { choices: [{ message: { content: '{"status":"approved"}' } }] };
      },
    } as Response;
  }) as typeof fetch;

  try {
    const result = await fetchFromOpenAI('system', 'content');

    assert.deepEqual(result, { status: 'approved' });
    assert.equal(request?.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal((request?.init.headers as Record<string, string>).Authorization, 'Bearer test-openai-key');
    assert.equal(JSON.parse(String(request?.init.body)).model, 'gpt-5.4-mini');
  } finally {
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
    globalThis.fetch = originalFetch;
  }
});

test('OpenAI moderation provider fails when OPENAI_API_KEY is missing', async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    await assert.rejects(
      fetchFromOpenAI('system', 'content'),
      /OPENAI_API_KEY is not defined/
    );
  } finally {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});
