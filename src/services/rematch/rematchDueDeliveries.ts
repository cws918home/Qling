import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { sendNewWorryPushesAfterCommit } from '../worryPublication/server/pushLogs';
import { createRematchRepository } from './firestoreRepository';
import {
  calculateTargetCount,
  chooseNextRematchSource,
  getRematchEligibleAfter,
  randomSlotAvailable,
  selectRematchRecipients,
} from './policy';
import type {
  CommittedRematchBatch,
  RematchDueDeliveriesResult,
  RematchPushAdapter,
  RematchRepository,
} from './types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const LOCK_DURATION_MS = 10 * 60 * 1000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function rematchDueDeliveries(params: {
  db: Firestore;
  messaging: Messaging | null;
  now?: Date;
  limit?: number;
  dryRun?: boolean;
  repository?: RematchRepository;
  random?: () => number;
  pushAdapter?: RematchPushAdapter;
}): Promise<RematchDueDeliveriesResult> {
  const now = params.now ?? new Date();
  const limit = params.limit ?? DEFAULT_LIMIT;
  const dryRun = params.dryRun ?? false;
  const repository = params.repository ?? createRematchRepository({ db: params.db });
  const pushAdapter = params.pushAdapter ?? sendNewWorryPushesAfterCommit;
  const runId = repository.createRunId();

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
        dueCount: 0,
        processedCount: 0,
        createdDeliveryCount: 0,
        results: [],
        dryRun,
      };
    }

    const scans = await repository.fetchScans({ now, limit: Math.min(limit, MAX_LIMIT) });
    const results: CommittedRematchBatch[] = [];
    let dueCount = 0;
    let createdDeliveryCount = 0;
    const pushDeliveries: Array<{ deliveryId: string; recipientUid: string; worryId: string }> = [];

    for (const scan of scans) {
      const source = chooseNextRematchSource({ scan, now });
      if (source.status === 'skip') {
        results.push({
          status: 'skipped',
          worryId: scan.worryId,
          deliveryIds: [],
          recipientUids: [],
          createdCount: 0,
          reason: source.reason,
        });
        continue;
      }

      const sourceDeliveries = scan.sourceDeliveries.filter(delivery => (
        delivery.worryId === scan.worryId
        && delivery.batchId === source.sourceBatch.id
        && delivery.isAiRecipient !== true
      ));
      const targetCount = calculateTargetCount({ scan, sourceBatchId: source.sourceBatch.id });
      if (targetCount <= 0) {
        results.push({
          status: 'skipped',
          worryId: scan.worryId,
          deliveryIds: [],
          recipientUids: [],
          createdCount: 0,
          reason: scan.humanDeliveryCount >= Math.min(scan.humanDeliveryLimit, 15) ? 'no_capacity' : 'no_unanswered_slots',
        });
        continue;
      }

      dueCount += 1;
      const recipients = selectRematchRecipients({
        scan,
        targetCount,
        includeRandom: randomSlotAvailable(sourceDeliveries),
        random: params.random ?? Math.random,
      });
      const rematchEligibleAfter = getRematchEligibleAfter({
        nextRound: source.nextRound,
        batchCreatedAt: now,
      });

      if (dryRun) {
        results.push({
          status: 'skipped',
          worryId: scan.worryId,
          deliveryIds: [],
          recipientUids: recipients.map(recipient => recipient.uid),
          createdCount: recipients.length,
          reason: 'dry_run',
        });
        continue;
      }

      const committed = await repository.commitRematchBatch({
        runId,
        now,
        scan,
        sourceBatch: source.sourceBatch,
        targetCount,
        recipients,
        nextRound: source.nextRound,
        rematchEligibleAfter,
      });
      results.push(committed);
      createdDeliveryCount += committed.createdCount;
      for (const deliveryId of committed.deliveryIds) {
        const recipientUid = committed.recipientUids[committed.deliveryIds.indexOf(deliveryId)];
        if (recipientUid) pushDeliveries.push({ deliveryId, recipientUid, worryId: committed.worryId });
      }
    }

    if (!dryRun) {
      await repository.completeRun({
        runId,
        now,
        status: 'completed',
        dueCount,
        processedCount: results.length,
        createdDeliveryCount,
        error: null,
      });
      await pushAdapter({
        db: params.db,
        messaging: params.messaging,
        deliveries: pushDeliveries,
      }).catch(() => undefined);
    }

    return {
      status: 'completed',
      runId,
      dueCount,
      processedCount: results.length,
      createdDeliveryCount,
      results,
      dryRun,
    };
  } catch (error) {
    if (!dryRun) {
      await repository.completeRun({
        runId,
        now,
        status: 'failed',
        dueCount: 0,
        processedCount: 0,
        createdDeliveryCount: 0,
        error: errorMessage(error),
      }).catch(() => undefined);
    }
    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: '재매칭 작업 중 문제가 발생했습니다.',
      details: errorMessage(error),
    };
  }
}
