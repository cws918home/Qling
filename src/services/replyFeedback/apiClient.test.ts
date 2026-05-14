import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplyFeedbackApiClient } from './apiClient';

test('feedback API client preserves structured rejection fields', async () => {
  const client = createReplyFeedbackApiClient({
    getIdToken: async () => 'token',
    fetchImpl: async () => new Response(JSON.stringify({
      status: 'rejected',
      code: 'comment_rejected',
      message: 'canonical',
      reasonCode: 'self_harm_suicide',
      userMessage: 'canonical',
      helpMessage: 'help',
      moderationLogId: 'mod1',
    }), { status: 200 }) as never,
  });

  const result = await client.submitReplyFeedback({
    replyId: 'reply1',
    type: 'like',
    comment: 'comment',
  });

  assert.deepEqual(result, {
    status: 'rejected',
    reason: 'canonical',
    reasonCode: 'self_harm_suicide',
    userMessage: 'canonical',
    helpMessage: 'help',
    moderationLogId: 'mod1',
  });
});
