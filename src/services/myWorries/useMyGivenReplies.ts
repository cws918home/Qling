import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type Firestore,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  composeReplyReadModel,
  selectMyGivenReplies,
} from './prdPolicy';
import type { PrdFeedbackDoc, PrdReplyDoc, ReplyReadModelItem } from './types';

function toPrdReplyDocs(snapshot: QuerySnapshot<DocumentData>): PrdReplyDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdReplyDoc));
}

function toPrdFeedbackDocs(snapshot: QuerySnapshot<DocumentData>): PrdFeedbackDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdFeedbackDoc));
}

export function useMyGivenReplies(params: {
  user: { uid: string } | null;
  firestore?: Firestore;
}) {
  const { user, firestore = db } = params;
  const [prdReplies, setPrdReplies] = useState<ReplyReadModelItem[]>([]);
  const [feedbacksByReplyId, setFeedbacksByReplyId] = useState(new Map<string, PrdFeedbackDoc>());

  useEffect(() => {
    if (!user) {
      setPrdReplies([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(firestore, 'replies'),
        where('replierUid', '==', user.uid),
        where('status', '==', 'active')
      ),
      snapshot => {
        const docs = toPrdReplyDocs(snapshot);
        setPrdReplies(selectMyGivenReplies({
          replies: docs,
          userUid: user.uid,
          feedbacksByReplyId,
        }));
      },
      error => {
        console.error('My given replies listener error:', error);
        setPrdReplies([]);
      }
    );

    return () => unsubscribe();
  }, [feedbacksByReplyId, firestore, user]);

  useEffect(() => {
    if (!user) {
      setFeedbacksByReplyId(new Map());
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(firestore, 'feedbacks'),
        where('replierUid', '==', user.uid),
        where('type', '==', 'like')
      ),
      snapshot => {
        setFeedbacksByReplyId(new Map(
          toPrdFeedbackDocs(snapshot).map(feedback => [feedback.replyId ?? feedback.id, feedback])
        ));
      },
      error => {
        console.error('My feedback listener error:', error);
        setFeedbacksByReplyId(new Map());
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  const myGivenReplies = useMemo(
    () => composeReplyReadModel({
      prdReplies,
      mode: 'given_by_me',
    }),
    [prdReplies]
  );

  return { myGivenReplies };
}
