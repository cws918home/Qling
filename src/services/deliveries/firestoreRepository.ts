import {
  FieldValue,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import type {
  DeliveryPassInternalResult,
  DeliveryPassRepository,
  PassReplacementAttemptWriteModel,
  PassReplacementDeliveryWriteModel,
} from './types';
import type { HumanCandidate, RankedHumanCandidate } from '../matching/server/recipientPolicy';
import { isEligibleHumanCandidate } from '../matching/server/recipientPolicy';

function withoutId<T extends { id: string }>(model: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = model;
  return rest;
}

function buildError(code: string) {
  return new Error(code);
}

function snapshotData(snapshot: FirebaseFirestore.DocumentSnapshot): FirebaseFirestore.DocumentData {
  const data = snapshot.data();
  if (!data) throw buildError('missing_snapshot_data');
  return data;
}

function userDocToCandidate(uid: string, data: FirebaseFirestore.DocumentData | undefined): HumanCandidate {
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function assertString(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.length === 0) throw buildError(code);
  return value;
}

function deliveryHasTerminalTimestamp(delivery: FirebaseFirestore.DocumentData): boolean {
  return Boolean(delivery.answeredAt || delivery.passedAt);
}

function isHiddenWorry(worry: FirebaseFirestore.DocumentData): boolean {
  return worry.status === 'hidden' || Boolean(worry.hiddenAt);
}

function queryIsEmpty(snapshot: FirebaseFirestore.QuerySnapshot): boolean {
  return snapshot.empty || snapshot.docs.length === 0;
}

function countHumanDeliveries(snapshot: FirebaseFirestore.QuerySnapshot): number {
  return snapshot.docs.filter(doc => doc.data().isAiRecipient !== true).length;
}

function replacementDelivery(params: {
  passedDeliveryId: string;
  worryId: string;
  authorUid: string;
  authorGender: string;
  recipient: RankedHumanCandidate;
  timestamp: unknown;
}): PassReplacementDeliveryWriteModel {
  return {
    id: `${params.worryId}_${params.recipient.uid}`,
    worryId: params.worryId,
    recipientUid: params.recipient.uid,
    authorUid: params.authorUid,
    status: 'active',
    answeredAt: null,
    passedAt: null,
    answerableUntil: null,
    batchId: null,
    batchRound: null,
    selectionType: 'matched',
    matchOverlapCount: params.recipient.matchOverlapCount,
    matchCategoriesSnapshot: [],
    recipientInterestsSnapshot: [...params.recipient.interests],
    recipientGenderSnapshot: params.recipient.gender,
    recipientHelpedCountSnapshot: params.recipient.helpedCount,
    authorGenderSnapshot: params.authorGender,
    isAiRecipient: false,
    createdByPassDeliveryId: params.passedDeliveryId,
    replacementForDeliveryId: params.passedDeliveryId,
    replacementReason: 'pass',
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

function attemptForCreated(params: {
  deliveryId: string;
  worryId: string;
  passerUid: string;
  authorUid: string;
  selectedRecipientUid: string;
  createdDeliveryId: string;
  timestamp: unknown;
}): PassReplacementAttemptWriteModel {
  return {
    id: params.deliveryId,
    passedDeliveryId: params.deliveryId,
    worryId: params.worryId,
    passerUid: params.passerUid,
    authorUid: params.authorUid,
    status: 'created',
    selectedRecipientUid: params.selectedRecipientUid,
    createdDeliveryId: params.createdDeliveryId,
    replacementReason: 'pass',
    replacementPushStatus: 'pending',
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

function attemptForShortfall(params: {
  deliveryId: string;
  worryId: string;
  passerUid: string;
  authorUid: string;
  timestamp: unknown;
}): PassReplacementAttemptWriteModel {
  return {
    id: params.deliveryId,
    passedDeliveryId: params.deliveryId,
    worryId: params.worryId,
    passerUid: params.passerUid,
    authorUid: params.authorUid,
    status: 'shortfall',
    replacementReason: 'pass',
    shortfallReason: 'no_eligible_recipient',
    replacementPushStatus: 'skipped_no_token',
    createdAt: params.timestamp,
    updatedAt: params.timestamp,
  };
}

async function getOwnedWorry(
  transaction: Transaction,
  db: Firestore,
  delivery: FirebaseFirestore.DocumentData
) {
  const worryId = assertString(delivery.worryId, 'delivery_malformed');
  const authorUid = assertString(delivery.authorUid, 'delivery_malformed');
  const worryRef = db.collection('worries').doc(worryId);
  const worryDoc = await transaction.get(worryRef);
  if (!worryDoc.exists) throw buildError('worry_missing');
  const worry = snapshotData(worryDoc);
  if (worry.authorUid !== authorUid) throw buildError('delivery_malformed');
  if (isHiddenWorry(worry)) throw buildError('worry_hidden');
  return { worryRef, worryId, authorUid, worry };
}

function resultFromAttempt(deliveryId: string, attempt: FirebaseFirestore.DocumentData): DeliveryPassInternalResult {
  if (attempt.status === 'created') {
    return {
      status: 'passed',
      deliveryId,
      replacementDeliveryId: typeof attempt.createdDeliveryId === 'string' ? attempt.createdDeliveryId : undefined,
      replacementStatus: 'created',
      attemptId: deliveryId,
      warnings: [],
    };
  }

  if (attempt.status === 'shortfall') {
    return {
      status: 'passed',
      deliveryId,
      replacementStatus: 'shortfall',
      attemptId: deliveryId,
      warnings: [],
    };
  }

  throw buildError('attempt_malformed');
}

export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

export function createDeliveryPassRepository(params: {
  db: Firestore;
}): DeliveryPassRepository {
  const { db } = params;

  return {
    async fetchReplacementScan({ deliveryId }) {
      const deliveryDoc = await db.collection('deliveries').doc(deliveryId).get();
      if (!deliveryDoc.exists) {
        return {
          candidates: [],
          excludedUids: new Set<string>(),
          existingHumanDeliveryCount: 0,
          replierUids: new Set<string>(),
          author: { uid: '', gender: '' },
          matchingCategories: [],
        };
      }

      const delivery = snapshotData(deliveryDoc);
      const worryId = typeof delivery.worryId === 'string' ? delivery.worryId : '';
      const authorUid = typeof delivery.authorUid === 'string' ? delivery.authorUid : '';
      const [worryDoc, authorDoc, usersSnap, deliveriesSnap, repliesSnap] = await Promise.all([
        worryId ? db.collection('worries').doc(worryId).get() : Promise.resolve(null),
        authorUid ? db.collection('users').doc(authorUid).get() : Promise.resolve(null),
        db.collection('users').get(),
        db.collection('deliveries').where('worryId', '==', worryId).get(),
        db.collection('replies').where('worryId', '==', worryId).get(),
      ]);

      const excludedUids = new Set<string>();
      let existingHumanDeliveryCount = 0;
      for (const doc of deliveriesSnap.docs) {
        const data = doc.data();
        if (typeof data.recipientUid === 'string') excludedUids.add(data.recipientUid);
        if (typeof data.passerUid === 'string') excludedUids.add(data.passerUid);
        if (data.status === 'passed' && typeof data.recipientUid === 'string') excludedUids.add(data.recipientUid);
        if (data.isAiRecipient !== true) existingHumanDeliveryCount += 1;
      }

      const replierUids = new Set<string>();
      for (const doc of repliesSnap.docs) {
        const data = doc.data();
        if (typeof data.replierUid === 'string') {
          excludedUids.add(data.replierUid);
          replierUids.add(data.replierUid);
        }
      }

      if (typeof delivery.recipientUid === 'string') excludedUids.add(delivery.recipientUid);
      if (typeof delivery.authorUid === 'string') excludedUids.add(delivery.authorUid);

      return {
        candidates: usersSnap.docs.map(doc => userDocToCandidate(doc.id, doc.data())),
        excludedUids,
        existingHumanDeliveryCount,
        replierUids,
        author: {
          uid: authorUid,
          gender: typeof authorDoc?.data()?.gender === 'string' ? authorDoc.data()?.gender : '',
        },
        matchingCategories: stringArray(worryDoc?.data()?.matchingCategories),
      };
    },

    async commitPassDelivery({ uid, deliveryId, selectedRecipient, existingHumanDeliveryCount }) {
      return db.runTransaction(async transaction => {
        const timestamp = serverTimestamp();
        const deliveryRef = db.collection('deliveries').doc(deliveryId);
        const attemptRef = db.collection('passReplacementAttempts').doc(deliveryId);
        const deliveryDoc = await transaction.get(deliveryRef);
        const attemptDoc = await transaction.get(attemptRef);

        if (!deliveryDoc.exists) throw buildError('delivery_missing');
        const delivery = snapshotData(deliveryDoc);
        if (delivery.recipientUid !== uid) throw buildError('not_delivery_recipient');

        if (delivery.status === 'passed') {
          if (!attemptDoc.exists) {
            return {
              status: 'passed' as const,
              deliveryId,
              replacementStatus: 'not_applicable' as const,
              warnings: ['passed_without_attempt_record'],
            };
          }
          return resultFromAttempt(deliveryId, snapshotData(attemptDoc));
        }

        if (attemptDoc.exists) throw buildError('active_delivery_has_attempt');
        if (delivery.status === 'hidden' || delivery.hiddenAt) throw buildError('delivery_hidden');
        if (delivery.status !== 'active') throw buildError('delivery_not_active');
        if (deliveryHasTerminalTimestamp(delivery)) throw buildError('delivery_terminal_timestamp');

        const { worryRef, worryId, authorUid, worry } = await getOwnedWorry(transaction, db, delivery);
        const passerUserRef = db.collection('users').doc(uid);
        const passerUserDoc = await transaction.get(passerUserRef);
        const deliveriesForWorryQuery = db.collection('deliveries').where('worryId', '==', worryId);
        const deliveriesForWorryDoc = await transaction.get(deliveriesForWorryQuery);

        const humanDeliveryLimit = typeof worry.humanDeliveryLimit === 'number' ? worry.humanDeliveryLimit : 15;
        const existingCount = typeof worry.humanDeliveryCount === 'number'
          ? worry.humanDeliveryCount
          : countHumanDeliveries(deliveriesForWorryDoc);
        const capExhausted = existingCount >= humanDeliveryLimit;
        if (!selectedRecipient || capExhausted) {
          const attempt = attemptForShortfall({ deliveryId, worryId, passerUid: uid, authorUid, timestamp });
          transaction.update(deliveryRef, {
            status: 'passed',
            passedAt: timestamp,
            updatedAt: timestamp,
          });
          transaction.set(attemptRef, withoutId(attempt));
          if (passerUserDoc.exists) {
            const activeDeliveryCount = typeof passerUserDoc.data()?.activeDeliveryCount === 'number'
              ? passerUserDoc.data()?.activeDeliveryCount
              : 0;
            transaction.update(passerUserRef, {
              activeDeliveryCount: Math.max(0, activeDeliveryCount - 1),
            });
          }
          return {
            status: 'passed' as const,
            deliveryId,
            replacementStatus: 'shortfall' as const,
            attemptId: deliveryId,
            warnings: passerUserDoc.exists ? [] : ['missing_passer_user_doc_counter_decrement_skipped'],
          };
        }

        const recipientRef = db.collection('users').doc(selectedRecipient.uid);
        const replacementRef = db.collection('deliveries').doc(`${worryId}_${selectedRecipient.uid}`);
        const candidateDeliveryQuery = db.collection('deliveries')
          .where('worryId', '==', worryId)
          .where('recipientUid', '==', selectedRecipient.uid)
          .limit(1);
        const candidatePasserQuery = db.collection('deliveries')
          .where('worryId', '==', worryId)
          .where('passerUid', '==', selectedRecipient.uid)
          .limit(1);
        const candidateReplyQuery = db.collection('replies')
          .where('worryId', '==', worryId)
          .where('replierUid', '==', selectedRecipient.uid)
          .limit(1);
        const recipientDoc = await transaction.get(recipientRef);
        const replacementDoc = await transaction.get(replacementRef);
        const candidateDeliveryDoc = await transaction.get(candidateDeliveryQuery);
        const candidatePasserDoc = await transaction.get(candidatePasserQuery);
        const candidateReplyDoc = await transaction.get(candidateReplyQuery);
        if (!recipientDoc.exists || replacementDoc.exists) return { status: 'candidate_unavailable' as const };
        if (selectedRecipient.uid === uid || selectedRecipient.uid === authorUid) return { status: 'candidate_unavailable' as const };
        if (!queryIsEmpty(candidateDeliveryDoc) || !queryIsEmpty(candidatePasserDoc) || !queryIsEmpty(candidateReplyDoc)) {
          return { status: 'candidate_unavailable' as const };
        }
        const candidate = userDocToCandidate(selectedRecipient.uid, recipientDoc.data());
        if (!isEligibleHumanCandidate(candidate, authorUid)) return { status: 'candidate_unavailable' as const };

        const authorGender = typeof worry.authorGenderSnapshot === 'string'
          ? worry.authorGenderSnapshot
          : (typeof worry.authorGender === 'string' ? worry.authorGender : '');
        const replacement = {
          ...replacementDelivery({
            passedDeliveryId: deliveryId,
            worryId,
            authorUid,
            authorGender,
            recipient: selectedRecipient,
            timestamp,
          }),
          matchCategoriesSnapshot: stringArray(worry.matchingCategories),
        };
        const attempt = attemptForCreated({
          deliveryId,
          worryId,
          passerUid: uid,
          authorUid,
          selectedRecipientUid: selectedRecipient.uid,
          createdDeliveryId: replacement.id,
          timestamp,
        });

        transaction.update(deliveryRef, {
          status: 'passed',
          passedAt: timestamp,
          updatedAt: timestamp,
        });
        transaction.set(attemptRef, withoutId(attempt));
        transaction.set(replacementRef, withoutId(replacement));
        transaction.update(recipientRef, {
          activeDeliveryCount: FieldValue.increment(1),
        });
        transaction.update(worryRef, {
          humanDeliveryCount: existingCount + 1,
          lastDeliveryCreatedAt: timestamp,
          updatedAt: timestamp,
        });
        if (passerUserDoc.exists) {
          const activeDeliveryCount = typeof passerUserDoc.data()?.activeDeliveryCount === 'number'
            ? passerUserDoc.data()?.activeDeliveryCount
            : 0;
          transaction.update(passerUserRef, {
            activeDeliveryCount: Math.max(0, activeDeliveryCount - 1),
          });
        }

        return {
          status: 'passed' as const,
          deliveryId,
          replacementDeliveryId: replacement.id,
          replacementStatus: 'created' as const,
          attemptId: deliveryId,
          warnings: passerUserDoc.exists ? [] : ['missing_passer_user_doc_counter_decrement_skipped'],
        };
      });
    },

    async markReplacementPushResult({ attemptId, status, logIds, warnings }) {
      await db.collection('passReplacementAttempts').doc(attemptId).set({
        replacementPushStatus: status,
        replacementPushLogIds: logIds,
        replacementPushWarnings: warnings,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    },
  };
}
