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
}): Promise<string> {
  const ref = await params.db.collection('pushLogs').add({
    kind: 'pass_replacement',
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
  return ref.id;
}

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
  const logIds: string[] = [];
  const warnings: string[] = [];

  try {
    const tokenSnap = await params.db
      .collection('users')
      .doc(params.recipientUid)
      .collection('fcmTokens')
      .get();

    if (tokenSnap.empty) {
      logIds.push(await writePushLog({
        db: params.db,
        targetUid: params.recipientUid,
        sourceId: params.deliveryId,
        status: 'skipped_no_token',
        tokenDocId: null,
        tokenSummary: null,
        errorCode: null,
        errorMessage: null,
      }));
      return { status: 'skipped_no_token', logIds, warnings };
    }

    let hasSent = false;
    for (const tokenDoc of tokenSnap.docs) {
      const token = typeof tokenDoc.data().token === 'string'
        ? tokenDoc.data().token
        : decodeURIComponent(tokenDoc.id);

      if (!params.messaging) {
        warnings.push('messaging_unavailable');
        logIds.push(await writePushLog({
          db: params.db,
          targetUid: params.recipientUid,
          sourceId: params.deliveryId,
          status: 'failed',
          tokenDocId: tokenDoc.id,
          tokenSummary: token ? summarizeToken(token) : null,
          errorCode: 'messaging_unavailable',
          errorMessage: 'Firebase messaging is not initialized.',
        }));
        continue;
      }

      try {
        await params.messaging.send({
          token,
    notification: { title: '갈피', body: '새로운 고민이 도착했습니다.' },
    data: { title: '갈피', body: '새로운 고민이 도착했습니다.', url: '/' },
        });
        hasSent = true;
        logIds.push(await writePushLog({
          db: params.db,
          targetUid: params.recipientUid,
          sourceId: params.deliveryId,
          status: 'sent',
          tokenDocId: tokenDoc.id,
          tokenSummary: summarizeToken(token),
          errorCode: null,
          errorMessage: null,
        }));
      } catch (error) {
        warnings.push('replacement_push_failed');
        logIds.push(await writePushLog({
          db: params.db,
          targetUid: params.recipientUid,
          sourceId: params.deliveryId,
          status: 'failed',
          tokenDocId: tokenDoc.id,
          tokenSummary: token ? summarizeToken(token) : null,
          errorCode: error instanceof Error && 'code' in error ? String((error as { code?: unknown }).code ?? '') : null,
          errorMessage: error instanceof Error ? error.message : String(error),
        }));
      }
    }

    return { status: hasSent ? 'sent' : 'failed', logIds, warnings };
  } catch (error) {
    warnings.push('replacement_push_logging_failed');
    console.error('[Push] Pass replacement push failed after commit.', error);
    return { status: 'failed', logIds, warnings };
  }
}
