import type {
  ReplyFeedbackApiClient,
  SubmitReplyFeedbackInput,
  SubmitReplyFeedbackResult,
} from './types';

export function createReplyFeedbackApiClient(params: {
  getIdToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}): ReplyFeedbackApiClient {
  const fetchImpl = params.fetchImpl ?? fetch;

  return {
    async submitReplyFeedback(input: SubmitReplyFeedbackInput): Promise<SubmitReplyFeedbackResult> {
      const token = await params.getIdToken();
      if (!token) {
        throw new Error('auth_missing');
      }

      const response = await fetchImpl(`/api/replies/${encodeURIComponent(input.replyId)}/feedback`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: input.type,
          comment: input.comment,
        }),
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const code = body?.error?.code ?? 'feedback_failed';
        throw new Error(code);
      }

      return body as SubmitReplyFeedbackResult;
    },
  };
}
