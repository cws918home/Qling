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
import { selectMyWorries } from './prdPolicy';
import type { MyWorryListItem, PrdReplyDoc, PrdWorryDoc, ReplyReadStateDoc } from './types';

function toPrdWorryDocs(snapshot: QuerySnapshot<DocumentData>): PrdWorryDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdWorryDoc));
}

function toPrdReplyDocs(snapshot: QuerySnapshot<DocumentData>): PrdReplyDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdReplyDoc));
}

function toReplyReadStateDocs(snapshot: QuerySnapshot<DocumentData>): ReplyReadStateDoc[] {
  return snapshot.docs.map(doc => ({ replyId: doc.id, ...doc.data() } as ReplyReadStateDoc));
}

export function useMyWorries(params: {
  user: { uid: string } | null;
  firestore?: Firestore;
}) {
  const { user, firestore = db } = params;
  const [myWorries, setMyWorries] = useState<MyWorryListItem[]>([]);

  useEffect(() => {
    if (!user) {
      setMyWorries([]);
      return;
    }

    let latestWorries: PrdWorryDoc[] = [];
    let latestReplies: PrdReplyDoc[] = [];
    let latestReadStates = new Map<string, ReplyReadStateDoc>();

    function recompute() {
      setMyWorries(selectMyWorries({
        worries: latestWorries,
        userUid: user.uid,
        replies: latestReplies,
        readStatesByReplyId: latestReadStates,
      }));
    }

    const unsubscribeWorries = onSnapshot(
      query(collection(firestore, 'worries'), where('authorUid', '==', user.uid)),
      snapshot => {
        latestWorries = toPrdWorryDocs(snapshot);
        recompute();
      },
      error => {
        console.error('My worries listener error:', error);
        setMyWorries([]);
      }
    );
    const unsubscribeReplies = onSnapshot(
      query(
        collection(firestore, 'replies'),
        where('authorUid', '==', user.uid),
        where('status', '==', 'active')
      ),
      snapshot => {
        latestReplies = toPrdReplyDocs(snapshot);
        recompute();
      },
      error => {
        console.error('My worries reply listener error:', error);
      }
    );
    const unsubscribeReadStates = onSnapshot(
      collection(firestore, 'users', user.uid, 'replyReadStates'),
      snapshot => {
        latestReadStates = new Map(
          toReplyReadStateDocs(snapshot).map(readState => [readState.replyId ?? '', readState])
        );
        recompute();
      },
      error => {
        console.error('My worries read-state listener error:', error);
      }
    );

    return () => {
      unsubscribeWorries();
      unsubscribeReplies();
      unsubscribeReadStates();
    };
  }, [firestore, user]);

  return { myWorries };
}
