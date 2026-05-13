import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { ReplyFeedbackPushLogger, ReplyFeedbackPushService } from './serverFeedback';

export function createReplyFeedbackPushService(params: {
  db: Firestore;
  messaging: Messaging | null;
  logger?: ReplyFeedbackPushLogger;
}): ReplyFeedbackPushService {
  const logger = params.logger ?? console;

  return {
    async sendReplyLiked({ feedbackId, replyId, replierUid }) {
      const tokenSnapshot = await params.db
        .collection('users')
        .doc(replierUid)
        .collection('fcmTokens')
        .get();

      if (tokenSnapshot.empty) {
        logger.warn('[FeedbackPush] Reply-liked push skipped: no token.', {
          feedbackId,
          replyId,
          replierUid,
        });
        return;
      }

      if (!params.messaging) {
        logger.warn('[FeedbackPush] Reply-liked push skipped: messaging unavailable.', {
          feedbackId,
          replyId,
          replierUid,
        });
        return;
      }

      for (const tokenDoc of tokenSnapshot.docs) {
        const token = typeof tokenDoc.data().token === 'string'
          ? tokenDoc.data().token
          : decodeURIComponent(tokenDoc.id);

        try {
          await params.messaging.send({
            token,
            notification: {
              title: '갈피',
              body: '내 답장이 위로가 되었다는 답신이 왔어요.',
            },
            data: {
              title: '갈피',
              body: '내 답장이 위로가 되었다는 답신이 왔어요.',
              url: '/',
            },
          });
        } catch (error) {
          logger.warn('[FeedbackPush] Reply-liked push failed.', {
            feedbackId,
            replyId,
            replierUid,
            tokenDocId: tokenDoc.id,
            error: error instanceof Error ? error.message : error,
          });
        }
      }
    },
  };
}
