import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { clearDraft, getDraft, setDraft, type DraftMap } from '../../services/drafts/contentDrafts';
import { CONTENT_MAX_LENGTH, validateDraftContent } from '../../services/validation/content';
import { submitReplyFeedbackWithProductionAdapters } from '../../services/replyFeedback/production';
import type { ReplyFeedback } from '../../services/replyFeedback/types';
import type { ReplyReadModelItem } from '../../services/myWorries';
import {
  backRouteFromMyReplyDetail,
  backRouteFromReceivedReplyDetail,
  routeAfterFeedbackPublish,
  type AppRouteViewState,
} from '../../services/appShell/prdNavigationPolicy';
import { ReplyDetailScreen } from './ReplyDetailScreen';
import { mapFeedbackValueToLegacy, mapReplyToDetailProps } from './mapping';
import type { FeedbackValue, ReplyDetailVariant } from './contract';

export type ReplyDetailContainerMode = 'received-reply' | 'my-answer';

export type ReplyDetailContainerProps = {
  readonly mode: ReplyDetailContainerMode;
  readonly route: AppRouteViewState;
  readonly selectedReply: ReplyReadModelItem | null;
  readonly setSelectedReply: Dispatch<SetStateAction<ReplyReadModelItem | null>>;
  readonly selectedMyWorryContent?: string;
  readonly setView: (view: AppRouteViewState) => void;
  readonly setFilterAlert: (message: string) => void;
};

export function ReplyDetailContainer(props: ReplyDetailContainerProps) {
  const [feedbackCommentDrafts, setFeedbackCommentDrafts] = useState<DraftMap>({});
  const [isFeedbackProcessing, setIsFeedbackProcessing] = useState(false);
  const [isCommentProcessing, setIsCommentProcessing] = useState(false);
  const [moderationMessage, setModerationMessage] = useState<string | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const selectedFeedbackRef = useRef<FeedbackValue>('like');
  const variant: ReplyDetailVariant = props.mode === 'my-answer' ? 'my-answer-detail' : 'received-answer-detail';
  const commentDraft = props.selectedReply ? getDraft(feedbackCommentDrafts, props.selectedReply.id) : '';
  const validation = validateDraftContent(commentDraft, 'feedback_comment');
  const detailProps = mapReplyToDetailProps({
    reply: props.selectedReply,
    variant,
    originalWorryFallback: props.selectedMyWorryContent,
  });

  const submitFeedback = async (feedbackType: ReplyFeedback, comment?: string) => {
    if (!props.selectedReply) return null;

    const result = await submitReplyFeedbackWithProductionAdapters({
      reply: props.selectedReply,
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
    if (!props.selectedReply || validation.status !== 'valid') return;

    setFailureMessage(null);
    setModerationMessage(null);
    setIsCommentProcessing(true);
    try {
      const result = await submitFeedback('helpful', commentDraft);
      if (result?.status === 'rejected') return;
      setFeedbackCommentDrafts(prev => clearDraft(prev, props.selectedReply?.id ?? ''));
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
      existingFeedback={props.selectedReply?.feedback
        ? {
          status: 'submitted',
          value: props.selectedReply.feedback === 'helpful' ? 'like' : 'dislike',
          comment: props.selectedReply.publisherComment,
        }
        : detailProps.existingFeedback}
      selectedFeedback={selectedFeedbackRef.current}
      commentDraft={commentDraft}
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
      }}
      onFeedbackSubmit={onFeedbackSubmit}
      onCommentChange={value => {
        if (!props.selectedReply) return;
        setFeedbackCommentDrafts(prev => setDraft(prev, props.selectedReply?.id ?? '', value));
      }}
      onCommentSubmit={onCommentSubmit}
    />
  );
}
