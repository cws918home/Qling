import {
  FieldValue,
  type Firestore,
} from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';

function summarizeToken(token: string) {
  return token.length <= 18
    ? token
    : `${token.slice(0, 12)}...${token.slice(-6)}`;
}

async function writePushLog(params: {
  db: Firestore;
  targetUid: string;
  sourceId: string;
  status: 'sent' | 'failed' | 'skipped_no_token';
  tokenDocId: string | null;
  tokenSummary: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}) {
  await params.db.collection('pushLogs').add({
    kind: 'new_worry',
    targetUid: params.targetUid,
    sourceId: params.sourceId,
    sourceType: 'delivery',
    status: params.status,
    tokenDocId: params.tokenDocId,
    tokenSummary: params.tokenSummary,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function sendNewWorryPushesAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  deliveries: Array<{ deliveryId: string; recipientUid: string; worryId: string }>;
  now?: () => Date;
}): Promise<void> {
  for (const delivery of params.deliveries) {
    try {
      const tokenSnap = await params.db
        .collection('users')
        .doc(delivery.recipientUid)
        .collection('fcmTokens')
        .get();

      if (tokenSnap.empty) {
        await writePushLog({
          db: params.db,
          targetUid: delivery.recipientUid,
          sourceId: delivery.deliveryId,
          status: 'skipped_no_token',
          tokenDocId: null,
          tokenSummary: null,
          errorCode: null,
          errorMessage: null,
        });
        continue;
      }

      for (const tokenDoc of tokenSnap.docs) {
        const token = typeof tokenDoc.data().token === 'string'
          ? tokenDoc.data().token
          : decodeURIComponent(tokenDoc.id);

        if (!params.messaging) {
          await writePushLog({
            db: params.db,
            targetUid: delivery.recipientUid,
            sourceId: delivery.deliveryId,
            status: 'failed',
            tokenDocId: tokenDoc.id,
            tokenSummary: token ? summarizeToken(token) : null,
            errorCode: 'messaging_unavailable',
            errorMessage: 'Firebase messaging is not initialized.',
          });
          continue;
        }

        try {
          await params.messaging.send({
            token,
            notification: { title: '갈피', body: '새로운 사연이 도착했습니다.' },
            data: {
              title: '갈피',
              body: '새로운 사연이 도착했습니다.',
              url: '/',
            },
          });

          await writePushLog({
            db: params.db,
            targetUid: delivery.recipientUid,
            sourceId: delivery.deliveryId,
            status: 'sent',
            tokenDocId: tokenDoc.id,
            tokenSummary: summarizeToken(token),
            errorCode: null,
            errorMessage: null,
          });
        } catch (error) {
          await writePushLog({
            db: params.db,
            targetUid: delivery.recipientUid,
            sourceId: delivery.deliveryId,
            status: 'failed',
            tokenDocId: tokenDoc.id,
            tokenSummary: token ? summarizeToken(token) : null,
            errorCode: error instanceof Error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : null,
            errorMessage: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      console.error('[Push] New-worry push logging failed after commit.', error);
    }
  }
}
