import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import { useMyGivenReplies, type ReplyReadModelItem } from '../../services/myWorries';
import {
  backRouteForRoute,
  routeToMyReplyDetail,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { MyAnswersScreen } from './MyAnswersScreen';
import { mapMyGivenReplyToListItem } from './mapping';
import type { MyAnswerListItemProps } from './contract';

export type MyAnswersContainerProps = {
  readonly user: User | null;
  readonly setView: (view: AppRouteViewState) => void;
  readonly setSelectedReply: Dispatch<SetStateAction<ReplyReadModelItem | null>>;
};

export function MyAnswersContainer(props: MyAnswersContainerProps) {
  const { myGivenReplies, isLoadingMyGivenReplies } = useMyGivenReplies({ user: props.user });
  const items = myGivenReplies.map(reply => mapMyGivenReplyToListItem(reply));

  const selectReply = (item: MyAnswerListItemProps) => {
    const reply = myGivenReplies.find(candidate => candidate.id === item.replyId);
    if (!reply) return;

    props.setSelectedReply(reply);
    props.setView(routeToMyReplyDetail({
      replyId: reply.id,
      deliveryId: reply.deliveryId,
      worryId: reply.worryId,
    }));
  };

  return (
    <MyAnswersScreen
      state={isLoadingMyGivenReplies
        ? { status: 'loading', label: '내가 쓴 답변을 불러오는 중입니다.' }
        : items.length === 0
          ? { status: 'empty', message: '아직 내가 보낸 위로가 없어요.' }
          : { status: 'ready' }}
      items={items}
      onBack={() => props.setView(backRouteForRoute('my_answers'))}
      onSelect={selectReply}
    />
  );
}
