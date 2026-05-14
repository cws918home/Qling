import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';

export type PushLogStatus =
  | 'sent'
  | 'failed'
  | 'skipped_no_token'
  | 'invalid_token_deleted'
  | 'skipped_deleted_user';

type PrdNotificationKind = 'new_worry' | 'new_reply' | 'reply_liked';
type SourceType = 'worry' | 'delivery' | 'reply' | 'feedback';

const INVALID_PUSH_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

function summarizeToken(token: string) {
  return token.length <= 18
    ? token
    : `${token.slice(0, 12)}...${token.slice(-6)}`;
}

function errorCode(error: unknown): string | null {
  if (error instanceof Error && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isInvalidPushTokenError(error: unknown) {
  const code = errorCode(error);
  return code !== null && INVALID_PUSH_TOKEN_ERROR_CODES.has(code);
}

async function writePushLog(params: {
  db: Firestore;
  kind: PrdNotificationKind;
  targetUid: string;
  sourceId: string;
  sourceType: SourceType;
  sourceReason?: string;
  status: PushLogStatus;
  tokenDocId: string | null;
  tokenSummary: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}): Promise<string | null> {
  const ref = await params.db.collection('pushLogs').add({
    kind: params.kind,
    targetUid: params.targetUid,
    sourceId: params.sourceId,
    sourceType: params.sourceType,
    ...(params.sourceReason ? { sourceReason: params.sourceReason } : {}),
    status: params.status,
    tokenDocId: params.tokenDocId,
    tokenSummary: params.tokenSummary,
    errorCode: params.errorCode,
    errorMessage: params.errorMessage,
    createdAt: FieldValue.serverTimestamp(),
  });
  return typeof ref?.id === 'string' ? ref.id : null;
}

async function sendPrdNotificationAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  kind: PrdNotificationKind;
  targetUid: string;
  sourceId: string;
  sourceType: SourceType;
  sourceReason?: string;
  title: string;
  body: string;
}): Promise<{ status: PushLogStatus; logIds: string[]; warnings: string[] }> {
  const logIds: string[] = [];
  const warnings: string[] = [];
  const statuses: PushLogStatus[] = [];

  const writeLog = async (log: Omit<Parameters<typeof writePushLog>[0], 'db' | 'kind' | 'targetUid' | 'sourceId' | 'sourceType' | 'sourceReason'>) => {
    statuses.push(log.status);
    const id = await writePushLog({
      db: params.db,
      kind: params.kind,
      targetUid: params.targetUid,
      sourceId: params.sourceId,
      sourceType: params.sourceType,
      sourceReason: params.sourceReason,
      ...log,
    });
    if (id) logIds.push(id);
  };

  try {
    const userRef = params.db.collection('users').doc(params.targetUid);
    const userDoc = await userRef.get();
    if (userDoc.exists && userDoc.data()?.deleted === true) {
      await writeLog({
        status: 'skipped_deleted_user',
        tokenDocId: null,
        tokenSummary: null,
        errorCode: null,
        errorMessage: null,
      });
      return { status: 'skipped_deleted_user', logIds, warnings };
    }

    const tokenSnap = await userRef.collection('fcmTokens').get();
    if (tokenSnap.empty) {
      await writeLog({
        status: 'skipped_no_token',
        tokenDocId: null,
        tokenSummary: null,
        errorCode: null,
        errorMessage: null,
      });
      return { status: 'skipped_no_token', logIds, warnings };
    }

    for (const tokenDoc of tokenSnap.docs) {
      const token = typeof tokenDoc.data().token === 'string'
        ? tokenDoc.data().token
        : decodeURIComponent(tokenDoc.id);
      const tokenSummary = token ? summarizeToken(token) : null;

      if (!params.messaging) {
        warnings.push('messaging_unavailable');
        await writeLog({
          status: 'failed',
          tokenDocId: tokenDoc.id,
          tokenSummary,
          errorCode: 'messaging_unavailable',
          errorMessage: 'Firebase messaging is not initialized.',
        });
        continue;
      }

      try {
        await params.messaging.send({
          token,
          notification: { title: params.title, body: params.body },
          data: { title: params.title, body: params.body, url: '/' },
          android: {
            priority: 'high',
            notification: { channelId: 'galpi-main', priority: 'max' },
          },
          webpush: {
            headers: { Urgency: 'high' },
            fcmOptions: { link: '/' },
            notification: {
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `galpi-${params.kind}`,
              renotify: true,
              requireInteraction: true,
            },
          },
        });

        await writeLog({
          status: 'sent',
          tokenDocId: tokenDoc.id,
          tokenSummary,
          errorCode: null,
          errorMessage: null,
        });
      } catch (error) {
        if (isInvalidPushTokenError(error)) {
          await tokenDoc.ref.delete();
          await writeLog({
            status: 'invalid_token_deleted',
            tokenDocId: tokenDoc.id,
            tokenSummary,
            errorCode: errorCode(error),
            errorMessage: errorMessage(error),
          });
          continue;
        }

        warnings.push(`${params.kind}_push_failed`);
        await writeLog({
          status: 'failed',
          tokenDocId: tokenDoc.id,
          tokenSummary,
          errorCode: errorCode(error),
          errorMessage: errorMessage(error),
        });
      }
    }
  } catch (error) {
    warnings.push(`${params.kind}_push_logging_failed`);
    console.error('[Notifications] Push attempt failed after commit.', {
      kind: params.kind,
      targetUid: params.targetUid,
      sourceId: params.sourceId,
      error,
    });
  }

  return {
    status: statuses.includes('sent') ? 'sent' : (statuses[0] ?? 'failed'),
    logIds,
    warnings,
  };
}

export async function sendNewWorryNotificationAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  targetUid: string;
  sourceId: string;
  sourceType: 'worry' | 'delivery';
  sourceReason?: 'pass_replacement';
}) {
  return sendPrdNotificationAfterCommit({
    ...params,
    kind: 'new_worry',
    title: '갈피',
    body: '새로운 고민이 도착했습니다.',
  });
}

export async function sendNewReplyNotificationAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  targetUid: string;
  sourceId: string;
  sourceType?: 'reply';
}) {
  return sendPrdNotificationAfterCommit({
    ...params,
    kind: 'new_reply',
    sourceType: params.sourceType ?? 'reply',
    title: '갈피',
    body: '보낸 고민에 답장이 도착했습니다.',
  });
}

export async function sendReplyLikedNotificationAfterCommit(params: {
  db: Firestore;
  messaging: Messaging | null;
  targetUid: string;
  sourceId: string;
  sourceType: 'reply' | 'feedback';
}) {
  return sendPrdNotificationAfterCommit({
    ...params,
    kind: 'reply_liked',
    title: '갈피',
    body: '내 답장이 위로가 되었다는 답신이 왔어요.',
  });
}

export async function deleteAllPushTokensForUser(params: {
  db: Firestore;
  uid: string;
}): Promise<{ deletedCount: number }> {
  const tokenSnap = await params.db.collection('users').doc(params.uid).collection('fcmTokens').get();
  await Promise.all(tokenSnap.docs.map(tokenDoc => tokenDoc.ref.delete()));
  return { deletedCount: tokenSnap.docs.length };
}
