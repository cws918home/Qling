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
  isHiddenReply,
  selectRepliesForWorry,
} from './prdPolicy';
import { useLegacyLettersReplyFallback } from './useLegacyLettersReplyFallback';
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
  const [suppressedPrdReplyDeliveryIds, setSuppressedPrdReplyDeliveryIds] = useState(new Set<string>());
  const [readStatesByReplyId, setReadStatesByReplyId] = useState(new Map<string, ReplyReadStateDoc>());
  const [feedbacksByReplyId, setFeedbacksByReplyId] = useState(new Map<string, PrdFeedbackDoc>());
  const { legacyLettersReplies } = useLegacyLettersReplyFallback({
    user,
    worryId,
    mode: 'received_for_worry',
    firestore,
  });

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
        setSuppressedPrdReplyDeliveryIds(new Set(
          docs
            .filter(reply => isHiddenReply(reply) && typeof reply.deliveryId === 'string')
            .map(reply => reply.deliveryId as string)
        ));
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
      legacyLettersReplies,
      suppressedPrdReplyDeliveryIds,
      mode: 'received_for_worry',
    }),
    [legacyLettersReplies, prdReplies, suppressedPrdReplyDeliveryIds]
  );

  return { repliesForWorry };
}
