import test from 'node:test';
import assert from 'node:assert/strict';
import { submitReplyFeedbackOnServer, type ReplyFeedbackRepository } from './serverFeedback';

function createRepository() {
  const calls: unknown[] = [];
  let existing: Record<string, unknown> | null = null;
  const repository: ReplyFeedbackRepository = {
    createModerationLogId: () => 'mod-feedback-1',
    async saveFeedback(params) {
      calls.push(params);
      if (existing) {
        if (existing.type !== params.type) throw new Error('feedback_conflict');
        if (existing.type === 'dislike' && params.comment) throw new Error('feedback_conflict');
        if (existing.type === 'like' && existing.comment && params.comment && existing.comment !== params.comment) {
          throw new Error('feedback_conflict');
        }
      }
      existing = {
        type: params.type,
        comment: params.comment,
      };
      return { feedbackId: params.replyId, helpedCountApplied: params.type === 'like' };
    },
  };
  return { repository, calls };
}

test('initial like without comment stores exact absent-comment shape inputs', async () => {
  const { repository, calls } = createRepository();
  const result = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
  });

  assert.deepEqual(result, { status: 'saved', feedbackId: 'reply-1', helpedCountApplied: true });
  assert.deepEqual(calls, [{
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: null,
    commentModerationLogId: null,
    moderationLog: undefined,
  }]);
});

test('initial like with comment trims and creates replier-visible moderation log', async () => {
  const { repository, calls } = createRepository();
  await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: ' 고마워요 ',
  });

  const saved = calls[0] as { comment: string; commentModerationLogId: string; moderationLog: Record<string, unknown> };
  assert.equal(saved.comment, '고마워요');
  assert.equal(saved.commentModerationLogId, 'mod-feedback-1');
  assert.equal(saved.moderationLog.targetType, 'feedback_comment');
});

test('whitespace-only comment is rejected before state lookup', async () => {
  const { repository, calls } = createRepository();
  const result = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'dislike',
    comment: '   ',
  });

  assert.deepEqual(result, {
    status: 'validation_error',
    code: 'comment_empty',
    message: '코멘트를 입력해 주세요.',
  });
  assert.deepEqual(calls, []);
});

test('provider failure creates no feedback state', async () => {
  const { repository, calls } = createRepository();
  const result = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => { throw new Error('down'); },
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: '고마워요',
  });

  assert.equal(result.status, 'provider_error');
  assert.deepEqual(calls, []);
});

test('different later like comment conflicts', async () => {
  const { repository } = createRepository();
  await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: '처음',
  });

  const result = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: '다름',
  });

  assert.equal(result.status, 'conflict');
});
