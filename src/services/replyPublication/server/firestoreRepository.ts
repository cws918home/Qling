import {
  FieldValue,
  type Firestore,
} from 'firebase-admin/firestore';
import type {
  ReplyModerationLogWriteModel,
  ReplyPublicationRepository,
  ReplyWriteModel,
} from './types';

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

export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

export function createReplyPublicationRepository(params: {
  db: Firestore;
}): ReplyPublicationRepository {
  const { db } = params;

  return {
    createIds() {
      return {
        moderationLogId: db.collection('moderationLogs').doc().id,
      };
    },

    async commitRejectedReplyModeration({ moderationLog }) {
      await db.collection('moderationLogs').doc(moderationLog.id).set(withoutId(moderationLog));
      return { moderationLogId: moderationLog.id };
    },

    async commitApprovedReplyPublication({ deliveryId, replierUid, content, moderationLog }) {
      return db.runTransaction(async transaction => {
        const deliveryRef = db.collection('deliveries').doc(deliveryId);
        const replyRef = db.collection('replies').doc(deliveryId);
        const deliveryDoc = await transaction.get(deliveryRef);
        const replyDoc = await transaction.get(replyRef);

        if (!deliveryDoc.exists) {
          throw buildError('delivery_missing');
        }

        const delivery = snapshotData(deliveryDoc);
        if (delivery.recipientUid !== replierUid) {
          throw buildError('not_delivery_recipient');
        }

        const worryId = typeof delivery.worryId === 'string' ? delivery.worryId : null;
        const authorUid = typeof delivery.authorUid === 'string' ? delivery.authorUid : null;
        if (!worryId || !authorUid) {
          throw buildError('delivery_missing');
        }

        const worryRef = db.collection('worries').doc(worryId);
        const worryDoc = await transaction.get(worryRef);
        const userRef = db.collection('users').doc(replierUid);
        const userDoc = await transaction.get(userRef);

        if (!worryDoc.exists) {
          throw buildError('worry_missing');
        }

        if (replyDoc.exists) {
          const reply = snapshotData(replyDoc) as ReplyWriteModel;
          if (
            reply.deliveryId === deliveryId
            && reply.replierUid === replierUid
            && reply.content === content
          ) {
            return { status: 'idempotent' as const, replyId: deliveryId, reply };
          }

          throw buildError('duplicate_reply');
        }

        if (delivery.status === 'hidden' || delivery.hiddenAt) {
          throw buildError('delivery_hidden');
        }

        if (delivery.status !== 'active' || delivery.answeredAt) {
          throw buildError('delivery_not_active');
        }

        const timestamp = serverTimestamp();
        const reply: ReplyWriteModel = {
          id: deliveryId,
          deliveryId,
          worryId,
          authorUid,
          replierUid,
          content,
          status: 'active',
          moderationLogId: moderationLog.id,
          createdAt: timestamp,
          updatedAt: timestamp,
          isAiGenerated: false,
          isExampleReply: false,
        };

        transaction.set(db.collection('moderationLogs').doc(moderationLog.id), withoutId(moderationLog));
        transaction.set(replyRef, withoutId(reply));
        transaction.update(deliveryRef, {
          status: 'answered',
          answeredAt: timestamp,
          updatedAt: timestamp,
        });
        transaction.update(worryRef, {
          humanReplyCount: FieldValue.increment(1),
          hasHumanReply: true,
          lastHumanReplyAt: timestamp,
          updatedAt: timestamp,
        });

        const activeDeliveryCount = typeof userDoc.data()?.activeDeliveryCount === 'number'
          ? userDoc.data()?.activeDeliveryCount
          : 0;
        transaction.set(userRef, {
          activeDeliveryCount: Math.max(0, activeDeliveryCount - 1),
        }, { merge: true });

        return { status: 'created' as const, replyId: deliveryId, reply };
      });
    },
  };
}
