import type {
  ExistingFeedbackState,
  FeedbackValue,
  ReplyDetailAnswerProps,
  ReplyDetailScreenProps,
  ReplyDetailVariant,
  ReplyDetailWorryProps,
} from './contract';
import type { ReplyReadModelItem } from '../../services/myWorries';

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
}): Pick<ReplyDetailScreenProps, 'state' | 'originalWorry' | 'reply' | 'existingFeedback'> {
  if (!params.reply) {
    return {
      state: { status: 'empty', message: '선택한 답장을 찾을 수 없습니다.' },
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
