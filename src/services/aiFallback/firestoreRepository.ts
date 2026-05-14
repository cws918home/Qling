import { Timestamp, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type {
  AiFallbackCandidate,
  AiFallbackCommitResult,
  AiFallbackModerationLogWriteModel,
  AiFallbackRepository,
  AiFallbackReplyWriteModel,
  AiFallbackSkipReason,
} from './types';

const JOB_NAME = 'createAiFallbacks';
const MAX_LIMIT = 100;
const SCAN_LIMIT = 500;
const AI_REPLIER_UID = 'ai_fallback';

function withoutId<T extends { id: string }>(model: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = model;
  return rest;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function replyIdFor(worryId: string) {
  return `${worryId}_ai`;
}

function humanDeliveryLimit(worry: FirebaseFirestore.DocumentData) {
  return Math.min(typeof worry.humanDeliveryLimit === 'number' ? worry.humanDeliveryLimit : 15, 15);
}

function currentHumanDeliveryCount(deliveries: FirebaseFirestore.QuerySnapshot) {
  return deliveries.docs.filter(doc => doc.data().isAiRecipient !== true).length;
}

function hasHumanReply(replies: FirebaseFirestore.QuerySnapshot) {
  return replies.docs.some(doc => doc.data().isAiGenerated !== true);
}

function isPartialInitialDeliveryCount(value: unknown) {
  return typeof value === 'number' && value >= 0 && value < 5;
}

function hasPartialInitialDelivery(candidate: AiFallbackCandidate) {
  return isPartialInitialDeliveryCount(candidate.initialDeliveryCreatedCount);
}

async function fetchInitialDeliveryCreatedCount(params: {
  db: Firestore;
  initialDeliveryBatchId: unknown;
}) {
  if (typeof params.initialDeliveryBatchId !== 'string' || params.initialDeliveryBatchId.length === 0) {
    return undefined;
  }
  const batchDoc = await params.db.collection('deliveryBatches').doc(params.initialDeliveryBatchId).get();
  const createdCount = batchDoc.data()?.createdCount;
  return typeof createdCount === 'number' ? createdCount : undefined;
}

async function fetchInitialDeliveryCreatedCountInTransaction(params: {
  db: Firestore;
  transaction: Transaction;
  initialDeliveryBatchId: unknown;
}) {
  if (typeof params.initialDeliveryBatchId !== 'string' || params.initialDeliveryBatchId.length === 0) {
    return undefined;
  }
  const batchDoc = await params.transaction.get(params.db.collection('deliveryBatches').doc(params.initialDeliveryBatchId));
  const createdCount = batchDoc.data()?.createdCount;
  return typeof createdCount === 'number' ? createdCount : undefined;
}

function precheckCandidate(candidate: AiFallbackCandidate, now: Date): AiFallbackSkipReason | null {
  if (!candidate.createdAt || now.getTime() - candidate.createdAt.getTime() < 24 * 60 * 60 * 1000) {
    return 'not_24h_elapsed';
  }
  if (candidate.hasAiReply === true || typeof candidate.aiReplyId === 'string') {
    return 'ai_reply_exists';
  }
  if (
    typeof candidate.humanDeliveryCount === 'number'
    && candidate.humanDeliveryCount < Math.min(candidate.humanDeliveryLimit ?? 15, 15)
    && !hasPartialInitialDelivery(candidate)
  ) {
    return 'human_delivery_cap_not_exhausted';
  }
  return null;
}

async function recheckEligibility(params: {
  db: Firestore;
  transaction: Transaction;
  candidate: AiFallbackCandidate;
  now: Date;
}) {
  const worryRef = params.db.collection('worries').doc(params.candidate.worryId);
  const replyRef = params.db.collection('replies').doc(replyIdFor(params.candidate.worryId));
  const deliveriesQuery = params.db.collection('deliveries').where('worryId', '==', params.candidate.worryId);
  const repliesQuery = params.db.collection('replies').where('worryId', '==', params.candidate.worryId);
  const [worryDoc, aiReplyDoc, deliveriesSnap, repliesSnap] = await Promise.all([
    params.transaction.get(worryRef),
    params.transaction.get(replyRef),
    params.transaction.get(deliveriesQuery),
    params.transaction.get(repliesQuery),
  ]);

  if (!worryDoc.exists) return { status: 'skipped' as const, reason: 'worry_missing' as const };
  const worry = worryDoc.data() ?? {};
  if (worry.status !== 'active') return { status: 'skipped' as const, reason: 'worry_missing' as const };
  if (worry.isExample === true) return { status: 'skipped' as const, reason: 'example_worry' as const };
  const createdAt = toDate(worry.createdAt);
  if (!createdAt || params.now.getTime() - createdAt.getTime() < 24 * 60 * 60 * 1000) {
    return { status: 'skipped' as const, reason: 'not_24h_elapsed' as const };
  }
  if (aiReplyDoc.exists || worry.hasAiReply === true || typeof worry.aiReplyId === 'string') {
    return { status: 'skipped' as const, reason: 'ai_reply_exists' as const };
  }
  const currentDeliveryCount = currentHumanDeliveryCount(deliveriesSnap);
  const initialDeliveryCreatedCount = await fetchInitialDeliveryCreatedCountInTransaction({
    db: params.db,
    transaction: params.transaction,
    initialDeliveryBatchId: worry.initialDeliveryBatchId,
  });
  if (currentDeliveryCount < humanDeliveryLimit(worry) && !isPartialInitialDeliveryCount(initialDeliveryCreatedCount)) {
    return { status: 'skipped' as const, reason: 'human_delivery_cap_not_exhausted' as const };
  }
  if (hasHumanReply(repliesSnap)) {
    return { status: 'skipped' as const, reason: 'human_reply_exists' as const };
  }

  const authorUid = typeof worry.authorUid === 'string' ? worry.authorUid : params.candidate.authorUid;
  return { status: 'eligible' as const, worryRef, replyRef, authorUid };
}

export function createAiFallbackRepository(params: { db: Firestore }): AiFallbackRepository {
  const { db } = params;

  return {
    createRunId() {
      return db.collection('aiFallbackRuns').doc().id;
    },

    createModerationLogId() {
      return db.collection('moderationLogs').doc().id;
    },

    async fetchCandidates({ now, limit }) {
      const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const snap = await db.collection('worries')
        .where('status', '==', 'active')
        .where('createdAt', '<=', cutoff)
        .orderBy('createdAt', 'asc')
        .limit(Math.max(safeLimit, SCAN_LIMIT))
        .get();
      const candidates: AiFallbackCandidate[] = [];
      for (const doc of snap.docs) {
        const data = doc.data();
        if (data.isExample === true) continue;
        if (typeof data.authorUid !== 'string' || typeof data.content !== 'string') continue;
        const candidate: AiFallbackCandidate = {
          worryId: doc.id,
          authorUid: data.authorUid,
          content: data.content,
          createdAt: toDate(data.createdAt),
          humanDeliveryCount: typeof data.humanDeliveryCount === 'number' ? data.humanDeliveryCount : undefined,
          humanDeliveryLimit: typeof data.humanDeliveryLimit === 'number' ? data.humanDeliveryLimit : undefined,
          initialDeliveryBatchId: typeof data.initialDeliveryBatchId === 'string' ? data.initialDeliveryBatchId : undefined,
          initialDeliveryCreatedCount: await fetchInitialDeliveryCreatedCount({
            db,
            initialDeliveryBatchId: data.initialDeliveryBatchId,
          }),
          hasAiReply: data.hasAiReply,
          aiReplyId: typeof data.aiReplyId === 'string' ? data.aiReplyId : undefined,
        };
        if (precheckCandidate(candidate, now)) continue;
        candidates.push(candidate);
        if (candidates.length >= safeLimit) break;
      }
      return candidates;
    },

    async acquireRunLock({ runId, now, lockUntil }) {
      return db.runTransaction(async transaction => {
        const lockRef = db.collection('jobLocks').doc(JOB_NAME);
        const runRef = db.collection('aiFallbackRuns').doc(runId);
        const lockDoc = await transaction.get(lockRef);
        const currentLockedUntil = toDate(lockDoc.data()?.lockedUntil);
        if (currentLockedUntil && currentLockedUntil.getTime() > now.getTime()) return false;
        transaction.set(lockRef, {
          ownerId: runId,
          lockedUntil: lockUntil,
          lastStartedAt: now,
          lastCompletedAt: lockDoc.exists ? (lockDoc.data()?.lastCompletedAt ?? null) : null,
          updatedAt: now,
        }, { merge: true });
        transaction.set(runRef, {
          startedAt: now,
          completedAt: null,
          status: 'running',
          checkedCount: 0,
          createdReplyCount: 0,
          error: null,
        });
        return true;
      });
    },

    async completeRun({ runId, now, status, checkedCount, createdReplyCount, error }) {
      await db.runTransaction(async transaction => {
        const lockRef = db.collection('jobLocks').doc(JOB_NAME);
        transaction.set(db.collection('aiFallbackRuns').doc(runId), {
          completedAt: now,
          status,
          checkedCount,
          createdReplyCount,
          error,
        }, { merge: true });
        transaction.set(lockRef, {
          ownerId: runId,
          lockedUntil: now,
          lastCompletedAt: now,
          updatedAt: now,
        }, { merge: true });
      });
    },

    async commitApprovedReply({ now, candidate, content, moderationLog }) {
      const precheck = precheckCandidate(candidate, now);
      if (precheck) return { status: 'skipped', worryId: candidate.worryId, reason: precheck };

      return db.runTransaction(async transaction => {
        const eligible = await recheckEligibility({ db, transaction, candidate, now });
        if (eligible.status === 'skipped') {
          return { status: 'skipped' as const, worryId: candidate.worryId, reason: eligible.reason };
        }

        const replyId = replyIdFor(candidate.worryId);
        const reply: AiFallbackReplyWriteModel = {
          id: replyId,
          deliveryId: `ai:${candidate.worryId}`,
          worryId: candidate.worryId,
          authorUid: eligible.authorUid,
          replierUid: AI_REPLIER_UID,
          content,
          status: 'active',
          moderationLogId: moderationLog.id,
          createdAt: now,
          updatedAt: now,
          isAiGenerated: true,
          isExampleReply: false,
        };

        transaction.set(db.collection('moderationLogs').doc(moderationLog.id), withoutId(moderationLog));
        transaction.set(eligible.replyRef, withoutId(reply));
        transaction.update(eligible.worryRef, {
          hasAiReply: true,
          aiReplyId: replyId,
          aiFallbackCheckedAt: now,
          updatedAt: now,
        });

        return {
          status: 'created' as const,
          worryId: candidate.worryId,
          replyId,
          authorUid: eligible.authorUid,
          moderationLogId: moderationLog.id,
        };
      });
    },

    async commitRejectedReply({ now, candidate, moderationLog }) {
      const precheck = precheckCandidate(candidate, now);
      if (precheck) return { status: 'skipped', worryId: candidate.worryId, reason: precheck };

      return db.runTransaction(async transaction => {
        const eligible = await recheckEligibility({ db, transaction, candidate, now });
        if (eligible.status === 'skipped') {
          return { status: 'skipped' as const, worryId: candidate.worryId, reason: eligible.reason };
        }
        transaction.set(db.collection('moderationLogs').doc(moderationLog.id), withoutId(moderationLog));
        transaction.update(eligible.worryRef, {
          aiFallbackCheckedAt: now,
          updatedAt: now,
        });
        return {
          status: 'rejected' as const,
          worryId: candidate.worryId,
          moderationLogId: moderationLog.id,
          reasonCode: moderationLog.reasonCode,
        };
      });
    },
  };
}
