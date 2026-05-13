import test from 'node:test';
import assert from 'node:assert/strict';
import { submitReplyFeedback } from './submitReplyFeedback';
import type {
  ReplyFeedback,
  ReplyFeedbackPersistence,
  ReplyFeedbackTarget,
} from './types';

function createPersistence(overrides: Partial<ReplyFeedbackPersistence> = {}) {
  const calls: string[] = [];

  const persistence: ReplyFeedbackPersistence = {
    async saveReplyFeedback(replyId: string, feedbackType: ReplyFeedback) {
      calls.push(`save:${replyId}:${feedbackType}`);
    },
    async incrementHelpedCount(replierId: string) {
      calls.push(`increment:${replierId}`);
    },
    ...overrides,
  };

  return { persistence, calls };
}

const humanReply: ReplyFeedbackTarget = {
  id: 'reply-1',
  senderId: 'human-1',
};

test('saves feedback before any helpedCount work', async () => {
  const { persistence, calls } = createPersistence();

  await submitReplyFeedback({
    reply: humanReply,
    feedbackType: 'helpful',
    persistence,
  });

  assert.deepEqual(calls, ['save:reply-1:helpful', 'increment:human-1']);
});

test('helpful human reply calls incrementHelpedCount', async () => {
  const { persistence, calls } = createPersistence();

  const result = await submitReplyFeedback({
    reply: humanReply,
    feedbackType: 'helpful',
    persistence,
  });

  assert.deepEqual(result, { status: 'saved', feedback: 'helpful' });
  assert.deepEqual(calls, ['save:reply-1:helpful', 'increment:human-1']);
});

test('not_helpful saves feedback and skips helpedCount', async () => {
  const { persistence, calls } = createPersistence();

  const result = await submitReplyFeedback({
    reply: humanReply,
    feedbackType: 'not_helpful',
    persistence,
  });

  assert.deepEqual(result, { status: 'saved', feedback: 'not_helpful' });
  assert.deepEqual(calls, ['save:reply-1:not_helpful']);
});

test('AI-generated reply saves feedback and skips helpedCount', async () => {
  const { persistence, calls } = createPersistence();

  const result = await submitReplyFeedback({
    reply: { ...humanReply, isAiGenerated: true },
    feedbackType: 'helpful',
    persistence,
  });

  assert.deepEqual(result, { status: 'saved', feedback: 'helpful' });
  assert.deepEqual(calls, ['save:reply-1:helpful']);
});

test('bot sender reply saves feedback and skips helpedCount', async () => {
  const { persistence, calls } = createPersistence();

  const result = await submitReplyFeedback({
    reply: { ...humanReply, senderId: 'bot_replyer' },
    feedbackType: 'helpful',
    persistence,
  });

  assert.deepEqual(result, { status: 'saved', feedback: 'helpful' });
  assert.deepEqual(calls, ['save:reply-1:helpful']);
});

test('feedback save failure prevents success and does not call helpedCount', async () => {
  const error = new Error('save failed');
  const { persistence, calls } = createPersistence({
    async saveReplyFeedback(replyId: string, feedbackType: ReplyFeedback) {
      calls.push(`save:${replyId}:${feedbackType}`);
      throw error;
    },
  });

  await assert.rejects(
    submitReplyFeedback({
      reply: humanReply,
      feedbackType: 'helpful',
      persistence,
    }),
    error,
  );
  assert.deepEqual(calls, ['save:reply-1:helpful']);
});

test('helpedCount failure still returns feedback', async () => {
  const { persistence, calls } = createPersistence({
    async incrementHelpedCount(replierId: string) {
      calls.push(`increment:${replierId}`);
      throw new Error('increment failed');
    },
  });

  const result = await submitReplyFeedback({
    reply: humanReply,
    feedbackType: 'helpful',
    persistence,
  });

  assert.deepEqual(result, { status: 'saved', feedback: 'helpful' });
  assert.deepEqual(calls, ['save:reply-1:helpful', 'increment:human-1']);
});

test('PRD feedback uses API path and does not fall back to direct Firestore persistence', async () => {
  const calls: string[] = [];
  const result = await submitReplyFeedback({
    reply: { ...humanReply, source: 'prd_replies' },
    feedbackType: 'helpful',
    comment: ' 고마워요 ',
    persistence: {
      async saveReplyFeedback() {
        calls.push('legacy-save');
      },
      async incrementHelpedCount() {
        calls.push('legacy-increment');
      },
    },
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

test('PRD feedback fails closed when API path is unavailable', async () => {
  const calls: string[] = [];

  await assert.rejects(
    submitReplyFeedback({
      reply: { ...humanReply, source: 'prd_replies' },
      feedbackType: 'helpful',
      persistence: {
        async saveReplyFeedback() {
          calls.push('legacy-save');
        },
        async incrementHelpedCount() {
          calls.push('legacy-increment');
        },
      },
    }),
    /reply_feedback_api_unavailable/
  );

  assert.deepEqual(calls, []);
});
