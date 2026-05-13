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
import { useLegacyLettersReplyFallback } from './useLegacyLettersReplyFallback';
import type { PrdReplyDoc, ReplyReadModelItem } from './types';
import type { ReplyReadStateDoc } from './types';

function toPrdReplyDocs(snapshot: QuerySnapshot<DocumentData>): PrdReplyDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdReplyDoc));
}

function toReplyReadStateDocs(snapshot: QuerySnapshot<DocumentData>): ReplyReadStateDoc[] {
  return snapshot.docs.map(doc => ({ replyId: doc.id, ...doc.data() } as ReplyReadStateDoc));
}

export function useRepliesForWorry(params: {
  user: { uid: string } | null;
  worryId: string | null;
  firestore?: Firestore;
}) {
  const { user, worryId, firestore = db } = params;
  const [prdReplies, setPrdReplies] = useState<ReplyReadModelItem[]>([]);
  const [readStatesByReplyId, setReadStatesByReplyId] = useState(new Map<string, ReplyReadStateDoc>());
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
        where('authorUid', '==', user.uid)
      ),
      snapshot => {
        setPrdReplies(selectRepliesForWorry({
          replies: toPrdReplyDocs(snapshot),
          userUid: user.uid,
          worryId,
          readStatesByReplyId,
        }));
      },
      error => {
        console.error('Replies for worry listener error:', error);
        setPrdReplies([]);
      }
    );

    return () => unsubscribe();
  }, [firestore, readStatesByReplyId, user, worryId]);

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
      mode: 'received_for_worry',
    }),
    [legacyLettersReplies, prdReplies]
  );

  return { repliesForWorry };
}
