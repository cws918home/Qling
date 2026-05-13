import type { ReplyModerationProvider } from './types';

export const REPLY_MODERATION_PROVIDER = 'openai';
export const REPLY_MODERATION_MODEL = 'gpt-5.4-mini';

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

export type ReplyRejectionReasonCode = (typeof REASON_CODES)[number];

export type ReplyModerationResult =
  | { status: 'approved'; rawProviderResponse: unknown }
  | {
      status: 'rejected';
      reasonCode: ReplyRejectionReasonCode;
      userMessage: string;
      helpMessage: string | null;
      rawProviderResponse: unknown;
    }
  | { status: 'provider_invalid'; rawProviderResponse: unknown }
  | { status: 'provider_error'; error: unknown };

function nonEmptyTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mapReasonCode(rawReason: string): ReplyRejectionReasonCode {
  if ((REASON_CODES as readonly string[]).includes(rawReason)) {
    return rawReason as ReplyRejectionReasonCode;
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

function normalizeReplyModeration(raw: unknown): Exclude<ReplyModerationResult, { status: 'provider_error' | 'provider_invalid' }> | { status: 'invalid'; rawProviderResponse: unknown } {
  if (!raw || typeof raw !== 'object') {
    return { status: 'invalid', rawProviderResponse: raw };
  }

  const result = raw as {
    status?: unknown;
    reason?: unknown;
    reasonCode?: unknown;
    userMessage?: unknown;
    helpMessage?: unknown;
  };

  if (result.status === 'approved') {
    return { status: 'approved', rawProviderResponse: raw };
  }

  if (result.status === 'rejected') {
    const reason = nonEmptyTrimmed(result.reasonCode) ?? nonEmptyTrimmed(result.reason);
    if (!reason) return { status: 'invalid', rawProviderResponse: raw };

    return {
      status: 'rejected',
      reasonCode: mapReasonCode(reason),
      userMessage:
        nonEmptyTrimmed(result.userMessage) ??
        nonEmptyTrimmed(result.reason) ??
        '부적절한 표현이 감지되었습니다.',
      helpMessage: nonEmptyTrimmed(result.helpMessage),
      rawProviderResponse: raw,
    };
  }

  return { status: 'invalid', rawProviderResponse: raw };
}

export async function moderateReplyForPublication(params: {
  content: string;
  provider: ReplyModerationProvider;
}): Promise<ReplyModerationResult> {
  try {
    const first = normalizeReplyModeration(await params.provider(params.content));
    if (first.status === 'approved' || first.status === 'rejected') return first;

    const second = normalizeReplyModeration(await params.provider(params.content, true));
    if (second.status === 'approved' || second.status === 'rejected') return second;

    return { status: 'provider_invalid', rawProviderResponse: second.rawProviderResponse };
  } catch (error) {
    return { status: 'provider_error', error };
  }
}

export async function moderateAiReply(params: {
  content: string;
  provider: ReplyModerationProvider;
}): Promise<ReplyModerationResult> {
  return moderateReplyForPublication(params);
}
