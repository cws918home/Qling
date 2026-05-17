import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { markRepliesForWorryReadWithServer } from '../../services/readState/apiClient';
import {
  useMyWorries,
  useRepliesForWorry,
  type MyWorryListItem,
  type ReplyReadModelItem,
} from '../../services/myWorries';
import {
  routeToMyWorryDetail,
  routeToReceivedReplyDetail,
  routeToWriteWorry,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { MyWorriesScreen } from './MyWorriesScreen';
import { mapMyWorryToListItem, mapReceivedReplyToListItem } from './mapping';
import type { MyWorryListItemProps, ReceivedReplyListItemProps } from './contract';

export type MyWorriesContainerProps = {
  readonly user: User | null;
  readonly selectedMyWorry: MyWorryListItem | null;
  readonly setSelectedMyWorry: Dispatch<SetStateAction<MyWorryListItem | null>>;
  readonly setSelectedReply: Dispatch<SetStateAction<ReplyReadModelItem | null>>;
  readonly setView: (view: AppRouteViewState) => void;
};

export type SelectedMyWorry = MyWorryListItem;
export type SelectedMyReply = ReplyReadModelItem;

export function MyWorriesContainer(props: MyWorriesContainerProps) {
  const { myWorries, isLoadingMyWorries, myWorriesError } = useMyWorries({ user: props.user });
  const { repliesForWorry, isLoadingRepliesForWorry, repliesForWorryError } = useRepliesForWorry({
    user: props.user,
    worryId: props.selectedMyWorry?.id ?? null,
  });
  const repliesWithWorryFallback = repliesForWorry.map(reply => ({
    ...reply,
    replyToContent: reply.replyToContent ?? props.selectedMyWorry?.content,
  }));

  useEffect(() => {
    if (!props.user || !props.selectedMyWorry) return;

    void markRepliesForWorryReadWithServer({
      user: props.user,
      worryId: props.selectedMyWorry.id,
    }).then(result => {
      if (result.status === 'failed') {
        console.error('Failed to mark replies read:', result.reason);
      }
    });
  }, [props.selectedMyWorry, props.user]);

  const selectWorry = (item: MyWorryListItemProps) => {
    const worry = myWorries.find(candidate => candidate.id === item.worryId);
    if (!worry) return;

    props.setSelectedMyWorry(worry);
    props.setView(routeToMyWorryDetail({ worryId: worry.id }));
  };
  const selectReply = (item: ReceivedReplyListItemProps) => {
    const reply = repliesWithWorryFallback.find(candidate => candidate.id === item.replyId);
    if (!reply || !props.selectedMyWorry) return;

    props.setSelectedReply(reply);
    props.setView(routeToReceivedReplyDetail({
      worryId: props.selectedMyWorry.id,
      replyId: reply.id,
    }));
  };

  return (
    <MyWorriesScreen
      state={myWorriesError
        ? { status: 'error', message: myWorriesError, canRetry: false }
        : isLoadingMyWorries
          ? { status: 'loading', label: '작성한 고민을 불러오고 있습니다.' }
          : myWorries.length === 0
            ? { status: 'empty', message: '아직 작성한 고민이 없어요.' }
            : { status: 'ready' }}
      items={myWorries.map(worry => mapMyWorryToListItem({
        worry,
        selectedWorryId: props.selectedMyWorry?.id,
      }))}
      selectedWorry={props.selectedMyWorry ? {
        worryId: props.selectedMyWorry.id,
        content: props.selectedMyWorry.content,
        repliesState: repliesForWorryError
          ? { status: 'error', message: repliesForWorryError, canRetry: false }
          : isLoadingRepliesForWorry
            ? { status: 'loading', label: '도착한 답장을 불러오고 있습니다.' }
            : repliesWithWorryFallback.length === 0
              ? { status: 'empty', message: '아직 이 고민에 도착한 답장이 없어요.' }
              : { status: 'ready' },
        replies: repliesWithWorryFallback.map(mapReceivedReplyToListItem),
      } : undefined}
      onWriteWorry={() => props.setView(routeToWriteWorry())}
      onSelectWorry={selectWorry}
      onSelectReply={selectReply}
    />
  );
}
