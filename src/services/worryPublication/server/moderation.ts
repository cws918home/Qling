import { WORRY_CATEGORY_SET } from '@midnight-radio/domain';
import {
  getModerationRejectionCopy,
  type ModerationReasonCode,
} from '../../moderation/rejectionCopy';
import type { WorryModerationProvider } from './types';

export const WORRY_MODERATION_PROVIDER = 'openai';
export const WORRY_MODERATION_MODEL = 'gpt-5.4-mini';

export type WorryRejectionReasonCode = ModerationReasonCode;

export type NormalizedPublicationModeration =
  | {
      status: 'approved';
      rawProviderResponse: unknown;
      rawCategories: string[];
      validCategories: string[];
      invalidCategories: string[];
      matchingCategories: string[];
    }
  | {
      status: 'rejected';
      reasonCode: WorryRejectionReasonCode;
      userMessage: string;
      helpMessage: string | null;
      rawProviderResponse: unknown;
      rawCategories: string[];
      validCategories: string[];
      invalidCategories: string[];
      matchingCategories: string[];
    }
  | { status: 'invalid'; rawProviderResponse: unknown };

export type ModerationPublicationResult =
  | Exclude<NormalizedPublicationModeration, { status: 'invalid' }>
  | { status: 'provider_invalid'; rawProviderResponse: unknown }
  | { status: 'provider_error'; error: unknown };

function nonEmptyTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeRawCategories(rawCategories: unknown): string[] {
  const values = Array.isArray(rawCategories)
    ? rawCategories
    : typeof rawCategories === 'string'
      ? rawCategories.split(',')
      : [];

  const categories: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = nonEmptyTrimmed(value);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    categories.push(trimmed);
  }
  return categories;
}

export function normalizeWorryModerationForPublication(raw: unknown): NormalizedPublicationModeration {
  if (!raw || typeof raw !== 'object') {
    return { status: 'invalid', rawProviderResponse: raw };
  }

  const result = raw as {
    status?: unknown;
    reason?: unknown;
    reasonCode?: unknown;
    userMessage?: unknown;
    helpMessage?: unknown;
    categories?: unknown;
    category?: unknown;
  };

  const rawCategories = normalizeRawCategories(result.categories ?? result.category);
  const validCategories = rawCategories.filter(category => WORRY_CATEGORY_SET.has(category));
  const invalidCategories = rawCategories.filter(category => !WORRY_CATEGORY_SET.has(category));

  if (result.status === 'approved') {
    return {
      status: 'approved',
      rawProviderResponse: raw,
      rawCategories,
      validCategories,
      invalidCategories,
      matchingCategories: validCategories.length > 0 ? validCategories : ['잡담'],
    };
  }

  if (result.status === 'rejected') {
    const reason = nonEmptyTrimmed(result.reasonCode) ?? nonEmptyTrimmed(result.reason);
    if (!reason) return { status: 'invalid', rawProviderResponse: raw };

    const copy = getModerationRejectionCopy(reason);

    return {
      status: 'rejected',
      reasonCode: copy.reasonCode,
      userMessage: copy.userMessage,
      helpMessage: copy.helpMessage,
      rawProviderResponse: raw,
      rawCategories,
      validCategories,
      invalidCategories,
      matchingCategories: [],
    };
  }

  return { status: 'invalid', rawProviderResponse: raw };
}

export async function moderateWorryForPublication(params: {
  content: string;
  provider: WorryModerationProvider;
}): Promise<ModerationPublicationResult> {
  try {
    const first = normalizeWorryModerationForPublication(await params.provider(params.content));
    if (first.status === 'approved' || first.status === 'rejected') return first;

    const second = normalizeWorryModerationForPublication(await params.provider(params.content, true));
    if (second.status === 'approved' || second.status === 'rejected') return second;

    return { status: 'provider_invalid', rawProviderResponse: second.rawProviderResponse };
  } catch (error) {
    return { status: 'provider_error', error };
  }
}
