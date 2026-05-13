import {
  FieldValue,
  Timestamp,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { isEligibleHumanCandidate } from '../matching/server/recipientPolicy';
import type {
  CommittedRematchBatch,
  RematchBatchWriteModel,
  RematchDeliveryWriteModel,
  RematchRepository,
  RematchScan,
  RematchSourceBatch,
  RematchSourceDelivery,
  SelectedRematchRecipient,
} from './types';

const JOB_NAME = 'rematchDueDeliveries';
const MAX_LIMIT = 100;

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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function userDocToCandidate(uid: string, data: FirebaseFirestore.DocumentData | undefined) {
  return {
    uid,
    gender: typeof data?.gender === 'string' ? data.gender : undefined,
    interests: Array.isArray(data?.interests) ? data.interests : undefined,
    helpedCount: typeof data?.helpedCount === 'number' ? data.helpedCount : undefined,
    activeDeliveryCount: typeof data?.activeDeliveryCount === 'number' ? data.activeDeliveryCount : undefined,
    deleted: data?.deleted,
    status: typeof data?.status === 'string' ? data.status : undefined,
    inactive: data?.inactive,
    disabled: data?.disabled,
    isBot: data?.isBot,
    type: typeof data?.type === 'string' ? data.type : undefined,
  };
}

function hasValidRematchProfile(candidate: ReturnType<typeof userDocToCandidate>): boolean {
  return typeof candidate.gender === 'string'
    && candidate.gender.length > 0
    && Array.isArray(candidate.interests)
    && candidate.interests.some(interest => typeof interest === 'string' && interest.length > 0);
}

function countHumanDeliveries(deliveries: RematchScan['allDeliveries']): number {
  return deliveries.filter(delivery => delivery.isAiRecipient !== true).length;
}

function validBatch(doc: FirebaseFirestore.QueryDocumentSnapshot): RematchSourceBatch | null {
  const data = doc.data();
  const createdAt = toDate(data.createdAt);
  if (
    typeof data.worryId !== 'string'
    || (data.batchRound !== 0 && data.batchRound !== 1 && data.batchRound !== 2)
    || !createdAt
  ) {
    return null;
  }
  return {
    id: doc.id,
    worryId: data.worryId,
    batchRound: data.batchRound,
    createdAt,
  } as RematchSourceBatch;
}

function sourceDelivery(doc: FirebaseFirestore.QueryDocumentSnapshot): RematchSourceDelivery | null {
  const data = doc.data();
  if (
    typeof data.worryId !== 'string'
    || typeof data.batchId !== 'string'
    || typeof data.recipientUid !== 'string'
    || (data.selectionType !== 'matched' && data.selectionType !== 'random')
  ) {
    return null;
  }
  return {
    id: doc.id,
    worryId: data.worryId,
    batchId: data.batchId,
    recipientUid: data.recipientUid,
    selectionType: data.selectionType,
    answeredAt: data.answeredAt ?? null,
    isAiRecipient: data.isAiRecipient,
  };
}

function buildBatch(params: {
  id: string;
  runId: string;
  now: Date;
  worryId: string;
  sourceBatch: RematchSourceBatch;
  recipients: SelectedRematchRecipient[];
  targetCount: number;
}): RematchBatchWriteModel {
  return {
    id: params.id,
    worryId: params.worryId,
    batchRound: params.sourceBatch.batchRound === 0 ? 1 : 2,
    sourceBatchId: params.sourceBatch.id,
    sourceBatchRound: params.sourceBatch.batchRound === 0 ? 0 : 1,
    createdByRunId: params.runId,
    createdAt: params.now,
    targetCount: params.targetCount,
    createdCount: params.recipients.length,
    matchedCount: params.recipients.filter(recipient => recipient.selectionType === 'matched').length,
    randomCount: params.recipients.filter(recipient => recipient.selectionType === 'random').length,
    reason: 'rematch_timeout',
  };
}

function buildDelivery(params: {
  batchId: string;
  runId: string;
  now: Date;
  worryId: string;
  authorUid: string;
  authorGender: string;
  recipient: SelectedRematchRecipient;
  batchRound: 1 | 2;
  rematchEligibleAfter: Date | null;
  matchingCategories: string[];
}): RematchDeliveryWriteModel {
  return {
    id: `${params.worryId}_${params.recipient.uid}`,
    worryId: params.worryId,
    recipientUid: params.recipient.uid,
    authorUid: params.authorUid,
    status: 'active',
    answeredAt: null,
    passedAt: null,
    answerableUntil: null,
    batchId: params.batchId,
    batchRound: params.batchRound,
    slotIndex: params.recipient.slotIndex,
    selectionType: params.recipient.selectionType,
    matchOverlapCount: params.recipient.matchOverlapCount,
    matchCategoriesSnapshot: [...params.matchingCategories],
    recipientInterestsSnapshot: [...params.recipient.interests],
    recipientGenderSnapshot: params.recipient.gender,
    recipientHelpedCountSnapshot: params.recipient.helpedCount,
    authorGenderSnapshot: params.authorGender,
    isAiRecipient: false,
    createdByRematchRunId: params.runId,
    rematchEligibleAfter: params.rematchEligibleAfter,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

async function queryIsEmpty(
  transaction: Transaction,
  query: FirebaseFirestore.Query
): Promise<boolean> {
  const snap = await transaction.get(query);
  return snap.empty || snap.docs.length === 0;
}

export function createRematchRepository(params: { db: Firestore }): RematchRepository {
  const { db } = params;

  return {
    createRunId() {
      return db.collection('rematchRuns').doc().id;
    },

    async fetchScans({ limit }) {
      const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));
      const worriesSnap = await db.collection('worries').where('status', '==', 'active').limit(safeLimit).get();
      const usersSnap = await db.collection('users').get();
      const candidates = usersSnap.docs.map(doc => userDocToCandidate(doc.id, doc.data()));
      const scans: RematchScan[] = [];

      for (const worryDoc of worriesSnap.docs) {
        const worry = worryDoc.data();
        const worryId = worryDoc.id;
        const [authorDoc, batchesSnap, deliveriesSnap, repliesSnap] = await Promise.all([
          typeof worry.authorUid === 'string' ? db.collection('users').doc(worry.authorUid).get() : Promise.resolve(null),
          db.collection('deliveryBatches').where('worryId', '==', worryId).get(),
          db.collection('deliveries').where('worryId', '==', worryId).get(),
          db.collection('replies').where('worryId', '==', worryId).get(),
        ]);

        if (typeof worry.authorUid !== 'string') continue;
        const batches = batchesSnap.docs.map(validBatch).filter((batch): batch is RematchSourceBatch => Boolean(batch));
        const allDeliveries = deliveriesSnap.docs.map(doc => ({
          id: doc.id,
          worryId,
          recipientUid: typeof doc.data().recipientUid === 'string' ? doc.data().recipientUid : undefined,
          passerUid: typeof doc.data().passerUid === 'string' ? doc.data().passerUid : undefined,
          isAiRecipient: doc.data().isAiRecipient,
        }));
        const sourceDeliveries = deliveriesSnap.docs
          .map(sourceDelivery)
          .filter((delivery): delivery is RematchSourceDelivery => Boolean(delivery));
        const answeredUids = new Set<string>();
        for (const replyDoc of repliesSnap.docs) {
          const replierUid = replyDoc.data().replierUid;
          if (typeof replierUid === 'string') answeredUids.add(replierUid);
        }
        for (const deliveryDoc of deliveriesSnap.docs) {
          const data = deliveryDoc.data();
          if (data.answeredAt && typeof data.recipientUid === 'string') answeredUids.add(data.recipientUid);
        }

        scans.push({
          worryId,
          author: {
            uid: worry.authorUid,
            gender: typeof authorDoc?.data()?.gender === 'string' ? authorDoc.data()?.gender : '',
            interests: stringArray(authorDoc?.data()?.interests),
          },
          matchingCategories: stringArray(worry.matchingCategories),
          humanDeliveryCount: typeof worry.humanDeliveryCount === 'number'
            ? worry.humanDeliveryCount
            : countHumanDeliveries(allDeliveries),
          humanDeliveryLimit: typeof worry.humanDeliveryLimit === 'number' ? worry.humanDeliveryLimit : 15,
          initialDeliveryBatchId: worry.initialDeliveryBatchId,
          batches,
          sourceDeliveries,
          allDeliveries,
          answeredUids,
          candidates,
        });
      }

      return scans;
    },

    async acquireRunLock({ runId, now, lockUntil }) {
      return db.runTransaction(async transaction => {
        const lockRef = db.collection('jobLocks').doc(JOB_NAME);
        const runRef = db.collection('rematchRuns').doc(runId);
        const lockDoc = await transaction.get(lockRef);
        const currentLockedUntil = toDate(lockDoc.data()?.lockedUntil);
        if (currentLockedUntil && currentLockedUntil.getTime() > now.getTime()) {
          return false;
        }
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
          dueCount: 0,
          processedCount: 0,
          createdDeliveryCount: 0,
          error: null,
        });
        return true;
      });
    },

    async completeRun({ runId, now, status, dueCount, processedCount, createdDeliveryCount, error }) {
      await db.runTransaction(async transaction => {
        const lockRef = db.collection('jobLocks').doc(JOB_NAME);
        transaction.set(db.collection('rematchRuns').doc(runId), {
          completedAt: now,
          status,
          dueCount,
          processedCount,
          createdDeliveryCount,
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

    async commitRematchBatch({ runId, now, scan, sourceBatch, targetCount, recipients, nextRound, rematchEligibleAfter }) {
      if (recipients.length === 0) {
        return {
          status: 'skipped',
          worryId: scan.worryId,
          deliveryIds: [],
          recipientUids: [],
          createdCount: 0,
          reason: 'no_eligible_recipients',
        };
      }

      return db.runTransaction(async transaction => {
        const worryRef = db.collection('worries').doc(scan.worryId);
        const sourceBatchRef = db.collection('deliveryBatches').doc(sourceBatch.id);
        const existingRoundQuery = db.collection('deliveryBatches')
          .where('worryId', '==', scan.worryId)
          .where('batchRound', '==', nextRound)
          .limit(1);
        const deliveriesForWorryQuery = db.collection('deliveries').where('worryId', '==', scan.worryId);
        const worryDoc = await transaction.get(worryRef);
        const sourceBatchDoc = await transaction.get(sourceBatchRef);
        const existingRoundDoc = await transaction.get(existingRoundQuery);
        const deliveriesForWorry = await transaction.get(deliveriesForWorryQuery);
        if (!worryDoc.exists || !sourceBatchDoc.exists) {
          return { status: 'skipped' as const, worryId: scan.worryId, deliveryIds: [], recipientUids: [], createdCount: 0, reason: 'no_source_batch' as const };
        }
        if (!existingRoundDoc.empty) {
          return { status: 'idempotent' as const, worryId: scan.worryId, deliveryIds: [], recipientUids: [], createdCount: 0 };
        }

        const currentHumanCount = deliveriesForWorry.docs.filter(doc => doc.data().isAiRecipient !== true).length;
        const worry = worryDoc.data() ?? {};
        const humanDeliveryLimit = typeof worry.humanDeliveryLimit === 'number' ? Math.min(worry.humanDeliveryLimit, 15) : 15;
        const remainingCapacity = Math.max(0, humanDeliveryLimit - currentHumanCount);
        if (remainingCapacity <= 0) {
          return { status: 'skipped' as const, worryId: scan.worryId, deliveryIds: [], recipientUids: [], createdCount: 0, reason: 'no_capacity' as const };
        }

        const selected: SelectedRematchRecipient[] = [];
        for (const recipient of recipients.slice(0, Math.min(targetCount, remainingCapacity))) {
          const recipientRef = db.collection('users').doc(recipient.uid);
          const deliveryRef = db.collection('deliveries').doc(`${scan.worryId}_${recipient.uid}`);
          const previousDeliveryQuery = db.collection('deliveries')
            .where('worryId', '==', scan.worryId)
            .where('recipientUid', '==', recipient.uid)
            .limit(1);
          const previousPasserQuery = db.collection('deliveries')
            .where('worryId', '==', scan.worryId)
            .where('passerUid', '==', recipient.uid)
            .limit(1);
          const previousReplyQuery = db.collection('replies')
            .where('worryId', '==', scan.worryId)
            .where('replierUid', '==', recipient.uid)
            .limit(1);
          const recipientDoc = await transaction.get(recipientRef);
          const deliveryDoc = await transaction.get(deliveryRef);
          if (!recipientDoc.exists || deliveryDoc.exists) continue;
          if (!await queryIsEmpty(transaction, previousDeliveryQuery)) continue;
          if (!await queryIsEmpty(transaction, previousPasserQuery)) continue;
          if (!await queryIsEmpty(transaction, previousReplyQuery)) continue;
          const candidate = userDocToCandidate(recipient.uid, recipientDoc.data());
          if (!hasValidRematchProfile(candidate) || !isEligibleHumanCandidate(candidate, scan.author.uid)) continue;
          selected.push(recipient);
        }

        if (selected.length === 0) {
          return { status: 'candidate_unavailable' as const, worryId: scan.worryId, deliveryIds: [], recipientUids: [], createdCount: 0 };
        }

        const batchId = `${scan.worryId}_rematch_${nextRound}`;
        const batch = buildBatch({
          id: batchId,
          runId,
          now,
          worryId: scan.worryId,
          sourceBatch,
          recipients: selected,
          targetCount,
        });
        const deliveries = selected.map((recipient, index) => buildDelivery({
          batchId,
          runId,
          now,
          worryId: scan.worryId,
          authorUid: scan.author.uid,
          authorGender: scan.author.gender,
          recipient: { ...recipient, slotIndex: index },
          batchRound: nextRound,
          rematchEligibleAfter,
          matchingCategories: scan.matchingCategories,
        }));

        transaction.set(db.collection('deliveryBatches').doc(batch.id), withoutId(batch));
        for (const delivery of deliveries) {
          transaction.set(db.collection('deliveries').doc(delivery.id), withoutId(delivery));
          transaction.update(db.collection('users').doc(delivery.recipientUid), {
            activeDeliveryCount: FieldValue.increment(1),
          });
        }
        transaction.update(worryRef, {
          humanDeliveryCount: currentHumanCount + deliveries.length,
          lastDeliveryCreatedAt: now,
          lastRematchRunId: runId,
          lastRematchBatchId: batch.id,
          lastRematchCreatedAt: now,
          updatedAt: now,
        });

        return {
          status: 'created' as const,
          worryId: scan.worryId,
          batchId: batch.id,
          deliveryIds: deliveries.map(delivery => delivery.id),
          recipientUids: deliveries.map(delivery => delivery.recipientUid),
          createdCount: deliveries.length,
        };
      });
    },
  };
}
