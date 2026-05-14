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
  selectRepliesForWorry,
} from './prdPolicy';
import type { PrdReplyDoc, ReplyReadModelItem } from './types';
import type { PrdFeedbackDoc, ReplyReadStateDoc } from './types';

function toPrdReplyDocs(snapshot: QuerySnapshot<DocumentData>): PrdReplyDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdReplyDoc));
}

function toReplyReadStateDocs(snapshot: QuerySnapshot<DocumentData>): ReplyReadStateDoc[] {
  return snapshot.docs.map(doc => ({ replyId: doc.id, ...doc.data() } as ReplyReadStateDoc));
}

function toPrdFeedbackDocs(snapshot: QuerySnapshot<DocumentData>): PrdFeedbackDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdFeedbackDoc));
}

export function useRepliesForWorry(params: {
  user: { uid: string } | null;
  worryId: string | null;
  firestore?: Firestore;
}) {
  const { user, worryId, firestore = db } = params;
  const [prdReplies, setPrdReplies] = useState<ReplyReadModelItem[]>([]);
  const [readStatesByReplyId, setReadStatesByReplyId] = useState(new Map<string, ReplyReadStateDoc>());
  const [feedbacksByReplyId, setFeedbacksByReplyId] = useState(new Map<string, PrdFeedbackDoc>());

  useEffect(() => {
    if (!user || !worryId) {
      setPrdReplies([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(firestore, 'replies'),
        where('worryId', '==', worryId),
        where('authorUid', '==', user.uid),
        where('status', '==', 'active')
      ),
      snapshot => {
        const docs = toPrdReplyDocs(snapshot);
        setPrdReplies(selectRepliesForWorry({
          replies: docs,
          userUid: user.uid,
          worryId,
          readStatesByReplyId,
          feedbacksByReplyId,
        }));
      },
      error => {
        console.error('Replies for worry listener error:', error);
        setPrdReplies([]);
      }
    );

    return () => unsubscribe();
  }, [feedbacksByReplyId, firestore, readStatesByReplyId, user, worryId]);

  useEffect(() => {
    if (!user || !worryId) {
      setFeedbacksByReplyId(new Map());
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(firestore, 'feedbacks'),
        where('worryId', '==', worryId),
        where('publisherUid', '==', user.uid)
      ),
      snapshot => {
        setFeedbacksByReplyId(new Map(
          toPrdFeedbackDocs(snapshot).map(feedback => [feedback.replyId ?? feedback.id, feedback])
        ));
      },
      error => {
        console.error('Publisher feedback listener error:', error);
        setFeedbacksByReplyId(new Map());
      }
    );

    return () => unsubscribe();
  }, [firestore, user, worryId]);

  useEffect(() => {
    if (!user) {
      setReadStatesByReplyId(new Map());
      return;
    }

    const unsubscribe = onSnapshot(
      collection(firestore, 'users', user.uid, 'replyReadStates'),
      snapshot => {
        setReadStatesByReplyId(new Map(
          toReplyReadStateDocs(snapshot).map(readState => [readState.replyId ?? '', readState])
        ));
      },
      error => {
        console.error('Replies read-state listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  const repliesForWorry = useMemo(
    () => composeReplyReadModel({
      prdReplies,
      mode: 'received_for_worry',
    }),
    [prdReplies]
  );

  return { repliesForWorry };
}
