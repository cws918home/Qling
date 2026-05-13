import { doc, updateDoc, type Firestore } from 'firebase/firestore';
import type { ReplyFeedback, ReplyFeedbackPersistence } from './types';

export function createFirestoreReplyFeedbackPersistence(db: Firestore): ReplyFeedbackPersistence {
  return {
    async saveReplyFeedback(replyId: string, feedbackType: ReplyFeedback) {
      await updateDoc(doc(db, 'letters', replyId), { feedback: feedbackType });
    },

    async incrementHelpedCount(_replierId: string) {
      // Phase 2 keeps legacy letter feedback but removes browser-owned helpedCount writes.
    },
  };
}
