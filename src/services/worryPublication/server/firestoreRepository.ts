import {
  FieldValue,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import type {
  CommittedInitialWorryPublication,
  DeliveryBatchWriteModel,
  DeliveryWriteModel,
  InitialWorryPublicationRepository,
  ModerationLogWriteModel,
  Phase1HumanCandidate,
  RecipientEligibilitySnapshot,
  WorryWriteModel,
} from './types';
import {
  isEligiblePhase1HumanCandidate,
} from './recipientSelection';

function withoutId<T extends { id: string }>(model: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = model;
  return rest;
}

function userDocToCandidate(uid: string, data: FirebaseFirestore.DocumentData | undefined): Phase1HumanCandidate {
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

function assertUniqueSelectedRecipients(selectedRecipientUids: string[]) {
  if (new Set(selectedRecipientUids).size !== selectedRecipientUids.length) {
    throw new Error('duplicate_recipient');
  }
}

async function assertDeliveryDoesNotExist(
  transaction: Transaction,
  db: Firestore,
  delivery: DeliveryWriteModel
) {
  const deliveryRef = db.collection('deliveries').doc(delivery.id);
  const deliveryDoc = await transaction.get(deliveryRef);
  if (deliveryDoc.exists) {
    throw new Error('duplicate_delivery');
  }
}

export function createInitialWorryPublicationRepository(params: {
  db: Firestore;
}): InitialWorryPublicationRepository {
  const { db } = params;

  return {
    createIds() {
      return {
        worryId: db.collection('worries').doc().id,
        batchId: db.collection('deliveryBatches').doc().id,
        moderationLogId: db.collection('moderationLogs').doc().id,
      };
    },

    async fetchRecipientCandidates() {
      const snap = await db.collection('users').get();
      return snap.docs.map(doc => userDocToCandidate(doc.id, doc.data()));
    },

    async commitRejectedWorryModeration({ moderationLog }) {
      await db.collection('moderationLogs').doc(moderationLog.id).set(withoutId(moderationLog));
      return {
        moderationLogId: moderationLog.id,
        targetId: moderationLog.targetId,
      };
    },

    async commitInitialWorryPublication(params) {
      const {
        worry,
        moderationLog,
        batch,
        deliveries,
        selectedRecipientUids,
      } = params;

      assertUniqueSelectedRecipients(selectedRecipientUids);

      await db.runTransaction(async transaction => {
        for (const delivery of deliveries) {
          await assertDeliveryDoesNotExist(transaction, db, delivery);
        }

        for (const recipientUid of selectedRecipientUids) {
          const recipientRef = db.collection('users').doc(recipientUid);
          const recipientDoc = await transaction.get(recipientRef);
          if (!recipientDoc.exists) {
            throw new Error('recipient_missing');
          }

          const candidate = userDocToCandidate(recipientUid, recipientDoc.data());
          if (!isEligiblePhase1HumanCandidate(candidate, worry.authorUid)) {
            throw new Error('recipient_ineligible');
          }
        }

        transaction.set(
          db.collection('moderationLogs').doc(moderationLog.id),
          withoutId(moderationLog)
        );
        transaction.set(db.collection('worries').doc(worry.id), withoutId(worry));
        transaction.set(db.collection('deliveryBatches').doc(batch.id), withoutId(batch));

        for (const delivery of deliveries) {
          transaction.set(db.collection('deliveries').doc(delivery.id), withoutId(delivery));
        }

        for (const recipientUid of selectedRecipientUids) {
          transaction.update(db.collection('users').doc(recipientUid), {
            activeDeliveryCount: FieldValue.increment(1),
          });
        }
      });

      return {
        worryId: worry.id,
        deliveryIds: deliveries.map(delivery => delivery.id),
        moderationLogId: moderationLog.id,
      };
    },
  };
}

export function buildRecipientEligibilitySnapshot(
  recipients: Array<{ uid: string; activeDeliveryCount: number }>
): RecipientEligibilitySnapshot[] {
  return recipients.map(recipient => ({
    uid: recipient.uid,
    activeDeliveryCount: recipient.activeDeliveryCount,
  }));
}

export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}
