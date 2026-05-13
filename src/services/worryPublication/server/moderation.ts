import { WORRY_CATEGORY_SET } from '@midnight-radio/domain';
import type { WorryModerationProvider } from './types';

export const WORRY_MODERATION_PROVIDER = 'openai';
export const WORRY_MODERATION_MODEL = 'gpt-5.4-mini';

const REASON_CODES = [
  'abuse_hate_profanity',
  'sexual',
  'self_harm_suicide',
  'crime_violence_victim',
  'personal_info',
  'spam_promotion',
  'empty',
  'too_long',
  'provider_invalid',
] as const;

export type WorryRejectionReasonCode = (typeof REASON_CODES)[number];

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

function mapReasonCode(rawReason: string): WorryRejectionReasonCode {
  if ((REASON_CODES as readonly string[]).includes(rawReason)) {
    return rawReason as WorryRejectionReasonCode;
  }

  const reason = rawReason.toLowerCase();
  if (reason.includes('sexual') || reason.includes('성')) return 'sexual';
  if (reason.includes('suicide') || reason.includes('self') || reason.includes('자해') || reason.includes('자살')) return 'self_harm_suicide';
  if (reason.includes('crime') || reason.includes('violence') || reason.includes('범죄') || reason.includes('폭력')) return 'crime_violence_victim';
  if (reason.includes('personal') || reason.includes('privacy') || reason.includes('개인정보')) return 'personal_info';
  if (reason.includes('spam') || reason.includes('promotion') || reason.includes('광고') || reason.includes('홍보')) return 'spam_promotion';
  if (reason.includes('empty') || reason.includes('비어')) return 'empty';
  if (reason.includes('long') || reason.includes('길')) return 'too_long';
  return 'abuse_hate_profanity';
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

    const userMessage =
      nonEmptyTrimmed(result.userMessage) ??
      nonEmptyTrimmed(result.reason) ??
      '부적절한 표현이 감지되었습니다.';
    const helpMessage = nonEmptyTrimmed(result.helpMessage);

    return {
      status: 'rejected',
      reasonCode: mapReasonCode(reason),
      userMessage,
      helpMessage,
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
