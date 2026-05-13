import {
  FieldValue,
  Timestamp,
  type Firestore,
} from 'firebase-admin/firestore';
import { createExampleFeedbackRunAfter } from './policy';
import { adaptActiveExampleWorrySeed } from './seedAdapter';
import type {
  CreateExamplesForUserResult,
  ExampleDeliveryWriteModel,
  ExampleFeedbackJobResult,
  ExampleWorriesRepository,
  ExampleWorryWriteModel,
  SelectedExampleSeed,
} from './types';

const EXAMPLE_AUTHOR_UID = 'example_author';

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
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export function exampleWorryId(uid: string, seedId: string): string {
  return `example_${uid}_${seedId}`;
}

export function exampleDeliveryId(uid: string, seedId: string): string {
  return `${exampleWorryId(uid, seedId)}_${uid}`;
}

export function exampleFeedbackJobId(replyId: string): string {
  return replyId;
}

export function buildExampleFeedbackJob(params: {
  replyId: string;
  targetUid: string;
  submittedAt: Date;
  now: unknown;
}) {
  return {
    id: exampleFeedbackJobId(params.replyId),
    kind: 'example_like' as const,
    runAfter: createExampleFeedbackRunAfter({ submittedAt: params.submittedAt }),
    status: 'scheduled' as const,
    replyId: params.replyId,
    targetUid: params.targetUid,
    attempts: 0,
    createdAt: params.now,
    updatedAt: params.now,
  };
}

function buildExampleWorry(params: {
  uid: string;
  seed: SelectedExampleSeed;
  timestamp: unknown;
}): ExampleWorryWriteModel {
  const worryId = exampleWorryId(params.uid, params.seed.id);
  return {
    id: worryId,
    authorUid: EXAMPLE_AUTHOR_UID,
    content: params.seed.content,
    refinedContent: params.seed.content,
    categories: [...params.seed.categories],
    rawCategories: [...params.seed.categories],
    validCategories: [...params.seed.categories],
    invalidCategories: [],
    matchingCategories: [...params.seed.categories],
    status: 'active',
    isExample: true,
    exampleSeedId: params.seed.id,
    exampleOwnerUid: params.uid,
    sourceSeedId: params.seed.id,
    humanDeliveryLimit: 0,
    humanDeliveryCount: 0,
    humanReplyCount: 0,
    hasHumanReply: false,
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

function buildExampleDelivery(params: {
  uid: string;
  seed: SelectedExampleSeed;
  user: FirebaseFirestore.DocumentData;
  timestamp: unknown;
}): ExampleDeliveryWriteModel {
  const worryId = exampleWorryId(params.uid, params.seed.id);
  return {
    id: exampleDeliveryId(params.uid, params.seed.id),
    worryId,
    recipientUid: params.uid,
    authorUid: EXAMPLE_AUTHOR_UID,
    status: 'active',
    answeredAt: null,
    passedAt: null,
    answerableUntil: null,
    isExample: true,
    exampleSeedId: params.seed.id,
    sourceSeedId: params.seed.id,
    selectionType: 'example',
    batchId: `${params.uid}_examples`,
    batchRound: 0,
    slotIndex: params.seed.selectionIndex,
    matchOverlapCount: params.seed.categories.filter(category => stringArray(params.user.interests).includes(category)).length,
    matchCategoriesSnapshot: [...params.seed.categories],
    recipientInterestsSnapshot: stringArray(params.user.interests),
    recipientGenderSnapshot: typeof params.user.gender === 'string' ? params.user.gender : null,
    recipientHelpedCountSnapshot: typeof params.user.helpedCount === 'number' ? params.user.helpedCount : 0,
    authorGenderSnapshot: 'example',
    isAiRecipient: false,
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

export function createExampleWorriesFirestoreRepository(params: {
  db: Firestore;
}): ExampleWorriesRepository {
  const { db } = params;

  return {
    async readUserProfile(uid) {
      const doc = await db.collection('users').doc(uid).get();
      if (!doc.exists) return null;
      const data = doc.data() ?? {};
      return {
        uid,
        interests: stringArray(data.interests),
        gender: typeof data.gender === 'string' ? data.gender : null,
        helpedCount: typeof data.helpedCount === 'number' ? data.helpedCount : undefined,
        exampleWorriesCreatedAt: data.exampleWorriesCreatedAt,
        exampleWorrySeedIds: stringArray(data.exampleWorrySeedIds),
        exampleDeliveryIds: stringArray(data.exampleDeliveryIds),
      };
    },

    async listSelectableSeeds() {
      const snap = await db.collection('exampleWorrySeeds').where('status', '==', 'active').get();
      return snap.docs
        .map(doc => adaptActiveExampleWorrySeed(doc.id, doc.data()))
        .filter((seed): seed is NonNullable<typeof seed> => Boolean(seed));
    },

    async createExamplesOnce({ uid, seeds }) {
      return db.runTransaction(async transaction => {
        const userRef = db.collection('users').doc(uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error('profile_missing');
        const user = userDoc.data() ?? {};

        if (user.exampleWorriesCreatedAt) {
          return {
            status: 'idempotent' as const,
            uid,
            worryIds: seeds.map(seed => exampleWorryId(uid, seed.id)),
            deliveryIds: stringArray(user.exampleDeliveryIds),
            seedIds: stringArray(user.exampleWorrySeedIds),
          };
        }

        const timestamp = FieldValue.serverTimestamp();
        const worries = seeds.map(seed => buildExampleWorry({ uid, seed, timestamp }));
        const deliveries = seeds.map(seed => buildExampleDelivery({ uid, seed, user, timestamp }));

        for (const worry of worries) {
          transaction.set(db.collection('worries').doc(worry.id), withoutId(worry));
        }
        for (const delivery of deliveries) {
          transaction.set(db.collection('deliveries').doc(delivery.id), withoutId(delivery));
        }
        transaction.set(userRef, {
          onboardingCompletedAt: timestamp,
          exampleWorriesCreatedAt: timestamp,
          exampleWorrySeedIds: seeds.map(seed => seed.id),
          exampleDeliveryIds: deliveries.map(delivery => delivery.id),
          updatedAt: timestamp,
        }, { merge: true });

        return {
          status: 'created' as const,
          uid,
          worryIds: worries.map(worry => worry.id),
          deliveryIds: deliveries.map(delivery => delivery.id),
          seedIds: seeds.map(seed => seed.id),
        };
      }) as Promise<Extract<CreateExamplesForUserResult, { status: 'created' | 'idempotent' }>>;
    },

    async listDueFeedbackJobs({ now, limit }) {
      const snap = await db.collection('exampleFeedbackJobs')
        .where('kind', '==', 'example_like')
        .where('status', '==', 'scheduled')
        .where('runAfter', '<=', now)
        .limit(limit)
        .get();
      return snap.docs.map(doc => ({
        id: doc.id,
        replyId: typeof doc.data().replyId === 'string' ? doc.data().replyId : doc.id,
      }));
    },

    async processFeedbackJob({ jobId, now }): Promise<ExampleFeedbackJobResult> {
      return db.runTransaction(async transaction => {
        const jobRef = db.collection('exampleFeedbackJobs').doc(jobId);
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists) {
          return { jobId, replyId: jobId, status: 'skipped', reason: 'job_missing' };
        }
        const job = jobDoc.data() ?? {};
        const replyId = typeof job.replyId === 'string' ? job.replyId : jobId;
        const feedbackId = replyId;
        if (job.status === 'completed') {
          return { jobId, replyId, status: 'idempotent', feedbackId: typeof job.feedbackId === 'string' ? job.feedbackId : feedbackId };
        }
        if (job.status !== 'scheduled') {
          return { jobId, replyId, status: 'skipped', reason: 'job_not_scheduled' };
        }
        const runAfter = toDate(job.runAfter);
        if (!runAfter || runAfter.getTime() > now.getTime()) {
          return { jobId, replyId, status: 'skipped', reason: 'job_not_due' };
        }

        const replyRef = db.collection('replies').doc(replyId);
        const feedbackRef = db.collection('feedbacks').doc(feedbackId);
        const [replyDoc, feedbackDoc] = await Promise.all([
          transaction.get(replyRef),
          transaction.get(feedbackRef),
        ]);

        if (feedbackDoc.exists) {
          const feedback = feedbackDoc.data() ?? {};
          if (
            feedback.type === 'like'
            && feedback.comment === null
            && feedback.helpedCountApplied === true
            && feedback.isForExampleReply === true
          ) {
            transaction.set(jobRef, {
              status: 'completed',
              completedAt: now,
              feedbackId,
              updatedAt: now,
              error: null,
            }, { merge: true });
            return { jobId, replyId, status: 'idempotent', feedbackId };
          }
          transaction.set(jobRef, {
            status: 'skipped',
            updatedAt: now,
            error: 'feedback_conflict',
          }, { merge: true });
          return { jobId, replyId, status: 'skipped', reason: 'feedback_conflict' };
        }

        if (!replyDoc.exists) {
          transaction.set(jobRef, { status: 'skipped', updatedAt: now, error: 'reply_missing' }, { merge: true });
          return { jobId, replyId, status: 'skipped', reason: 'reply_missing' };
        }
        const reply = replyDoc.data() ?? {};
        const replierUid = typeof reply.replierUid === 'string' && reply.replierUid.trim() ? reply.replierUid : null;
        if (
          reply.isExampleReply !== true
          || reply.isAiGenerated === true
          || reply.status !== 'active'
          || !replierUid
        ) {
          transaction.set(jobRef, { status: 'skipped', updatedAt: now, error: 'reply_ineligible' }, { merge: true });
          return { jobId, replyId, status: 'skipped', reason: 'reply_ineligible' };
        }

        const feedback = {
          replyId,
          worryId: reply.worryId,
          deliveryId: reply.deliveryId,
          publisherUid: EXAMPLE_AUTHOR_UID,
          replierUid,
          type: 'like',
          comment: null,
          commentVisibility: 'none',
          commentModerationLogId: null,
          helpedCountApplied: true,
          isForAiReply: false,
          isForExampleReply: true,
          createdAt: now,
          updatedAt: now,
        };

        transaction.set(feedbackRef, feedback);
        transaction.update(replyRef, {
          feedbackType: 'like',
          likedAt: now,
          updatedAt: now,
        });
        transaction.set(db.collection('users').doc(replierUid), {
          helpedCount: FieldValue.increment(1),
        }, { merge: true });
        transaction.set(jobRef, {
          status: 'completed',
          completedAt: now,
          feedbackId,
          attempts: FieldValue.increment(1),
          updatedAt: now,
          error: null,
        }, { merge: true });
        return { jobId, replyId, status: 'completed', feedbackId };
      });
    },
  };
}
