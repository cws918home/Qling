import type {
  ReplyFeedback,
  ReplyFeedbackApiClient,
  ReplyFeedbackTarget,
  SubmitReplyFeedbackResult,
} from './types';

interface SubmitReplyFeedbackParams {
  reply: ReplyFeedbackTarget;
  feedbackType: ReplyFeedback;
  apiClient?: ReplyFeedbackApiClient;
  comment?: string;
}

export async function submitReplyFeedback({
  reply,
  feedbackType,
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

  throw new Error('reply_feedback_prd_source_required');
}
