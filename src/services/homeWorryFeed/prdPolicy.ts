import type {
  HomeWorryFeedLetter,
  HomeWorryFeedTimestamp,
  PrdAnswerFeedItem,
} from './types';

export interface PrdDeliveryDoc {
  id: string;
  worryId?: string;
  authorUid?: string;
  recipientUid?: string;
  status?: string;
  answeredAt?: unknown;
  passedAt?: unknown;
  hiddenAt?: unknown;
}

export interface PrdWorryDoc {
  id: string;
  content?: string;
  matchingCategories?: unknown;
  validCategories?: unknown;
  createdAt?: HomeWorryFeedTimestamp | null;
  status?: string;
  hiddenAt?: unknown;
}

export interface DeliveryReadStateDoc {
  deliveryId?: string;
  readAt?: unknown;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function isHiddenDelivery(delivery: Pick<PrdDeliveryDoc, 'status' | 'hiddenAt'>): boolean {
  return delivery.status === 'hidden' || Boolean(delivery.hiddenAt);
}

export function isHiddenWorry(worry: Pick<PrdWorryDoc, 'status' | 'hiddenAt'>): boolean {
  return worry.status === 'hidden' || Boolean(worry.hiddenAt);
}

export function selectVisibleAnswerFeedItems(params: {
  deliveries: PrdDeliveryDoc[];
  worriesById: Map<string, PrdWorryDoc>;
  readStatesByDeliveryId?: Map<string, DeliveryReadStateDoc>;
  profileUid: string;
}): PrdAnswerFeedItem[] {
  return params.deliveries.flatMap(delivery => {
    if (delivery.recipientUid !== params.profileUid) return [];
    if (delivery.status !== 'active') return [];
    if (delivery.answeredAt || delivery.passedAt || isHiddenDelivery(delivery)) return [];
    if (!delivery.worryId || !delivery.authorUid || !delivery.recipientUid) return [];

    const worry = params.worriesById.get(delivery.worryId);
    if (!worry || typeof worry.content !== 'string') return [];
    if (isHiddenWorry(worry)) return [];

    const matchingCategories = stringArray(worry.matchingCategories);
    const validCategories = stringArray(worry.validCategories);

    return [{
      id: delivery.id,
      deliveryId: delivery.id,
      worryId: delivery.worryId,
      authorUid: delivery.authorUid,
      recipientUid: delivery.recipientUid,
      originalContent: worry.content,
      refinedContent: worry.content,
      categories: matchingCategories.length > 0 ? matchingCategories : validCategories,
      createdAt: worry.createdAt ?? null,
      status: 'active' as const,
      source: 'prd_delivery' as const,
      hasUnread: !params.readStatesByDeliveryId?.has(delivery.id),
    }];
  }).sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
}

export const selectActivePrdAnswerFeedItems = selectVisibleAnswerFeedItems;

export function adaptPrdAnswerFeedItemToHomeWorryFeedLetter(
  item: PrdAnswerFeedItem
): HomeWorryFeedLetter {
  return {
    id: item.deliveryId,
    senderId: item.authorUid,
    receiverId: item.recipientUid,
    originalContent: item.originalContent,
    refinedContent: item.refinedContent,
    categories: item.categories,
    category: item.categories[0],
    createdAt: item.createdAt,
    source: item.source,
    deliveryId: item.deliveryId,
    worryId: item.worryId,
    authorUid: item.authorUid,
    recipientUid: item.recipientUid,
    status: item.status,
    hasUnread: item.hasUnread,
  };
}
