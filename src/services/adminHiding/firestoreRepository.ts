import {
  FieldValue,
  type Firestore,
} from 'firebase-admin/firestore';
import { buildHiddenFields, isAlreadyHidden, nextActiveDeliveryCount } from './policy';
import type {
  AdminHidingRepository,
  AdminHideTargetType,
  HideContentResult,
} from './types';

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

function buildError(code: string) {
  return new Error(code);
}

function dataOrThrow(snapshot: FirebaseFirestore.DocumentSnapshot, code: string) {
  const data = snapshot.data();
  if (!snapshot.exists || !data) throw buildError(code);
  return data;
}

function hiddenResult(params: {
  targetType: AdminHideTargetType;
  targetId: string;
  alreadyHidden: boolean;
  counterDecremented?: boolean;
}): HideContentResult {
  return {
    status: 'hidden',
    targetType: params.targetType,
    targetId: params.targetId,
    alreadyHidden: params.alreadyHidden,
    counterDecremented: params.counterDecremented ?? false,
  };
}

export function createAdminHidingRepository(params: {
  db: Firestore;
}): AdminHidingRepository {
  const { db } = params;

  return {
    async hideWorry({ targetId, hiddenReason, hiddenBy }) {
      return db.runTransaction(async transaction => {
        const worryRef = db.collection('worries').doc(targetId);
        const worryDoc = await transaction.get(worryRef);
        const worry = dataOrThrow(worryDoc, 'target_missing');
        if (isAlreadyHidden(worry)) {
          return hiddenResult({ targetType: 'worry', targetId, alreadyHidden: true });
        }

        transaction.update(worryRef, buildHiddenFields({
          hiddenReason,
          hiddenBy,
          timestamp: serverTimestamp(),
        }));
        return hiddenResult({ targetType: 'worry', targetId, alreadyHidden: false });
      });
    },

    async hideDelivery({ targetId, hiddenReason, hiddenBy }) {
      return db.runTransaction(async transaction => {
        const deliveryRef = db.collection('deliveries').doc(targetId);
        const deliveryDoc = await transaction.get(deliveryRef);
        const delivery = dataOrThrow(deliveryDoc, 'target_missing');
        if (isAlreadyHidden(delivery)) {
          return hiddenResult({ targetType: 'delivery', targetId, alreadyHidden: true });
        }

        const timestamp = serverTimestamp();
        if (delivery.status !== 'active') {
          transaction.update(deliveryRef, buildHiddenFields({ hiddenReason, hiddenBy, timestamp }));
          return hiddenResult({ targetType: 'delivery', targetId, alreadyHidden: false });
        }

        if (typeof delivery.recipientUid !== 'string' || delivery.recipientUid.length === 0) {
          throw buildError('delivery_malformed');
        }

        const recipientRef = db.collection('users').doc(delivery.recipientUid);
        const recipientDoc = await transaction.get(recipientRef);
        const recipient = dataOrThrow(recipientDoc, 'recipient_missing');
        if (typeof recipient.activeDeliveryCount !== 'number' || !Number.isFinite(recipient.activeDeliveryCount)) {
          throw buildError('recipient_counter_malformed');
        }

        const nextCounter = nextActiveDeliveryCount(recipient.activeDeliveryCount);
        transaction.update(deliveryRef, buildHiddenFields({ hiddenReason, hiddenBy, timestamp }));
        transaction.update(recipientRef, {
          activeDeliveryCount: nextCounter.value,
        });

        return hiddenResult({
          targetType: 'delivery',
          targetId,
          alreadyHidden: false,
          counterDecremented: nextCounter.decremented,
        });
      });
    },

    async hideReply({ targetId, hiddenReason, hiddenBy }) {
      return db.runTransaction(async transaction => {
        const replyRef = db.collection('replies').doc(targetId);
        const replyDoc = await transaction.get(replyRef);
        const reply = dataOrThrow(replyDoc, 'target_missing');
        if (isAlreadyHidden(reply)) {
          return hiddenResult({ targetType: 'reply', targetId, alreadyHidden: true });
        }

        transaction.update(replyRef, buildHiddenFields({
          hiddenReason,
          hiddenBy,
          timestamp: serverTimestamp(),
        }));
        return hiddenResult({ targetType: 'reply', targetId, alreadyHidden: false });
      });
    },
  };
}
