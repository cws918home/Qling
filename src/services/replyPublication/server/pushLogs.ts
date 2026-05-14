import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { sendNewReplyNotificationAfterCommit } from '../../notifications';

export async function sendNewReplyPushAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  reply: { id: string; authorUid: string };
}): Promise<void> {
  await sendNewReplyNotificationAfterCommit({
    db: params.db,
    messaging: params.messaging,
    targetUid: params.reply.authorUid,
    sourceId: params.reply.id,
  });
}
