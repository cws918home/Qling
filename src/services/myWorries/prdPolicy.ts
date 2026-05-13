import type {
  LegacyLettersReplyDoc,
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

export function selectMyWorries(params: {
  worries: PrdWorryDoc[];
  userUid: string;
  replies?: PrdReplyDoc[];
  readStatesByReplyId?: Map<string, ReplyReadStateDoc>;
}): MyWorryListItem[] {
  const unreadCounts = new Map<string, number>();
  for (const reply of params.replies ?? []) {
    if (!reply.id || reply.authorUid !== params.userUid || !reply.worryId) continue;
    if (reply.status === 'hidden') continue;
    if (params.readStatesByReplyId?.has(reply.id)) continue;
    unreadCounts.set(reply.worryId, (unreadCounts.get(reply.worryId) ?? 0) + 1);
  }

  const selected = params.worries.flatMap(worry => {
    if (worry.authorUid !== params.userUid) return [];
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

export function selectRepliesForWorry(params: {
  replies: PrdReplyDoc[];
  userUid: string;
  worryId: string;
  readStatesByReplyId?: Map<string, ReplyReadStateDoc>;
}): ReplyReadModelItem[] {
  return adaptPrdReplies(params.replies.filter(reply => (
    reply.worryId === params.worryId
    && reply.authorUid === params.userUid
  )), params.readStatesByReplyId);
}

export function selectMyGivenReplies(params: {
  replies: PrdReplyDoc[];
  userUid: string;
}): ReplyReadModelItem[] {
  return adaptPrdReplies(params.replies.filter(reply => reply.replierUid === params.userUid));
}

export function adaptPrdReplies(
  replies: PrdReplyDoc[],
  readStatesByReplyId?: Map<string, ReplyReadStateDoc>
): ReplyReadModelItem[] {
  return sortNewestFirst(replies.flatMap(reply => {
    if (!reply.worryId || !reply.authorUid || !reply.replierUid) return [];
    if (typeof reply.content !== 'string') return [];

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
    }];
  }));
}

export function adaptLegacyLettersReplies(replies: LegacyLettersReplyDoc[]): ReplyReadModelItem[] {
  return sortNewestFirst(replies.flatMap(reply => {
    if (reply.type !== 'reply') return [];
    if (!reply.senderId || !reply.receiverId) return [];

    const content = reply.refinedContent ?? reply.originalContent;
    if (typeof content !== 'string') return [];

    return [{
      id: reply.id,
      deliveryId: reply.deliveryId,
      worryId: reply.replyTo,
      replierUid: reply.senderId,
      authorUid: reply.receiverId,
      content,
      createdAt: reply.createdAt ?? null,
      source: 'legacy_letters' as const,
      senderId: reply.senderId,
      receiverId: reply.receiverId,
      originalContent: reply.originalContent ?? content,
      refinedContent: content,
      replyTo: reply.replyTo,
      replyToContent: reply.replyToContent,
      isRead: reply.isRead ?? false,
      feedback: reply.feedback,
      publisherComment: reply.publisherComment,
      isAiGenerated: reply.isAiGenerated,
    }];
  }));
}

function reliableSharedIdentity(item: ReplyReadModelItem): string | null {
  if (item.deliveryId) return `delivery:${item.deliveryId}`;
  return null;
}

export function composeReplyReadModel(params: {
  prdReplies: ReplyReadModelItem[];
  legacyLettersReplies?: ReplyReadModelItem[];
  mode: ReplyReadModelMode;
}): ReplyReadModelItem[] {
  void params.mode;

  const prdIdentities = new Set(
    params.prdReplies
      .map(reliableSharedIdentity)
      .filter((identity): identity is string => identity !== null)
  );
  const legacyReplies = params.legacyLettersReplies ?? [];
  const nonDuplicateLegacyReplies = legacyReplies.filter(reply => {
    const identity = reliableSharedIdentity(reply);
    return !identity || !prdIdentities.has(identity);
  });

  return sortNewestFirst([...params.prdReplies, ...nonDuplicateLegacyReplies]);
}
