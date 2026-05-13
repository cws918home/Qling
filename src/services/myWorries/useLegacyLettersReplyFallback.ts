import { useEffect, useState } from 'react';
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
  adaptLegacyLettersReplies,
  composeReplyReadModel,
} from './prdPolicy';
import type {
  LegacyLettersReplyDoc,
  ReplyReadModelItem,
  ReplyReadModelMode,
} from './types';

function toLegacyReplyDocs(snapshot: QuerySnapshot<DocumentData>): LegacyLettersReplyDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegacyLettersReplyDoc));
}

export function useLegacyLettersReplyFallback(params: {
  user: { uid: string } | null;
  mode: ReplyReadModelMode;
  worryId?: string | null;
  firestore?: Firestore;
}) {
  const { user, mode, worryId, firestore = db } = params;
  const [legacyLettersReplies, setLegacyLettersReplies] = useState<ReplyReadModelItem[]>([]);

  useEffect(() => {
    if (!user || (mode === 'received_for_worry' && !worryId)) {
      setLegacyLettersReplies([]);
      return;
    }

    const constraints = mode === 'received_for_worry'
      ? [
        where('type', '==', 'reply'),
        where('receiverId', '==', user.uid),
        where('replyTo', '==', worryId),
      ]
      : [
        where('type', '==', 'reply'),
        where('senderId', '==', user.uid),
      ];

    const unsubscribe = onSnapshot(
      query(collection(firestore, 'letters'), ...constraints),
      snapshot => {
        setLegacyLettersReplies(adaptLegacyLettersReplies(toLegacyReplyDocs(snapshot)));
      },
      error => {
        console.error('Legacy letters reply fallback listener error:', error);
        setLegacyLettersReplies([]);
      }
    );

    return () => unsubscribe();
  }, [firestore, mode, user, worryId]);

  return { legacyLettersReplies };
}

export function selectReplyMailboxItems(params: {
  prdReplies: ReplyReadModelItem[];
  legacyLettersReplies?: ReplyReadModelItem[];
  mode: ReplyReadModelMode;
}) {
  return composeReplyReadModel(params);
}
