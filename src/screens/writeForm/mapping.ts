import { WORRY_CATEGORIES, type WorryCategory } from '@midnight-radio/domain';
import type { ContentValidationResult } from '../../services/validation/content';
import type { HomeWorryFeedTimestamp } from '../../services/homeWorryFeed/types';
import type { SelectedReceivedWorry } from '../receivedWorries/ReceivedWorriesContainer';
import type { DisplayDate, ScreenModerationState, SubmitDisabledReason } from '../shared/contract';
import type { OriginalWorrySummaryProps, WriteDraftContract } from './contract';

export function buildWriteDraftContract(params: {
  readonly value: string;
  readonly maxLength: number;
  readonly validation: ContentValidationResult;
  readonly moderation: ScreenModerationState;
  readonly isProcessing: boolean;
}): WriteDraftContract {
  const submitDisabledReason = resolveSubmitDisabledReason({
    validation: params.validation,
    moderation: params.moderation,
    isProcessing: params.isProcessing,
  });

  return {
    value: params.value,
    characterCount: params.value.trim().length,
    maxLength: params.maxLength,
    validation: params.validation.status === 'valid'
      ? { status: 'valid' }
      : { status: 'invalid', message: params.validation.message },
    moderation: params.moderation,
    errorMessage: params.moderation.status === 'failed' ? params.moderation.message : undefined,
    isProcessing: params.isProcessing,
    submitDisabledReason,
  };
}

export function mapSelectedWorryToOriginalWorrySummary(
  worry: SelectedReceivedWorry,
): OriginalWorrySummaryProps | null {
  if (!worry.deliveryId || !worry.worryId) return null;

  return {
    deliveryId: worry.deliveryId,
    worryId: worry.worryId,
    category: toWorryCategory(worry.category),
    bodyText: worry.refinedContent,
    receivedAt: displayDateFromTimestamp(worry.createdAt),
  };
}

function displayDateFromTimestamp(createdAt: HomeWorryFeedTimestamp | null | undefined): DisplayDate {
  const millis = createdAt?.toMillis?.();
  if (typeof millis !== 'number' || Number.isNaN(millis)) {
    return { label: '수신됨' };
  }

  return {
    label: new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(millis)),
    isoValue: new Date(millis).toISOString(),
  };
}

function resolveSubmitDisabledReason(params: {
  readonly validation: ContentValidationResult;
  readonly moderation: ScreenModerationState;
  readonly isProcessing: boolean;
}): SubmitDisabledReason | undefined {
  if (params.isProcessing) return 'processing';
  if (params.moderation.status === 'checking') return 'moderation-pending';
  if (params.validation.status === 'valid') return undefined;
  if (params.validation.code === 'empty') return 'empty';
  if (params.validation.code === 'too_long') return 'too-long';
  return 'invalid';
}

function toWorryCategory(category: string | undefined): WorryCategory {
  return WORRY_CATEGORIES.includes(category as WorryCategory)
    ? category as WorryCategory
    : WORRY_CATEGORIES[0];
}
