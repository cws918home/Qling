import type {
  LegacyReplyFeedback,
  ReplyFeedback,
  ReplyFeedbackApiClient,
  ReplyFeedbackPersistence,
  ReplyFeedbackTarget,
  SubmitReplyFeedbackResult,
} from './types';

interface SubmitReplyFeedbackParams {
  reply: ReplyFeedbackTarget;
  feedbackType: ReplyFeedback;
  persistence?: ReplyFeedbackPersistence;
  apiClient?: ReplyFeedbackApiClient;
  comment?: string;
}

export async function submitReplyFeedback({
  reply,
  feedbackType,
  persistence,
  apiClient,
  comment,
}: SubmitReplyFeedbackParams): Promise<SubmitReplyFeedbackResult> {
  if (reply.source === 'prd_replies') {
    if (!apiClient) {
      throw new Error('reply_feedback_api_unavailable');
    }

    return apiClient.submitReplyFeedback({
      replyId: reply.id,
      type: feedbackType === 'helpful' ? 'like' : 'dislike',
      comment,
    });
  }

  if (!persistence) {
    throw new Error('reply_feedback_persistence_unavailable');
  }

  await persistence.saveReplyFeedback(reply.id, feedbackType);

  if (feedbackType !== 'helpful') {
    return legacySaved(feedbackType);
  }

  if (reply.isAiGenerated === true || reply.senderId.startsWith('bot_')) {
    return legacySaved(feedbackType);
  }

  try {
    await persistence.incrementHelpedCount(reply.senderId);
  } catch {
    // Helped-count persistence is intentionally hidden from the caller.
  }

  return legacySaved(feedbackType);
}

function legacySaved(feedback: LegacyReplyFeedback): SubmitReplyFeedbackResult {
  return { status: 'saved', feedback };
}
