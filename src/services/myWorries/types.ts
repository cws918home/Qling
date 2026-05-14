export interface TimestampLike {
  toMillis?: () => number;
}

export interface MyWorryListItem {
  id: string;
  authorUid: string;
  content: string;
  status?: string;
  hiddenAt?: unknown;
  categories: string[];
  createdAt: TimestampLike | null;
  humanReplyCount?: number;
  unreadReplyCount: number;
  hasUnreadReplies: boolean;
  source: 'prd_worries';
}

export interface PrdWorryDoc {
  id: string;
  authorUid?: string;
  content?: string;
  status?: string;
  hiddenAt?: unknown;
  rawCategories?: unknown;
  validCategories?: unknown;
  matchingCategories?: unknown;
  createdAt?: TimestampLike | null;
  humanReplyCount?: unknown;
  hasHumanReply?: unknown;
}

export interface PrdReplyDoc {
  id: string;
  deliveryId?: string;
  worryId?: string;
  authorUid?: string;
  replierUid?: string;
  content?: string;
  status?: string;
  hiddenAt?: unknown;
  createdAt?: TimestampLike | null;
  isAiGenerated?: boolean;
  isExampleReply?: boolean;
  feedbackType?: 'like';
  likedAt?: TimestampLike | null;
}

export interface PrdFeedbackDoc {
  id: string;
  replyId?: string;
  worryId?: string;
  publisherUid?: string;
  replierUid?: string;
  type?: 'like' | 'dislike';
  comment?: string | null;
  commentVisibility?: 'replier' | 'admin_only' | 'none';
  commentModerationLogId?: string | null;
  helpedCountApplied?: boolean;
}

export interface ReplyReadStateDoc {
  replyId?: string;
  readByAuthorAt?: unknown;
}

export interface ReplyReadModelItem {
  id: string;
  deliveryId?: string;
  worryId?: string;
  authorUid?: string;
  replierUid?: string;
  content: string;
  status?: string;
  createdAt: TimestampLike | null;
  source: 'prd_replies';
  senderId: string;
  receiverId: string;
  originalContent: string;
  refinedContent: string;
  replyTo?: string;
  replyToContent?: string;
  isRead: boolean;
  hasUnread?: boolean;
  feedback?: 'helpful' | 'not_helpful' | null;
  publisherComment?: string;
  isAiGenerated?: boolean;
  isExampleReply?: boolean;
}

export type ReplyReadModelMode = 'received_for_worry' | 'given_by_me';
