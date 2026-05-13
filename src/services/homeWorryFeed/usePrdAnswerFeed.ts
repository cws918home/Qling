import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  adaptPrdAnswerFeedItemToHomeWorryFeedLetter,
  selectActivePrdAnswerFeedItems,
  type PrdDeliveryDoc,
  type PrdWorryDoc,
} from './prdPolicy';
import type {
  HomeWorryFeedLetter,
  HomeWorryFeedProfile,
} from './types';

export function usePrdAnswerFeed(params: {
  profile: HomeWorryFeedProfile | null;
}): { prdFeedWorries: HomeWorryFeedLetter[] } {
  const { profile } = params;
  const [prdFeedWorries, setPrdFeedWorries] = useState<HomeWorryFeedLetter[]>([]);

  useEffect(() => {
    if (!profile) {
      setPrdFeedWorries([]);
      return;
    }

    const q = query(
      collection(db, 'deliveries'),
      where('recipientUid', '==', profile.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        const deliveries = snapshot.docs.map(deliveryDoc => ({
          id: deliveryDoc.id,
          ...deliveryDoc.data(),
        } as PrdDeliveryDoc));
        const worryIds = [...new Set(deliveries.map(delivery => delivery.worryId).filter(Boolean))] as string[];
        const worryDocs = await Promise.all(
          worryIds.map(async worryId => {
            const worrySnap = await getDoc(doc(db, 'worries', worryId));
            return worrySnap.exists()
              ? { id: worrySnap.id, ...worrySnap.data() } as PrdWorryDoc
              : null;
          })
        );
        const worriesById = new Map(
          worryDocs
            .filter((worry): worry is PrdWorryDoc => worry !== null)
            .map(worry => [worry.id, worry])
        );

        setPrdFeedWorries(
          selectActivePrdAnswerFeedItems({
            deliveries,
            worriesById,
            profileUid: profile.uid,
          }).map(adaptPrdAnswerFeedItemToHomeWorryFeedLetter)
        );
      } catch (err) {
        console.error('Error processing PRD answer feed:', err);
      }
    }, (err) => {
      console.error('PRD answer feed listener error:', err);
    });

    return () => unsubscribe();
  }, [profile]);

  return { prdFeedWorries };
}
