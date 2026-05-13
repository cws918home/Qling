import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  query,
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

    const q = query(
      collection(db, 'letters'),
      where('type', '==', 'worry'),
      limit(200)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const allWorries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'legacy_letters',
        } as HomeWorryFeedLetter));
        setLegacyFeedWorries(selectVisibleHomeWorryFeed(allWorries, profile));
      } catch (err) {
        console.error('Error processing legacy letters fallback:', err);
      }
    }, (err) => {
      console.error('Legacy letters fallback listener error:', err);
    });

    return () => unsubscribe();
  }, [profile]);

  return { legacyFeedWorries };
}
