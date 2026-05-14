import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  adaptPrdAnswerFeedItemToHomeWorryFeedLetter,
  selectActivePrdAnswerFeedItems,
  type DeliveryReadStateDoc,
  type PrdDeliveryDoc,
  type PrdWorryDoc,
} from './prdPolicy';
import type {
  HomeWorryFeedLetter,
  HomeWorryFeedProfile,
} from './types';

function toDeliveryReadStateDocs(snapshot: QuerySnapshot<DocumentData>): DeliveryReadStateDoc[] {
  return snapshot.docs.map(readStateDoc => ({
    deliveryId: readStateDoc.id,
    ...readStateDoc.data(),
  } as DeliveryReadStateDoc));
}

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
    const readStatesQuery = collection(db, 'users', profile.uid, 'deliveryReadStates');
    let latestDeliveries: PrdDeliveryDoc[] = [];
    let latestReadStates = new Map<string, DeliveryReadStateDoc>();

    async function recompute() {
      try {
        const worryIds = [...new Set(latestDeliveries.map(delivery => delivery.worryId).filter(Boolean))] as string[];
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
            deliveries: latestDeliveries,
            worriesById,
            readStatesByDeliveryId: latestReadStates,
            profileUid: profile.uid,
          }).map(adaptPrdAnswerFeedItemToHomeWorryFeedLetter)
        );
      } catch (err) {
        console.error('Error processing PRD answer feed:', err);
      }
    }

    const unsubscribeDeliveries = onSnapshot(q, snapshot => {
      latestDeliveries = snapshot.docs.map(deliveryDoc => ({
        id: deliveryDoc.id,
        ...deliveryDoc.data(),
      } as PrdDeliveryDoc));
      void recompute();
    }, (err) => {
      console.error('PRD answer feed listener error:', err);
    });
    const unsubscribeReadStates = onSnapshot(readStatesQuery, snapshot => {
      latestReadStates = new Map(
        toDeliveryReadStateDocs(snapshot).map(readState => [readState.deliveryId ?? '', readState])
      );
      void recompute();
    }, (err) => {
      console.error('PRD delivery read-state listener error:', err);
    });

    return () => {
      unsubscribeDeliveries();
      unsubscribeReadStates();
    };
  }, [profile]);

  return { prdFeedWorries };
}
