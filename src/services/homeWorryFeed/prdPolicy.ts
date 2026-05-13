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
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function selectActivePrdAnswerFeedItems(params: {
  deliveries: PrdDeliveryDoc[];
  worriesById: Map<string, PrdWorryDoc>;
  profileUid: string;
}): PrdAnswerFeedItem[] {
  return params.deliveries.flatMap(delivery => {
    if (delivery.recipientUid !== params.profileUid) return [];
    if (delivery.status !== 'active') return [];
    if (delivery.answeredAt || delivery.passedAt || delivery.hiddenAt) return [];
    if (!delivery.worryId || !delivery.authorUid || !delivery.recipientUid) return [];

    const worry = params.worriesById.get(delivery.worryId);
    if (!worry || typeof worry.content !== 'string') return [];

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
    }];
  }).sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
}

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
  };
}

export function selectAnswerFeedWithLegacyFallback(params: {
  prdFeedWorries: HomeWorryFeedLetter[];
  legacyFeedWorries: HomeWorryFeedLetter[];
}): HomeWorryFeedLetter[] {
  return params.prdFeedWorries.length > 0
    ? params.prdFeedWorries
    : params.legacyFeedWorries;
}
