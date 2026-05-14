import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { sendReplyLikedNotificationAfterCommit } from '../notifications';
import type { ReplyFeedbackPushLogger, ReplyFeedbackPushService } from './serverFeedback';

export function createReplyFeedbackPushService(params: {
  db: Firestore;
  messaging: Messaging | null;
  logger?: ReplyFeedbackPushLogger;
}): ReplyFeedbackPushService {
  const logger = params.logger ?? console;

  return {
    async sendReplyLiked({ feedbackId, replyId, replierUid }) {
      const result = await sendReplyLikedNotificationAfterCommit({
        db: params.db,
        messaging: params.messaging,
        targetUid: replierUid,
        sourceId: feedbackId,
        sourceType: 'feedback',
      });

      if (result.warnings.length > 0) {
        logger.warn('[FeedbackPush] Reply-liked push completed with warnings.', {
          feedbackId,
          replyId,
          replierUid,
          warnings: result.warnings,
        });
      }
    },
  };
}
