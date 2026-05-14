import {
  getModerationRejectionCopy,
  type ModerationReasonCode,
} from '../../moderation/rejectionCopy';
import type { ReplyModerationProvider } from './types';

export const REPLY_MODERATION_PROVIDER = 'openai';
export const REPLY_MODERATION_MODEL = 'gpt-5.4-mini';

export type ReplyRejectionReasonCode = ModerationReasonCode;

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
    const copy = getModerationRejectionCopy(reason);

    return {
      status: 'rejected',
      reasonCode: copy.reasonCode,
      userMessage: copy.userMessage,
      helpMessage: copy.helpMessage,
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
