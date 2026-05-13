import { db } from '../../firebase';
import { createFirestoreReplyFeedbackPersistence } from './firestoreAdapters';
import { createReplyFeedbackApiClient } from './apiClient';
import { submitReplyFeedback } from './submitReplyFeedback';
import type { ReplyFeedback, ReplyFeedbackTarget } from './types';

const productionPersistence = createFirestoreReplyFeedbackPersistence(db);
const productionApiClient = createReplyFeedbackApiClient({
  getIdToken: async () => {
    const { auth } = await import('../../firebase');
    return auth.currentUser?.getIdToken() ?? null;
  },
});

export function submitReplyFeedbackWithProductionAdapters(params: {
  reply: ReplyFeedbackTarget;
  feedbackType: ReplyFeedback;
  comment?: string;
}) {
  return submitReplyFeedback({
    ...params,
    persistence: productionPersistence,
    apiClient: productionApiClient,
  });
}
