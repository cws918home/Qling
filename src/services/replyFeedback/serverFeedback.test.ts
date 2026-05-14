import test from 'node:test';
import assert from 'node:assert/strict';
import { submitReplyFeedbackOnServer, type ReplyFeedbackRepository } from './serverFeedback';

function createRepository() {
  const calls: unknown[] = [];
  const rejectedModerationLogs: Array<{ moderationLogId: string; moderationLog: Record<string, unknown> }> = [];
  let existing: Record<string, unknown> | null = null;
  const repository: ReplyFeedbackRepository = {
    createModerationLogId: () => 'mod-feedback-1',
    async saveRejectedCommentModeration(params) {
      rejectedModerationLogs.push(params);
      return { moderationLogId: params.moderationLogId };
    },
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
  return { repository, calls, rejectedModerationLogs };
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
    code: 'empty',
    message: '코멘트를 입력해 주세요.',
  });
  assert.deepEqual(calls, []);
});

test('feedback comment validation rejects too long and allows short content', async () => {
  const tooLongRepo = createRepository();
  const tooLong = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository: tooLongRepo.repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService: { async sendReplyLiked() {} },
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: 'a'.repeat(1001),
  });
  assert.equal(tooLong.status, 'validation_error');
  assert.equal(tooLong.status === 'validation_error' ? tooLong.code : '', 'too_long');
  assert.deepEqual(tooLongRepo.calls, []);

  const shortRepo = createRepository();
  const short = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository: shortRepo.repository,
    moderationProvider: async () => ({ status: 'approved' }),
    pushService: { async sendReplyLiked() {} },
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: '굿',
  });
  assert.equal(short.status, 'saved');
  assert.equal(shortRepo.calls.length, 1);
});

test('rejected feedback comment persists moderation log only and returns canonical copy', async () => {
  const { repository, calls, rejectedModerationLogs } = createRepository();
  const pushCalls: unknown[] = [];
  const result = await submitReplyFeedbackOnServer({
    db: {} as never,
    repository,
    moderationProvider: async () => ({ status: 'rejected', reason: 'self harm' }),
    pushService: {
      async sendReplyLiked(params) {
        pushCalls.push(params);
      },
    },
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: 'comment',
  });

  assert.equal(result.status, 'rejected');
  if (result.status !== 'rejected') return;
  assert.equal(result.reasonCode, 'self_harm_suicide');
  assert.equal(result.userMessage, '자해나 자살 위험 표현이 포함되어 전송할 수 없습니다.');
  assert.equal(result.helpMessage?.length > 0, true);
  assert.equal(result.moderationLogId, 'mod-feedback-1');
  assert.equal(rejectedModerationLogs.length, 1);
  assert.equal(rejectedModerationLogs[0].moderationLogId, 'mod-feedback-1');
  assert.deepEqual(rejectedModerationLogs[0].moderationLog, {
    targetType: 'feedback_comment',
    targetId: 'reply-1',
    uid: 'publisher',
    originalContent: 'comment',
    status: 'rejected',
    reasonCode: 'self_harm_suicide',
    userMessage: '자해나 자살 위험 표현이 포함되어 전송할 수 없습니다.',
    helpMessage: result.helpMessage,
    rawProviderResponse: { status: 'rejected', reason: 'self harm' },
    provider: 'feedback_comment',
    model: 'configured-provider',
    createdAt: rejectedModerationLogs[0].moderationLog.createdAt,
    updatedAt: rejectedModerationLogs[0].moderationLog.updatedAt,
  });
  assert.deepEqual(calls, []);
  assert.deepEqual(pushCalls, []);
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
