import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { sendNewWorryNotificationAfterCommit } from '../notifications';

export async function sendReplacementPushAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  deliveryId: string;
  recipientUid: string;
}): Promise<{
  status: 'sent' | 'failed' | 'skipped_no_token';
  logIds: string[];
  warnings: string[];
}> {
  const result = await sendNewWorryNotificationAfterCommit({
    db: params.db,
    messaging: params.messaging,
    targetUid: params.recipientUid,
    sourceId: params.deliveryId,
    sourceType: 'delivery',
    sourceReason: 'pass_replacement',
  });

  return {
    status: result.status === 'sent' || result.status === 'skipped_no_token' ? result.status : 'failed',
    logIds: result.logIds,
    warnings: result.warnings.map(warning => warning === 'new_worry_push_failed' ? 'replacement_push_failed' : warning),
  };
}
