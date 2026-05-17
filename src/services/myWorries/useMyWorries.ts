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
import { db, logFirestoreListenerError } from '../../firebase';
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
  const [isLoadingMyWorries, setIsLoadingMyWorries] = useState(false);
  const [myWorriesError, setMyWorriesError] = useState<string | undefined>();

  useEffect(() => {
    if (!user) {
      setMyWorries([]);
      setIsLoadingMyWorries(false);
      setMyWorriesError(undefined);
      return;
    }

    let latestWorries: PrdWorryDoc[] = [];
    let latestReplies: PrdReplyDoc[] = [];
    let latestReadStates = new Map<string, ReplyReadStateDoc>();
    setIsLoadingMyWorries(true);
    setMyWorriesError(undefined);

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
        setIsLoadingMyWorries(false);
        setMyWorriesError(undefined);
      },
      error => {
        logFirestoreListenerError('My worries listener error:', error);
        setMyWorries([]);
        setIsLoadingMyWorries(false);
        setMyWorriesError('작성한 고민을 불러오지 못했습니다.');
      }
    );
    const unsubscribeReplies = onSnapshot(
      query(
        collection(firestore, 'replies'),
        where('authorUid', '==', user.uid),
        where('publisherVisible', '==', true),
        where('status', '==', 'active')
      ),
      snapshot => {
        latestReplies = toPrdReplyDocs(snapshot);
        recompute();
      },
      error => {
        logFirestoreListenerError('My worries reply listener error:', error);
        setMyWorriesError('답장 상태를 불러오지 못했습니다.');
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
        logFirestoreListenerError('My worries read-state listener error:', error);
        setMyWorriesError('읽음 상태를 불러오지 못했습니다.');
      }
    );

    return () => {
      unsubscribeWorries();
      unsubscribeReplies();
      unsubscribeReadStates();
    };
  }, [firestore, user]);

  return { myWorries, isLoadingMyWorries, myWorriesError };
}
