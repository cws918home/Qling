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
import type { MyWorryListItem, PrdWorryDoc } from './types';

function toPrdWorryDocs(snapshot: QuerySnapshot<DocumentData>): PrdWorryDoc[] {
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrdWorryDoc));
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

    const unsubscribe = onSnapshot(
      query(collection(firestore, 'worries'), where('authorUid', '==', user.uid)),
      snapshot => {
        setMyWorries(selectMyWorries({
          worries: toPrdWorryDocs(snapshot),
          userUid: user.uid,
        }));
      },
      error => {
        console.error('My worries listener error:', error);
        setMyWorries([]);
      }
    );

    return () => unsubscribe();
  }, [firestore, user]);

  return { myWorries };
}
