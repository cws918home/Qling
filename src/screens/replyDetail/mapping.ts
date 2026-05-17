import type {
  ExistingFeedbackState,
  FeedbackValue,
  ReplyDetailAnswerProps,
  ReplyDetailScreenProps,
  ReplyDetailVariant,
  ReplyDetailWorryProps,
} from './contract';
import type { ReplyReadModelItem } from '../../services/myWorries';
import { routeName, type AppRouteViewState } from '../../services/appShell/prdNavigationPolicy';

function dateLabel(value: { toMillis?: () => number } | null | undefined): string {
  if (!value?.toMillis) return '';
  return new Date(value.toMillis()).toLocaleDateString('ko-KR');
}

export function mapFeedbackToDetailState(feedback: ReplyReadModelItem['feedback']): ExistingFeedbackState {
  if (feedback === 'helpful') return { status: 'submitted', value: 'like' };
  if (feedback === 'not_helpful') return { status: 'submitted', value: 'dislike' };
  return { status: 'none' };
}

export function mapFeedbackValueToLegacy(value: FeedbackValue): 'helpful' | 'not_helpful' {
  return value === 'like' ? 'helpful' : 'not_helpful';
}

export function mapReplyToDetailProps(params: {
  readonly reply: ReplyReadModelItem | null;
  readonly variant: ReplyDetailVariant;
  readonly originalWorryFallback?: string;
  readonly isLoading?: boolean;
}): Pick<ReplyDetailScreenProps, 'state' | 'originalWorry' | 'reply' | 'existingFeedback'> {
  if (!params.reply) {
    return {
      state: params.isLoading
        ? { status: 'loading', label: '답장을 불러오는 중입니다.' }
        : { status: 'empty', message: '선택한 답장을 찾을 수 없습니다.' },
      existingFeedback: { status: 'none' },
    };
  }

  const originalWorry: ReplyDetailWorryProps = {
    worryId: params.reply.worryId ?? '',
    category: '잡담',
    summaryText: params.reply.replyToContent ?? params.originalWorryFallback ?? params.reply.originalContent,
    bodyText: params.reply.replyToContent ?? params.originalWorryFallback ?? params.reply.originalContent,
    date: { label: dateLabel(params.reply.createdAt) },
    isUnread: params.reply.hasUnread,
  };
  const reply: ReplyDetailAnswerProps = {
    replyId: params.reply.id,
    bodyText: params.reply.refinedContent,
    date: { label: dateLabel(params.reply.createdAt) },
    replierDisplay: params.variant === 'my-answer-detail' ? 'me' : 'anonymous',
  };

  return {
    state: { status: 'ready' },
    originalWorry,
    reply,
    existingFeedback: mapFeedbackToDetailState(params.reply.feedback),
  };
}

export function selectReplyForDetailRoute(params: {
  readonly route: AppRouteViewState;
  readonly selectedReply: ReplyReadModelItem | null;
  readonly productionReplies: readonly ReplyReadModelItem[];
  readonly isProductionReadModelLoading: boolean;
}): ReplyReadModelItem | null {
  const currentRoute = routeName(params.route);
  const routeReplyId = typeof params.route === 'string' ? undefined : 'replyId' in params.route ? params.route.replyId : undefined;
  const selectedReplyId = routeReplyId ?? params.selectedReply?.id;
  if (!selectedReplyId) return null;

  const productionReply = params.productionReplies.find(reply => reply.id === selectedReplyId) ?? null;
  if (productionReply) return productionReply;

  if (params.isProductionReadModelLoading && params.selectedReply?.id === selectedReplyId) {
    return params.selectedReply;
  }

  if (typeof params.route === 'string' && params.selectedReply?.id === selectedReplyId && (
    currentRoute === 'received_answer_detail'
    || currentRoute === 'read_received_reply'
    || currentRoute === 'answer_check'
    || currentRoute === 'my_answer_detail'
    || currentRoute === 'read_my_reply'
  )) {
    return params.selectedReply;
  }

  return null;
}
