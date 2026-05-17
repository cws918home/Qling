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
import { db, logFirestoreListenerError } from '../../firebase';
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
  const [isLoadingRepliesForWorry, setIsLoadingRepliesForWorry] = useState(false);
  const [repliesForWorryError, setRepliesForWorryError] = useState<string | undefined>();

  useEffect(() => {
    if (!user || !worryId) {
      setPrdReplies([]);
      setIsLoadingRepliesForWorry(false);
      setRepliesForWorryError(undefined);
      return;
    }
    setIsLoadingRepliesForWorry(true);
    setRepliesForWorryError(undefined);

    const unsubscribe = onSnapshot(
      query(
        collection(firestore, 'replies'),
        where('worryId', '==', worryId),
        where('authorUid', '==', user.uid),
        where('publisherVisible', '==', true),
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
        setIsLoadingRepliesForWorry(false);
        setRepliesForWorryError(undefined);
      },
      error => {
        logFirestoreListenerError('Replies for worry listener error:', error);
        setPrdReplies([]);
        setIsLoadingRepliesForWorry(false);
        setRepliesForWorryError('도착한 답장을 불러오지 못했습니다.');
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
        logFirestoreListenerError('Publisher feedback listener error:', error);
        setFeedbacksByReplyId(new Map());
        setRepliesForWorryError('답장 반응 상태를 불러오지 못했습니다.');
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
        logFirestoreListenerError('Replies read-state listener error:', error);
        setRepliesForWorryError('답장 읽음 상태를 불러오지 못했습니다.');
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

  return { repliesForWorry, isLoadingRepliesForWorry, repliesForWorryError };
}
