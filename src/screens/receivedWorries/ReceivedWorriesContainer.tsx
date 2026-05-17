import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { passDeliveryViaApi } from '../../services/deliveries/apiClient';
import {
  applyPassResultToSuppressedDeliveryIds,
  filterSuppressedFeedWorries,
} from '../../services/deliveries/uiPolicy';
import {
  useHomeWorryFeed,
  type HomeWorryFeedLetter,
  type HomeWorryFeedProfile,
} from '../../services/homeWorryFeed';
import { markDeliveryReadWithServer } from '../../services/readState/apiClient';
import {
  routeAfterPass,
  routeToWriteReply,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { ReceivedWorriesScreen } from './ReceivedWorriesScreen';
import { canStartPassMutation, stateForReceivedWorries } from './containerPolicy';
import { mapHomeWorryFeedLetterToReceivedWorryFeedItem } from './mapping';

export type SelectedReceivedWorry = Pick<
  HomeWorryFeedLetter,
  'deliveryId' | 'worryId' | 'category' | 'refinedContent' | 'source' | 'createdAt'
>;

export type ReceivedWorriesContainerProps = {
  readonly user: User | null;
  readonly profile: HomeWorryFeedProfile | null;
  readonly setView: (view: AppRouteViewState) => void;
  readonly selectedWorry: SelectedReceivedWorry | null;
  readonly setSelectedWorry: Dispatch<SetStateAction<SelectedReceivedWorry | null>>;
  readonly setFilterAlert: (message: string) => void;
};

export function ReceivedWorriesContainer(props: ReceivedWorriesContainerProps) {
  const [answerFeedRefreshKey, setAnswerFeedRefreshKey] = useState(0);
  const { feedWorries, feedStatus, feedError } = useHomeWorryFeed({
    profile: props.profile,
    user: props.user,
    refreshKey: answerFeedRefreshKey,
  });
  const [suppressedDeliveryIds, setSuppressedDeliveryIds] = useState<Set<string>>(() => new Set());
  const [passingDeliveryIds, setPassingDeliveryIds] = useState<Set<string>>(() => new Set());
  const passingDeliveryIdsRef = useRef<Set<string>>(new Set());

  const visibleFeedWorries = filterSuppressedFeedWorries({ feedWorries, suppressedDeliveryIds });
  const items = visibleFeedWorries.flatMap(worry => {
    const item = mapHomeWorryFeedLetterToReceivedWorryFeedItem(worry);
    return item ? [item] : [];
  });
  const state = stateForReceivedWorries({ feedStatus, feedError, items });

  const openWorryForReply = (deliveryId: string) => {
    const worry = visibleFeedWorries.find(item => item.deliveryId === deliveryId);
    if (!worry) return;

    props.setSelectedWorry(worry);
    if (worry.deliveryId) {
      props.setView(routeToWriteReply({ deliveryId: worry.deliveryId, worryId: worry.worryId }));
    } else {
      props.setView('write_reply');
    }

    if (!props.user || !worry.deliveryId || worry.source !== 'prd_delivery') return;
    void markDeliveryReadWithServer({
      user: props.user,
      deliveryId: worry.deliveryId,
    }).then(result => {
      if (result.status === 'failed') {
        console.error('Failed to mark delivery read:', result.reason);
      }
    });
  };

  const passWorry = async (deliveryId: string) => {
    const worry = visibleFeedWorries.find(item => item.deliveryId === deliveryId);
    if (!props.user || !worry || !worry.deliveryId || worry.source !== 'prd_delivery') {
      props.setFilterAlert('이전 형식의 고민은 패스할 수 없습니다.');
      return;
    }
    if (!canStartPassMutation({ deliveryId: worry.deliveryId, passingDeliveryIds: passingDeliveryIdsRef.current })) {
      return;
    }

    passingDeliveryIdsRef.current = new Set(passingDeliveryIdsRef.current).add(worry.deliveryId);
    setPassingDeliveryIds(new Set(passingDeliveryIdsRef.current));
    try {
      const result = await passDeliveryViaApi({
        user: props.user,
        deliveryId: worry.deliveryId,
      });

      if (result.status === 'failed') {
        props.setFilterAlert(result.reason || '패스 처리 실패');
        return;
      }

      setSuppressedDeliveryIds(prev => applyPassResultToSuppressedDeliveryIds({
        result,
        deliveryId: worry.deliveryId as string,
        suppressedDeliveryIds: prev,
      }));
      if (props.selectedWorry?.deliveryId === worry.deliveryId) {
        props.setSelectedWorry(null);
      }
      setAnswerFeedRefreshKey(prev => prev + 1);
      props.setView(routeAfterPass());
    } catch (e) {
      console.error(e);
      props.setFilterAlert('패스 처리 실패');
    } finally {
      const next = new Set(passingDeliveryIdsRef.current);
      next.delete(worry.deliveryId);
      passingDeliveryIdsRef.current = next;
      setPassingDeliveryIds(next);
    }
  };

  return (
    <ReceivedWorriesScreen
      state={state}
      items={items}
      passingDeliveryIds={[...passingDeliveryIds]}
      onPass={passWorry}
      onOpen={({ deliveryId }) => openWorryForReply(deliveryId)}
      onReply={({ deliveryId }) => openWorryForReply(deliveryId)}
    />
  );
}
