import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from 'firebase/auth';
import {
  clearStoredDraft,
  feedbackCommentDraftKey,
  getStoredDraft,
  setStoredDraft,
} from '../../services/drafts/contentDrafts';
import { CONTENT_MAX_LENGTH, validateDraftContent } from '../../services/validation/content';
import { submitReplyFeedbackWithProductionAdapters } from '../../services/replyFeedback/production';
import type { ReplyFeedback } from '../../services/replyFeedback/types';
import {
  useMyGivenReplies,
  useRepliesForWorry,
  type ReplyReadModelItem,
} from '../../services/myWorries';
import {
  backRouteFromMyReplyDetail,
  backRouteFromReceivedReplyDetail,
  routeAfterFeedbackPublish,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { ReplyDetailScreen } from './ReplyDetailScreen';
import { mapFeedbackValueToLegacy, mapReplyToDetailProps, selectReplyForDetailRoute } from './mapping';
import type { FeedbackValue, ReplyDetailVariant } from './contract';

export type ReplyDetailContainerMode = 'received-reply' | 'my-answer';

export type ReplyDetailContainerProps = {
  readonly mode: ReplyDetailContainerMode;
  readonly user: User | null;
  readonly route: AppRouteViewState;
  readonly selectedReply: ReplyReadModelItem | null;
  readonly setSelectedReply: Dispatch<SetStateAction<ReplyReadModelItem | null>>;
  readonly selectedMyWorryContent?: string;
  readonly setView: (view: AppRouteViewState) => void;
  readonly setFilterAlert: (message: string) => void;
};

export function ReplyDetailContainer(props: ReplyDetailContainerProps) {
  const [isFeedbackProcessing, setIsFeedbackProcessing] = useState(false);
  const [isCommentProcessing, setIsCommentProcessing] = useState(false);
  const [moderationMessage, setModerationMessage] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [, rerenderDraft] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackValue>('like');
  const selectedFeedbackRef = useRef<FeedbackValue>('like');
  const variant: ReplyDetailVariant = props.mode === 'my-answer' ? 'my-answer-detail' : 'received-answer-detail';
  const routeWorryId = typeof props.route === 'string' ? undefined : 'worryId' in props.route ? props.route.worryId : undefined;
  const { repliesForWorry, isLoadingRepliesForWorry } = useRepliesForWorry({
    user: props.mode === 'received-reply' ? props.user : null,
    worryId: props.mode === 'received-reply'
      ? routeWorryId ?? props.selectedReply?.worryId ?? null
      : null,
  });
  const { myGivenReplies, isLoadingMyGivenReplies } = useMyGivenReplies({
    user: props.mode === 'my-answer' ? props.user : null,
  });
  const detailReply = selectReplyForDetailRoute({
    route: props.route,
    selectedReply: props.selectedReply,
    productionReplies: props.mode === 'my-answer' ? myGivenReplies : repliesForWorry,
    isProductionReadModelLoading: props.mode === 'my-answer' ? isLoadingMyGivenReplies : isLoadingRepliesForWorry,
  });
  const commentDraftKey = detailReply ? feedbackCommentDraftKey(detailReply.id) : null;
  const commentDraft = getStoredDraft(commentDraftKey);
  const validation = validateDraftContent(commentDraft, 'feedback_comment');
  const detailProps = mapReplyToDetailProps({
    reply: detailReply,
    variant,
    originalWorryFallback: props.selectedMyWorryContent,
    isLoading: props.mode === 'my-answer' ? isLoadingMyGivenReplies : isLoadingRepliesForWorry,
  });
  const existingFeedback = detailReply?.feedback
    ? {
      status: 'submitted' as const,
      value: detailReply.feedback === 'helpful' ? 'like' as const : 'dislike' as const,
      comment: detailReply.publisherComment,
    }
    : detailProps.existingFeedback;

  const submitFeedback = async (feedbackType: ReplyFeedback, comment?: string) => {
    if (!detailReply) return null;

    const result = await submitReplyFeedbackWithProductionAdapters({
      reply: detailReply,
      feedbackType,
      comment,
    });
    if (result.status === 'rejected') {
      const message = result.userMessage ?? result.reason ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      const fullMessage = result.helpMessage ? `${message}\n\n${result.helpMessage}` : message;
      setModerationMessage(fullMessage);
      props.setFilterAlert(fullMessage);
      return result;
    }

    props.setSelectedReply(prev => prev ? {
      ...prev,
      feedback: result.feedback ?? feedbackType,
      publisherComment: comment?.trim() || prev.publisherComment,
    } : null);
    props.setView(routeAfterFeedbackPublish(props.route));
    return result;
  };

  const onFeedbackSubmit = async () => {
    if (isFeedbackProcessing || existingFeedback.status === 'submitted') return;
    setFailureMessage(null);
    setModerationMessage(null);
    setIsFeedbackProcessing(true);
    try {
      await submitFeedback(mapFeedbackValueToLegacy(selectedFeedbackRef.current));
    } catch (error) {
      console.error(error);
      setFailureMessage('전송 실패');
      props.setFilterAlert('전송 실패');
    } finally {
      setIsFeedbackProcessing(false);
    }
  };

  const onCommentSubmit = async () => {
    if (!detailReply || isCommentProcessing || validation.status !== 'valid') return;

    setFailureMessage(null);
    setModerationMessage(null);
    setIsCommentProcessing(true);
    try {
      const result = await submitFeedback('helpful', commentDraft);
      if (result?.status === 'rejected') return;
      if (commentDraftKey) {
        clearStoredDraft(commentDraftKey);
        rerenderDraft(value => value + 1);
      }
    } catch (error) {
      console.error(error);
      setFailureMessage('전송 실패');
      props.setFilterAlert('전송 실패');
    } finally {
      setIsCommentProcessing(false);
    }
  };

  return (
    <ReplyDetailScreen
      variant={variant}
      state={detailProps.state}
      originalWorry={detailProps.originalWorry}
      reply={detailProps.reply}
      existingFeedback={existingFeedback}
      selectedFeedback={selectedFeedback}
      commentDraft={commentDraft}
      commentMaxLength={CONTENT_MAX_LENGTH}
      commentValidation={failureMessage
        ? { status: 'invalid', message: failureMessage }
        : validation.status === 'validation_error' || commentDraft.trim().length > CONTENT_MAX_LENGTH
          ? { status: 'invalid', message: validation.status === 'validation_error' ? validation.message : '내용이 너무 깁니다.' }
          : { status: 'valid' }}
      commentModeration={moderationMessage ? { status: 'rejected', reason: moderationMessage } : { status: 'approved' }}
      isFeedbackProcessing={isFeedbackProcessing}
      isCommentProcessing={isCommentProcessing}
      onBack={() => props.setView(props.mode === 'my-answer' ? backRouteFromMyReplyDetail() : backRouteFromReceivedReplyDetail())}
      onFeedbackChange={(value) => {
        selectedFeedbackRef.current = value;
        setSelectedFeedback(value);
      }}
      onFeedbackSubmit={onFeedbackSubmit}
      onCommentChange={value => {
        if (!commentDraftKey) return;
        setStoredDraft(commentDraftKey, value);
        rerenderDraft(current => current + 1);
      }}
      onCommentSubmit={onCommentSubmit}
    />
  );
}
