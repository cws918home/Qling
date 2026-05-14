import type {
  PrdFeedbackDoc,
  MyWorryListItem,
  PrdReplyDoc,
  PrdWorryDoc,
  ReplyReadStateDoc,
  ReplyReadModelItem,
  ReplyReadModelMode,
  TimestampLike,
} from './types';

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function timestampMillis(value: TimestampLike | null | undefined): number {
  return value?.toMillis ? value.toMillis() : 0;
}

function sortNewestFirst<T extends { createdAt?: TimestampLike | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
}

export function isHiddenWorry(worry: Pick<PrdWorryDoc, 'status' | 'hiddenAt'>): boolean {
  return worry.status === 'hidden' || Boolean(worry.hiddenAt);
}

export function isHiddenReply(reply: Pick<PrdReplyDoc, 'status' | 'hiddenAt'>): boolean {
  return reply.status === 'hidden' || Boolean(reply.hiddenAt);
}

export function selectVisibleMyWorries(params: {
  worries: PrdWorryDoc[];
  userUid: string;
  replies?: PrdReplyDoc[];
  readStatesByReplyId?: Map<string, ReplyReadStateDoc>;
}): MyWorryListItem[] {
  const unreadCounts = new Map<string, number>();
  for (const reply of params.replies ?? []) {
    if (!reply.id || reply.authorUid !== params.userUid || !reply.worryId) continue;
    if (isHiddenReply(reply)) continue;
    if (params.readStatesByReplyId?.has(reply.id)) continue;
    unreadCounts.set(reply.worryId, (unreadCounts.get(reply.worryId) ?? 0) + 1);
  }

  const selected = params.worries.flatMap(worry => {
    if (worry.authorUid !== params.userUid) return [];
    if (isHiddenWorry(worry)) return [];
    if (typeof worry.content !== 'string') return [];

    const matchingCategories = stringArray(worry.matchingCategories);
    const validCategories = stringArray(worry.validCategories);
    const rawCategories = stringArray(worry.rawCategories);
    const humanReplyCount = typeof worry.humanReplyCount === 'number'
      ? worry.humanReplyCount
      : undefined;

    return [{
      id: worry.id,
      authorUid: worry.authorUid,
      content: worry.content,
      status: worry.status,
      categories: matchingCategories.length > 0
        ? matchingCategories
        : validCategories.length > 0
          ? validCategories
          : rawCategories,
      createdAt: worry.createdAt ?? null,
      humanReplyCount,
      unreadReplyCount: unreadCounts.get(worry.id) ?? 0,
      hasUnreadReplies: (unreadCounts.get(worry.id) ?? 0) > 0,
      source: 'prd_worries' as const,
    }];
  });

  return sortNewestFirst(selected);
}

export const selectMyWorries = selectVisibleMyWorries;

export function selectVisibleRepliesForWorry(params: {
  replies: PrdReplyDoc[];
  userUid: string;
  worryId: string;
  readStatesByReplyId?: Map<string, ReplyReadStateDoc>;
  feedbacksByReplyId?: Map<string, PrdFeedbackDoc>;
}): ReplyReadModelItem[] {
  const visibleReplies = params.replies.filter(reply => {
    if (isHiddenReply(reply)) return false;
    if (
    reply.worryId === params.worryId
    && reply.authorUid === params.userUid
    && reply.publisherVisible !== false
    ) {
      return params.feedbacksByReplyId?.get(reply.id)?.type !== 'dislike';
    }
    return false;
  });

  return adaptPrdReplies(visibleReplies, params.readStatesByReplyId, params.feedbacksByReplyId);
}

export const selectRepliesForWorry = selectVisibleRepliesForWorry;

export function selectVisibleMyGivenReplies(params: {
  replies: PrdReplyDoc[];
  userUid: string;
  feedbacksByReplyId?: Map<string, PrdFeedbackDoc>;
}): ReplyReadModelItem[] {
  return adaptPrdReplies(
    params.replies.filter(reply => reply.replierUid === params.userUid && !isHiddenReply(reply)),
    undefined,
    params.feedbacksByReplyId
  );
}

export const selectMyGivenReplies = selectVisibleMyGivenReplies;

export function adaptPrdReplies(
  replies: PrdReplyDoc[],
  readStatesByReplyId?: Map<string, ReplyReadStateDoc>,
  feedbacksByReplyId?: Map<string, PrdFeedbackDoc>
): ReplyReadModelItem[] {
  return sortNewestFirst(replies.flatMap(reply => {
    if (!reply.worryId || !reply.authorUid || !reply.replierUid) return [];
    if (typeof reply.content !== 'string') return [];
    const feedback = feedbacksByReplyId?.get(reply.id);

    return [{
      id: reply.id,
      deliveryId: reply.deliveryId,
      worryId: reply.worryId,
      authorUid: reply.authorUid,
      replierUid: reply.replierUid,
      content: reply.content,
      status: reply.status,
      createdAt: reply.createdAt ?? null,
      source: 'prd_replies' as const,
      senderId: reply.replierUid,
      receiverId: reply.authorUid,
      originalContent: reply.content,
      refinedContent: reply.content,
      replyTo: reply.worryId,
      isRead: readStatesByReplyId ? readStatesByReplyId.has(reply.id) : true,
      hasUnread: readStatesByReplyId ? !readStatesByReplyId.has(reply.id) : false,
      isAiGenerated: reply.isAiGenerated,
      isExampleReply: reply.isExampleReply,
      feedback: feedback?.type === 'like'
        ? 'helpful'
        : feedback?.type === 'dislike'
          ? 'not_helpful'
          : reply.feedbackType === 'like'
            ? 'helpful'
            : undefined,
      publisherComment: feedback?.commentVisibility === 'replier' && typeof feedback.comment === 'string'
        ? feedback.comment
        : undefined,
    }];
  }));
}

export function composeReplyReadModel(params: {
  prdReplies: ReplyReadModelItem[];
  mode: ReplyReadModelMode;
}): ReplyReadModelItem[] {
  void params.mode;
  return sortNewestFirst(params.prdReplies);
}
