import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { sendNewReplyPushAfterCommit } from '../replyPublication/server/pushLogs';
import {
  moderateAiReply,
  REPLY_MODERATION_MODEL,
  REPLY_MODERATION_PROVIDER,
} from '../replyPublication/server/moderation';
import { createAiFallbackRepository } from './firestoreRepository';
import type {
  AiFallbackCandidate,
  AiFallbackCandidateResult,
  AiFallbackModerationLogWriteModel,
  AiFallbackRepository,
  CreateAiFallbacks,
  CreateAiFallbacksDependencies,
  CreateAiFallbacksResult,
} from './types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const LOCK_DURATION_MS = 10 * 60 * 1000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function providerErrorResult(params: {
  runId: string;
  code: 'generator_failed' | 'moderation_failed';
  error: unknown;
}): CreateAiFallbacksResult {
  return {
    status: 'provider_error',
    runId: params.runId,
    code: params.code,
    message: params.code === 'generator_failed'
      ? 'AI fallback generator failed before any usable candidate result.'
      : 'AI fallback moderation failed before any usable candidate result.',
    details: errorMessage(params.error),
  };
}

function buildModerationLog(params: {
  id: string;
  candidate: AiFallbackCandidate;
  now: Date;
  content: string;
  moderation: Awaited<ReturnType<typeof moderateAiReply>>;
}): AiFallbackModerationLogWriteModel {
  const rejected = params.moderation.status === 'rejected';
  return {
    id: params.id,
    targetType: 'ai_reply',
    targetId: `${params.candidate.worryId}_ai`,
    uid: params.candidate.authorUid,
    originalContent: params.content,
    status: rejected ? 'rejected' : 'approved',
    reasonCode: params.moderation.status === 'rejected' ? params.moderation.reasonCode : 'approved',
    userMessage: params.moderation.status === 'rejected' ? params.moderation.userMessage : '',
    helpMessage: params.moderation.status === 'rejected' ? params.moderation.helpMessage : null,
    rawProviderResponse: 'rawProviderResponse' in params.moderation ? params.moderation.rawProviderResponse : null,
    provider: REPLY_MODERATION_PROVIDER,
    model: REPLY_MODERATION_MODEL,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

async function completeRunQuietly(params: {
  repository: AiFallbackRepository;
  runId: string;
  now: Date;
  status: 'completed' | 'failed' | 'partial';
  checkedCount: number;
  createdReplyCount: number;
  error: string | null;
  dryRun: boolean;
}) {
  if (params.dryRun) return;
  await params.repository.completeRun({
    runId: params.runId,
    now: params.now,
    status: params.status,
    checkedCount: params.checkedCount,
    createdReplyCount: params.createdReplyCount,
    error: params.error,
  }).catch(() => undefined);
}

export function createAiFallbacksWithDependencies(deps: CreateAiFallbacksDependencies): CreateAiFallbacks {
  const repository = deps.repository ?? createAiFallbackRepository({ db: deps.db });
  const pushAdapter = deps.pushAdapter ?? sendNewReplyPushAfterCommit;
  const runModeration = deps.moderateAiReply ?? moderateAiReply;

  return async ({ now: inputNow, dryRun: inputDryRun, limit: inputLimit } = {}) => {
    const now = inputNow ?? deps.clock?.() ?? new Date();
    const dryRun = inputDryRun ?? false;
    const limit = Math.min(inputLimit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const runId = repository.createRunId();
    let checkedCount = 0;
    let createdReplyCount = 0;
    const results: AiFallbackCandidateResult[] = [];

    try {
      const lockAcquired = dryRun || await repository.acquireRunLock({
        runId,
        now,
        lockUntil: new Date(now.getTime() + LOCK_DURATION_MS),
      });
      if (!lockAcquired) {
        return {
          status: 'lock_busy',
          runId,
          checkedCount: 0,
          createdReplyCount: 0,
          results: [],
          dryRun,
        };
      }

      const candidates = await repository.fetchCandidates({ now, limit });

      for (const candidate of candidates) {
        checkedCount += 1;
        if (dryRun) {
          results.push({ status: 'skipped', worryId: candidate.worryId, reason: 'dry_run' });
          continue;
        }

        let generated: { content: string };
        try {
          generated = await deps.generator({ worryContent: candidate.content });
        } catch (error) {
          if (results.length === 0) {
            await completeRunQuietly({
              repository,
              runId,
              now,
              status: 'failed',
              checkedCount,
              createdReplyCount,
              error: errorMessage(error),
              dryRun,
            });
            return providerErrorResult({ runId, code: 'generator_failed', error });
          }
          results.push({ status: 'failed', worryId: candidate.worryId, error: errorMessage(error) });
          continue;
        }

        const moderation = await runModeration({
          content: generated.content,
          provider: deps.moderationProvider,
        });

        if (moderation.status === 'provider_error' || moderation.status === 'provider_invalid') {
          const error = moderation.status === 'provider_error' ? moderation.error : moderation.rawProviderResponse;
          if (results.length === 0) {
            await completeRunQuietly({
              repository,
              runId,
              now,
              status: 'failed',
              checkedCount,
              createdReplyCount,
              error: errorMessage(error),
              dryRun,
            });
            return providerErrorResult({ runId, code: 'moderation_failed', error });
          }
          results.push({ status: 'failed', worryId: candidate.worryId, error: errorMessage(error) });
          continue;
        }

        const moderationLog = buildModerationLog({
          id: repository.createModerationLogId(),
          candidate,
          now,
          content: generated.content,
          moderation,
        });

        const committed = moderation.status === 'rejected'
          ? await repository.commitRejectedReply({ runId, now, candidate, moderationLog })
          : await repository.commitApprovedReply({ runId, now, candidate, content: generated.content, moderationLog });

        if (committed.status === 'created') {
          createdReplyCount += 1;
          const result: AiFallbackCandidateResult = {
            status: 'created',
            worryId: committed.worryId,
            replyId: committed.replyId,
            moderationLogId: committed.moderationLogId,
            notification: 'attempted',
          };
          try {
            await pushAdapter({
              db: deps.db as Firestore,
              messaging: deps.messaging as Messaging | null,
              reply: { id: committed.replyId, authorUid: committed.authorUid },
            });
            result.notification = 'sent';
          } catch (error) {
            result.warning = errorMessage(error);
          }
          results.push(result);
        } else {
          results.push(committed);
        }
      }

      const status = results.some(result => result.status === 'failed') ? 'partial' : 'completed';
      await completeRunQuietly({
        repository,
        runId,
        now,
        status,
        checkedCount,
        createdReplyCount,
        error: status === 'partial' ? 'One or more candidates failed after prior usable results.' : null,
        dryRun,
      });

      return {
        status,
        runId,
        checkedCount,
        createdReplyCount,
        results,
        dryRun,
      };
    } catch (error) {
      await completeRunQuietly({
        repository,
        runId,
        now,
        status: 'failed',
        checkedCount,
        createdReplyCount,
        error: errorMessage(error),
        dryRun,
      });
      return {
        status: 'server_error',
        runId,
        code: 'transaction_aborted',
        message: 'AI fallback job failed.',
        details: errorMessage(error),
      };
    }
  };
}
