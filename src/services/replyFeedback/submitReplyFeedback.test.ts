import test from 'node:test';
import assert from 'node:assert/strict';
import { submitReplyFeedback } from './submitReplyFeedback';
import type { ReplyFeedbackTarget } from './types';

const prdReply: ReplyFeedbackTarget = {
  id: 'reply-1',
  senderId: 'human-1',
  source: 'prd_replies',
};

test('PRD feedback uses API path', async () => {
  const calls: string[] = [];
  const result = await submitReplyFeedback({
    reply: prdReply,
    feedbackType: 'helpful',
    comment: ' 고마워요 ',
    apiClient: {
      async submitReplyFeedback(input) {
        calls.push(`${input.replyId}:${input.type}:${input.comment}`);
        return { status: 'saved', feedbackId: input.replyId, helpedCountApplied: true };
      },
    },
  });

  assert.deepEqual(result, { status: 'saved', feedbackId: 'reply-1', helpedCountApplied: true });
  assert.deepEqual(calls, ['reply-1:like: 고마워요 ']);
});

test('PRD dislike feedback maps to API dislike', async () => {
  const calls: string[] = [];
  await submitReplyFeedback({
    reply: prdReply,
    feedbackType: 'not_helpful',
    apiClient: {
      async submitReplyFeedback(input) {
        calls.push(input.type);
        return { status: 'saved', feedbackId: input.replyId, helpedCountApplied: false };
      },
    },
  });

  assert.deepEqual(calls, ['dislike']);
});

test('PRD feedback fails closed when API path is unavailable', async () => {
  await assert.rejects(
    submitReplyFeedback({
      reply: prdReply,
      feedbackType: 'helpful',
    }),
    /reply_feedback_api_unavailable/
  );
});

test('non-PRD feedback source is rejected', async () => {
  await assert.rejects(
    submitReplyFeedback({
      reply: { id: 'reply-1', senderId: 'human-1' },
      feedbackType: 'helpful',
      apiClient: {
        async submitReplyFeedback() {
          throw new Error('should not call api');
        },
      },
    }),
    /reply_feedback_prd_source_required/
  );
});
