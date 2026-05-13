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
import { useLegacyLettersReplyFallback } from './useLegacyLettersReplyFallback';
import type { PrdReplyDoc, ReplyReadModelItem } from './types';

function toPrdReplyDocs(snapshot: QuerySnapshot<DocumentData>): PrdReplyDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdReplyDoc));
}

export function useMyGivenReplies(params: {
  user: { uid: string } | null;
  firestore?: Firestore;
}) {
  const { user, firestore = db } = params;
  const [prdReplies, setPrdReplies] = useState<ReplyReadModelItem[]>([]);
  const { legacyLettersReplies } = useLegacyLettersReplyFallback({
    user,
    mode: 'given_by_me',
    firestore,
  });

  useEffect(() => {
    if (!user) {
      setPrdReplies([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(firestore, 'replies'), where('replierUid', '==', user.uid)),
      snapshot => {
        setPrdReplies(selectMyGivenReplies({
          replies: toPrdReplyDocs(snapshot),
          userUid: user.uid,
        }));
      },
      error => {
        console.error('My given replies listener error:', error);
        setPrdReplies([]);
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  const myGivenReplies = useMemo(
    () => composeReplyReadModel({
      prdReplies,
      legacyLettersReplies,
      mode: 'given_by_me',
    }),
    [legacyLettersReplies, prdReplies]
  );

  return { myGivenReplies };
}
