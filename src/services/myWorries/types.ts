export interface TimestampLike {
  toMillis?: () => number;
}

export interface MyWorryListItem {
  id: string;
  authorUid: string;
  content: string;
  status?: string;
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
  createdAt?: TimestampLike | null;
  isAiGenerated?: boolean;
  isExampleReply?: boolean;
}

export interface ReplyReadStateDoc {
  replyId?: string;
  readByAuthorAt?: unknown;
}

export interface LegacyLettersReplyDoc {
  id: string;
  senderId?: string;
  receiverId?: string;
  originalContent?: string;
  refinedContent?: string;
  type?: string;
  replyTo?: string;
  replyToContent?: string;
  createdAt?: TimestampLike | null;
  isRead?: boolean;
  feedback?: 'helpful' | 'not_helpful' | null;
  publisherComment?: string;
  deliveryId?: string;
  migratedReplyId?: string;
  isAiGenerated?: boolean;
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
  source: 'prd_replies' | 'legacy_letters';
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
