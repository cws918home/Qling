import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { sendNewWorryNotificationAfterCommit } from '../../notifications';

export async function sendNewWorryPushesAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  deliveries: Array<{ deliveryId: string; recipientUid: string; worryId: string }>;
  now?: () => Date;
}): Promise<void> {
  for (const delivery of params.deliveries) {
    await sendNewWorryNotificationAfterCommit({
      db: params.db,
      messaging: params.messaging,
      targetUid: delivery.recipientUid,
      sourceId: delivery.deliveryId,
      sourceType: 'delivery',
    });
  }
}
