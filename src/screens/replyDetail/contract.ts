import type { WorryCategory } from '@midnight-radio/domain';
import type {
  DisplayDate,
  ScreenAsyncState,
  ScreenModerationState,
  ScreenValidationState,
} from '../shared/contract';

export type ReplyDetailVariant = 'received-answer-detail' | 'my-answer-detail';

export type FeedbackValue = 'like' | 'dislike';

export type ExistingFeedbackState =
  | { readonly status: 'none' }
  | { readonly status: 'submitted'; readonly value: FeedbackValue; readonly comment?: string }
  | { readonly status: 'updating' };

export type ReplyDetailWorryProps = {
  readonly worryId: string;
  readonly category: WorryCategory;
  readonly summaryText: string;
  readonly bodyText?: string;
  readonly date: DisplayDate;
  readonly isUnread?: boolean;
};

export type ReplyDetailAnswerProps = {
  readonly replyId: string;
  readonly bodyText: string;
  readonly date: DisplayDate;
  readonly replierDisplay: 'anonymous' | 'me' | 'hidden';
};

export type ReplyDetailScreenProps = {
  readonly variant: ReplyDetailVariant;
  readonly state: ScreenAsyncState;
  readonly originalWorry?: ReplyDetailWorryProps;
  readonly reply?: ReplyDetailAnswerProps;
  readonly existingFeedback: ExistingFeedbackState;
  readonly selectedFeedback?: FeedbackValue;
  readonly commentDraft: string;
  readonly commentValidation: ScreenValidationState;
  readonly commentModeration: ScreenModerationState;
  readonly isFeedbackProcessing: boolean;
  readonly isCommentProcessing: boolean;
  readonly onBack: () => void;
  readonly onFeedbackChange: (value: FeedbackValue) => void;
  readonly onFeedbackSubmit: () => void;
  readonly onCommentChange: (value: string) => void;
  readonly onCommentSubmit: () => void;
};
