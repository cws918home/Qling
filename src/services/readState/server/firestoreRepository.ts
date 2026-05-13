import {
  FieldValue,
  type Firestore,
} from 'firebase-admin/firestore';
import type { ReadStateRepository } from './types';

function buildError(code: string) {
  return new Error(code);
}

function dataOrThrow(snapshot: FirebaseFirestore.DocumentSnapshot): FirebaseFirestore.DocumentData {
  const data = snapshot.data();
  if (!data) throw buildError('missing_snapshot_data');
  return data;
}

export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

export function createReadStateRepository(params: {
  db: Firestore;
}): ReadStateRepository {
  const { db } = params;

  return {
    async markDeliveryRead({ recipientUid, deliveryId }) {
      return db.runTransaction(async transaction => {
        const deliveryRef = db.collection('deliveries').doc(deliveryId);
        const readStateRef = db
          .collection('users')
          .doc(recipientUid)
          .collection('deliveryReadStates')
          .doc(deliveryId);

        const deliveryDoc = await transaction.get(deliveryRef);
        const readStateDoc = await transaction.get(readStateRef);

        if (!deliveryDoc.exists) {
          throw buildError('delivery_missing');
        }

        const delivery = dataOrThrow(deliveryDoc);
        if (delivery.recipientUid !== recipientUid) {
          throw buildError('not_delivery_recipient');
        }

        if (delivery.status === 'hidden' || delivery.hiddenAt) {
          throw buildError('delivery_hidden');
        }

        const existing = readStateDoc.data();
        if (readStateDoc.exists && existing?.readAt) {
          return {
            status: 'read' as const,
            deliveryId,
            readAt: existing.readAt,
            idempotent: true as const,
          };
        }

        const worryId = typeof delivery.worryId === 'string' ? delivery.worryId : '';
        const timestamp = serverTimestamp();
        transaction.set(readStateRef, {
          deliveryId,
          worryId,
          recipientUid,
          readAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        }, { merge: true });

        return {
          status: 'read' as const,
          deliveryId,
          readAt: timestamp,
        };
      });
    },

    async markRepliesForWorryRead({ authorUid, worryId, replyIds }) {
      return db.runTransaction(async transaction => {
        const worryRef = db.collection('worries').doc(worryId);
        const worryDoc = await transaction.get(worryRef);

        if (!worryDoc.exists) {
          throw buildError('worry_missing');
        }

        const worry = dataOrThrow(worryDoc);
        if (worry.authorUid !== authorUid) {
          throw buildError('not_worry_author');
        }

        const requestedReplyIds = replyIds
          ? [...new Set(replyIds)]
          : null;
        const replyRefs = requestedReplyIds
          ? requestedReplyIds.map(replyId => db.collection('replies').doc(replyId))
          : null;
        const replyDocs = replyRefs
          ? await Promise.all(replyRefs.map(replyRef => transaction.get(replyRef)))
          : (await transaction.get(
            db.collection('replies')
              .where('worryId', '==', worryId)
              .where('authorUid', '==', authorUid)
          )).docs;

        const replyIdsToMark: string[] = [];
        for (const replyDoc of replyDocs) {
          if (!replyDoc.exists) {
            throw buildError('reply_missing');
          }

          const reply = dataOrThrow(replyDoc);
          if (reply.worryId !== worryId || reply.authorUid !== authorUid) {
            throw buildError('reply_not_for_worry_author');
          }

          if (!requestedReplyIds && (reply.status === 'hidden' || reply.hiddenAt)) {
            continue;
          }

          replyIdsToMark.push(replyDoc.id);
        }

        const readStateRefs = replyIdsToMark.map(replyId => db
          .collection('users')
          .doc(authorUid)
          .collection('replyReadStates')
          .doc(replyId));
        const readStateDocs = await Promise.all(readStateRefs.map(readStateRef => transaction.get(readStateRef)));
        const timestamp = serverTimestamp();
        let markedCount = 0;

        readStateDocs.forEach((readStateDoc, index) => {
          if (readStateDoc.exists && readStateDoc.data()?.readByAuthorAt) {
            return;
          }

          const replyId = replyIdsToMark[index];
          transaction.set(readStateRefs[index], {
            replyId,
            worryId,
            authorUid,
            readByAuthorAt: timestamp,
            createdAt: timestamp,
            updatedAt: timestamp,
          }, { merge: true });
          markedCount += 1;
        });

        return {
          status: 'read' as const,
          worryId,
          markedCount,
        };
      });
    },
  };
}
