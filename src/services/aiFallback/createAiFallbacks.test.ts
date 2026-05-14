import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiFallbacksWithDependencies } from './createAiFallbacks';
import type {
  AiFallbackCandidate,
  AiFallbackCommitResult,
  AiFallbackModerationLogWriteModel,
  AiFallbackRepository,
} from './types';

const now = new Date('2026-05-13T00:00:00.000Z');
const oldCandidate: AiFallbackCandidate = {
  worryId: 'worry1',
  authorUid: 'author',
  content: '고민',
  createdAt: new Date('2026-05-11T00:00:00.000Z'),
  humanDeliveryCount: 15,
  humanDeliveryLimit: 15,
};

function createRepo(options: {
  candidates?: AiFallbackCandidate[];
  lock?: boolean;
  commitResults?: AiFallbackCommitResult[];
  throwOnCommit?: boolean;
} = {}) {
  const runDocs: unknown[] = [];
  const moderationLogs: AiFallbackModerationLogWriteModel[] = [];
  const repo: AiFallbackRepository = {
    createRunId: () => 'run1',
    createModerationLogId: () => `mod${moderationLogs.length + 1}`,
    fetchCandidates: async () => options.candidates ?? [oldCandidate],
    acquireRunLock: async () => options.lock ?? true,
    completeRun: async params => {
      runDocs.push(params);
    },
    commitApprovedReply: async params => {
      moderationLogs.push(params.moderationLog);
      if (options.throwOnCommit) throw new Error('transaction failed');
      return options.commitResults?.shift() ?? {
        status: 'created',
        worryId: params.candidate.worryId,
        replyId: `${params.candidate.worryId}_ai`,
        authorUid: params.candidate.authorUid,
        moderationLogId: params.moderationLog.id,
      };
    },
    commitRejectedReply: async params => {
      moderationLogs.push(params.moderationLog);
      return options.commitResults?.shift() ?? {
        status: 'rejected',
        worryId: params.candidate.worryId,
        moderationLogId: params.moderationLog.id,
        reasonCode: params.moderationLog.reasonCode,
      };
    },
  };
  return { repo, runDocs, moderationLogs };
}

function createService(repo: AiFallbackRepository, options: {
  generatorThrows?: boolean;
  moderation?: unknown;
  moderationThrows?: boolean;
  pushThrows?: boolean;
  pushCalls?: unknown[];
} = {}) {
  return createAiFallbacksWithDependencies({
    db: {} as never,
    messaging: null,
    repository: repo,
    generator: async () => {
      if (options.generatorThrows) throw new Error('generator down');
      return { content: '많이 힘들었겠어요. 오늘은 조금 쉬어도 괜찮아요.' };
    },
    moderationProvider: async () => options.moderation ?? { status: 'approved' },
    moderateAiReply: async () => {
      if (options.moderationThrows) return { status: 'provider_error', error: new Error('moderation down') };
      return (options.moderation ?? { status: 'approved', rawProviderResponse: { status: 'approved' } }) as never;
    },
    pushAdapter: async params => {
      options.pushCalls?.push(params);
      if (options.pushThrows) throw new Error('push down');
    },
  });
}

test('dry run writes no persistent data and returns dry_run skips', async () => {
  const { repo, runDocs, moderationLogs } = createRepo();
  const pushCalls: unknown[] = [];
  const result = await createService(repo, { pushCalls })({ now, dryRun: true, limit: 1 });

  assert.equal(result.status, 'completed');
  assert.equal(result.checkedCount, 1);
  assert.equal(result.createdReplyCount, 0);
  assert.deepEqual(result.results, [{ status: 'skipped', worryId: 'worry1', reason: 'dry_run' }]);
  assert.deepEqual(runDocs, []);
  assert.deepEqual(moderationLogs, []);
  assert.deepEqual(pushCalls, []);
});

test('successful completed run writes run doc and sends push after commit', async () => {
  const { repo, runDocs } = createRepo();
  const pushCalls: unknown[] = [];
  const result = await createService(repo, { pushCalls })({ now });

  assert.equal(result.status, 'completed');
  assert.equal(result.createdReplyCount, 1);
  assert.equal(result.results[0].status, 'created');
  assert.equal((result.results[0] as { notification: string }).notification, 'sent');
  assert.equal(pushCalls.length, 1);
  assert.equal((runDocs[0] as { status: string }).status, 'completed');
});

test('lock busy writes no run doc for rejected contender', async () => {
  const { repo, runDocs } = createRepo({ lock: false });
  const result = await createService(repo)({ now });

  assert.equal(result.status, 'lock_busy');
  assert.deepEqual(runDocs, []);
});

test('generator failure before any commit marks run failed and returns provider error', async () => {
  const { repo, runDocs } = createRepo();
  const result = await createService(repo, { generatorThrows: true })({ now });

  assert.equal(result.status, 'provider_error');
  assert.equal(result.code, 'generator_failed');
  assert.equal((runDocs[0] as { status: string }).status, 'failed');
});

test('moderation provider failure before any commit marks run failed and returns provider error', async () => {
  const { repo, runDocs } = createRepo();
  const result = await createService(repo, { moderationThrows: true })({ now });

  assert.equal(result.status, 'provider_error');
  assert.equal(result.code, 'moderation_failed');
  assert.equal((runDocs[0] as { status: string }).status, 'failed');
});

test('partial per-worry failure after prior usable result marks run partial', async () => {
  const { repo, runDocs } = createRepo({
    candidates: [oldCandidate, { ...oldCandidate, worryId: 'worry2' }],
  });
  let calls = 0;
  const service = createAiFallbacksWithDependencies({
    db: {} as never,
    messaging: null,
    repository: repo,
    generator: async () => {
      calls += 1;
      if (calls === 2) throw new Error('generator later down');
      return { content: '괜찮아요. 천천히 해봐요.' };
    },
    moderationProvider: async () => ({ status: 'approved' }),
    moderateAiReply: async () => ({ status: 'approved', rawProviderResponse: { status: 'approved' } }),
    pushAdapter: async () => undefined,
  });

  const result = await service({ now });
  assert.equal(result.status, 'partial');
  assert.equal(result.createdReplyCount, 1);
  assert.equal(result.results[1].status, 'failed');
  assert.equal((runDocs[0] as { status: string }).status, 'partial');
});

test('moderation rejection creates rejected result and no notification', async () => {
  const { repo } = createRepo();
  const pushCalls: unknown[] = [];
  const result = await createService(repo, {
    moderation: {
      status: 'rejected',
      reasonCode: 'spam_promotion',
      userMessage: '부적절한 표현이 감지되었습니다.',
      helpMessage: null,
      rawProviderResponse: { status: 'rejected' },
    },
    pushCalls,
  })({ now });

  assert.equal(result.status, 'completed');
  assert.equal(result.results[0].status, 'rejected');
  assert.deepEqual(pushCalls, []);
});

test('push failure records warning and leaves created result committed', async () => {
  const { repo } = createRepo();
  const result = await createService(repo, { pushThrows: true, pushCalls: [] })({ now });

  assert.equal(result.status, 'completed');
  assert.equal(result.results[0].status, 'created');
  assert.match((result.results[0] as { warning: string }).warning, /push down/);
});

test('transaction failure marks run failed', async () => {
  const { repo, runDocs } = createRepo({ throwOnCommit: true });
  const result = await createService(repo)({ now });

  assert.equal(result.status, 'server_error');
  assert.equal((runDocs[0] as { status: string }).status, 'failed');
});

test('completed run with zero created replies still marks run completed', async () => {
  const { repo, runDocs } = createRepo({
    commitResults: [{ status: 'skipped', worryId: 'worry1', reason: 'ai_reply_exists' }],
  });
  const result = await createService(repo)({ now });

  assert.equal(result.status, 'completed');
  assert.equal(result.createdReplyCount, 0);
  assert.equal((runDocs[0] as { status: string }).status, 'completed');
});
