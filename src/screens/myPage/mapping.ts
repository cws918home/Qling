import type { WorryCategory } from '@midnight-radio/domain';
import type {
  MyAnswerListItemProps,
  MyPageProfileSummaryProps,
  MyWorryListItemProps,
  PushPermissionStatus,
  ReceivedReplyListItemProps,
} from './contract';
import { HELPED_COUNT_LABEL } from './contract';
import type { MyWorryListItem, ReplyReadModelItem } from '../../services/myWorries';

export type MyPageProfileInput = {
  readonly nickname?: string;
  readonly interests?: readonly string[];
  readonly age?: number;
  readonly helpedCount?: number;
};

export function mapProfileToMyPageSummary(profile: MyPageProfileInput | null): MyPageProfileSummaryProps {
  return {
    nickname: profile?.nickname?.trim() || '나',
    interests: (profile?.interests ?? []) as readonly WorryCategory[],
    ageLabel: typeof profile?.age === 'number' ? `${profile.age}세` : undefined,
    helpedCount: Math.max(0, profile?.helpedCount ?? 0),
    helpedCountLabel: HELPED_COUNT_LABEL,
    profileMotif: {
      kind: 'visual-only',
      label: 'Profile motif',
    },
  };
}

export function mapPushStatus(params: {
  readonly permission?: NotificationPermission | 'unsupported';
  readonly registrationStatus?: string;
}): { status: PushPermissionStatus; message?: string } {
  if (params.permission === 'unsupported') return { status: 'unsupported', message: '이 브라우저는 알림을 지원하지 않습니다.' };
  if (params.registrationStatus === 'registered') return { status: 'registered', message: '알림 등록이 완료되었습니다.' };
  if (params.registrationStatus === 'error') return { status: 'error', message: '알림 등록에 실패했습니다.' };
  if (params.permission === 'granted') return { status: 'granted', message: '알림 권한이 허용되었습니다.' };
  if (params.permission === 'denied') return { status: 'denied', message: '브라우저 설정에서 알림 권한을 허용해 주세요.' };
  return { status: 'default', message: '알림 권한 설정이 필요합니다.' };
}

export function mapMyGivenReplyToListItem(reply: ReplyReadModelItem): MyAnswerListItemProps {
  return {
    replyId: reply.id,
    deliveryId: reply.deliveryId,
    worryId: reply.worryId,
    previewText: reply.refinedContent,
    feedbackLabel: reply.feedback === 'helpful' ? '받은 하트' : reply.feedback === 'not_helpful' ? '확인됨' : undefined,
  };
}

export function mapMyWorryToListItem(params: {
  readonly worry: MyWorryListItem;
  readonly selectedWorryId?: string;
}): MyWorryListItemProps {
  return {
    worryId: params.worry.id,
    contentPreview: params.worry.content,
    categoryLabel: params.worry.categories.join(', ') || '기타',
    replyCount: params.worry.humanReplyCount ?? 0,
    hasUnreadReplies: params.worry.hasUnreadReplies,
    isSelected: params.worry.id === params.selectedWorryId,
  };
}

export function mapReceivedReplyToListItem(reply: ReplyReadModelItem): ReceivedReplyListItemProps {
  return {
    replyId: reply.id,
    worryId: reply.worryId,
    previewText: reply.refinedContent,
    hasUnread: reply.hasUnread === true,
  };
}
