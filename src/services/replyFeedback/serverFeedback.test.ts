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
        existing = {
          type: params.type,
          comment: existing.comment ?? params.comment,
        };
        return {
          feedbackId: params.replyId,
          helpedCountApplied: params.type === 'like',
          replyLikedPush: null,
        };
      }
      existing = {
        type: params.type,
        comment: params.comment,
      };
      return {
        feedbackId: params.replyId,
        helpedCountApplied: params.type === 'like',
        replyLikedPush: params.type === 'like'
          ? {
            feedbackId: params.replyId,
            replyId: params.replyId,
            replierUid: 'replier',
          }
          : null,
      };
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
    pushService: { async sendReplyLiked() {} },
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
    pushService: { async sendReplyLiked() {} },
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
    pushService: { async sendReplyLiked() {} },
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
    pushService: { async sendReplyLiked() {} },
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

test('newly created like triggers reply-liked push after feedback commit', async () => {
  const { repository } = createRepository();
  const pushCalls: unknown[] = [];

  const result = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService: {
      async sendReplyLiked(params) {
        pushCalls.push(params);
      },
    },
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
  });

  assert.deepEqual(result, { status: 'saved', feedbackId: 'reply-1', helpedCountApplied: true });
  assert.deepEqual(pushCalls, [{
    feedbackId: 'reply-1',
    replyId: 'reply-1',
    replierUid: 'replier',
  }]);
});

test('comment-only like update does not push', async () => {
  const { repository } = createRepository();
  const pushCalls: unknown[] = [];
  const pushService = {
    async sendReplyLiked(params: unknown) {
      pushCalls.push(params);
    },
  };

  await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService,
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
  });
  pushCalls.length = 0;

  await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService,
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: '나중에 고마워요',
  });

  assert.deepEqual(pushCalls, []);
});

test('dislike does not push', async () => {
  const { repository } = createRepository();
  const pushCalls: unknown[] = [];

  await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService: {
      async sendReplyLiked(params) {
        pushCalls.push(params);
      },
    },
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'dislike',
  });

  assert.deepEqual(pushCalls, []);
});

test('repeated like does not push again', async () => {
  const { repository } = createRepository();
  const pushCalls: unknown[] = [];
  const pushService = {
    async sendReplyLiked(params: unknown) {
      pushCalls.push(params);
    },
  };

  await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService,
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
  });
  await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService,
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
  });

  assert.equal(pushCalls.length, 1);
});

test('push failure returns feedback success and logs warning after commit', async () => {
  const { repository, calls } = createRepository();
  const warnings: unknown[] = [];

  const result = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService: {
      async sendReplyLiked() {
        throw new Error('push down');
      },
    },
    pushLogger: {
      warn(message, details) {
        warnings.push({ message, details });
      },
    },
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
  });

  assert.deepEqual(result, { status: 'saved', feedbackId: 'reply-1', helpedCountApplied: true });
  assert.equal(calls.length, 1);
  assert.deepEqual(warnings, [{
    message: '[FeedbackPush] Reply-liked push failed after feedback commit.',
    details: {
      feedbackId: 'reply-1',
      replyId: 'reply-1',
      error: 'push down',
    },
  }]);
});
