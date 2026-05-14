export const MODERATION_REASON_CODES = [
  'abuse_hate_profanity',
  'sexual',
  'self_harm_suicide',
  'crime_violence_victim',
  'personal_info',
  'spam_promotion',
] as const;

export type ModerationReasonCode = (typeof MODERATION_REASON_CODES)[number];

export interface ModerationRejectionCopy {
  reasonCode: ModerationReasonCode;
  userMessage: string;
  helpMessage: string | null;
}

const USER_MESSAGES: Record<ModerationReasonCode, string> = {
  abuse_hate_profanity: '공격적이거나 혐오, 욕설 표현이 포함되어 전송할 수 없습니다.',
  sexual: '성적 표현이 포함되어 전송할 수 없습니다.',
  self_harm_suicide: '자해나 자살 위험 표현이 포함되어 전송할 수 없습니다.',
  crime_violence_victim: '범죄나 폭력 피해와 관련된 위험 표현이 포함되어 전송할 수 없습니다.',
  personal_info: '개인정보가 포함되어 전송할 수 없습니다.',
  spam_promotion: '스팸이나 홍보성 표현이 포함되어 전송할 수 없습니다.',
};

const HELP_MESSAGES: Partial<Record<ModerationReasonCode, string>> = {
  self_harm_suicide: '지금 당장 위험하다고 느껴진다면 혼자 버티지 말고 가까운 사람이나 긴급 도움을 받을 수 있는 기관에 바로 알려주세요.',
  crime_violence_victim: '현재 안전이 위협받고 있다면 먼저 안전한 장소로 이동하고, 가까운 사람이나 긴급 도움을 받을 수 있는 기관에 알려주세요.',
};

function nonEmptyTrimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function mapModerationReasonCode(rawReason: unknown): ModerationReasonCode {
  const raw = nonEmptyTrimmed(rawReason);
  if (!raw) return 'abuse_hate_profanity';
  if ((MODERATION_REASON_CODES as readonly string[]).includes(raw)) {
    return raw as ModerationReasonCode;
  }

  const reason = raw.toLowerCase();
  if (reason.includes('sexual') || reason.includes('성')) return 'sexual';
  if (reason.includes('suicide') || reason.includes('self') || reason.includes('자해') || reason.includes('자살')) return 'self_harm_suicide';
  if (reason.includes('crime') || reason.includes('violence') || reason.includes('범죄') || reason.includes('폭력')) return 'crime_violence_victim';
  if (reason.includes('personal') || reason.includes('privacy') || reason.includes('개인정보')) return 'personal_info';
  if (reason.includes('spam') || reason.includes('promotion') || reason.includes('광고') || reason.includes('홍보')) return 'spam_promotion';
  return 'abuse_hate_profanity';
}

export function getModerationRejectionCopy(rawReason: unknown): ModerationRejectionCopy {
  const reasonCode = mapModerationReasonCode(rawReason);
  return {
    reasonCode,
    userMessage: USER_MESSAGES[reasonCode],
    helpMessage: HELP_MESSAGES[reasonCode] ?? null,
  };
}
