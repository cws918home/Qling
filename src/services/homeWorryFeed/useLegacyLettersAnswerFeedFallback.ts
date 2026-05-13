import { useEffect, useState } from 'react';
import {
  collection,
  type DocumentData,
  limit,
  onSnapshot,
  query,
  type Query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { selectVisibleHomeWorryFeed } from './policy';
import type {
  HomeWorryFeedLetter,
  HomeWorryFeedProfile,
} from './types';

export function useLegacyLettersAnswerFeedFallback(params: {
  profile: HomeWorryFeedProfile | null;
}): { legacyFeedWorries: HomeWorryFeedLetter[] } {
  const { profile } = params;
  const [legacyFeedWorries, setLegacyFeedWorries] = useState<HomeWorryFeedLetter[]>([]);

  useEffect(() => {
    if (!profile) {
      setLegacyFeedWorries([]);
      return;
    }

    const receivedQuery = query(
      collection(db, 'letters'),
      where('type', '==', 'worry'),
      where('receiverId', '==', profile.uid),
      limit(200)
    );
    const publicQuery = query(
      collection(db, 'letters'),
      where('type', '==', 'worry'),
      where('receiverId', '==', 'public'),
      limit(200)
    );

    const snapshots = new Map<string, HomeWorryFeedLetter>();
    const updateFeed = () => {
      setLegacyFeedWorries(selectVisibleHomeWorryFeed([...snapshots.values()], profile));
    };

    const subscribe = (q: Query<DocumentData>) => onSnapshot(q, (snapshot) => {
      try {
        snapshot.docChanges().forEach(change => {
          if (change.type === 'removed') {
            snapshots.delete(change.doc.id);
            return;
          }

          snapshots.set(change.doc.id, {
            id: change.doc.id,
            ...change.doc.data(),
            source: 'legacy_letters',
          } as HomeWorryFeedLetter);
        });
        updateFeed();
      } catch (err) {
        console.error('Error processing legacy letters fallback:', err);
      }
    }, (err) => {
      console.error('Legacy letters fallback listener error:', err);
    });

    const unsubscribeReceived = subscribe(receivedQuery);
    const unsubscribePublic = subscribe(publicQuery);

    return () => {
      unsubscribeReceived();
      unsubscribePublic();
    };
  }, [profile]);

  return { legacyFeedWorries };
}
