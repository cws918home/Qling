import type {
  Phase1AuthorProfile,
  Phase1HumanCandidate,
  SelectedPhase1Recipient,
} from './types';

export const INITIAL_DELIVERY_TARGET_COUNT = 5;
export const INITIAL_MATCHED_DELIVERY_COUNT = 4;
export const INITIAL_RANDOM_DELIVERY_COUNT = 1;
export const ACTIVE_DELIVERY_LIMIT = 10;

export function isEligiblePhase1HumanCandidate(
  candidate: Phase1HumanCandidate,
  authorUid: string
): boolean {
  if (!candidate.uid || candidate.uid === authorUid) return false;
  if (candidate.deleted === true) return false;
  if (candidate.status === 'deleted') return false;
  if (candidate.inactive === true) return false;
  if (candidate.disabled === true) return false;
  if (candidate.uid.startsWith('bot_')) return false;
  if (candidate.isBot === true) return false;
  if (candidate.type === 'bot') return false;
  if ((candidate.activeDeliveryCount ?? 0) >= ACTIVE_DELIVERY_LIMIT) return false;
  return true;
}

function normalizeCandidate(candidate: Phase1HumanCandidate) {
  return {
    ...candidate,
    gender: typeof candidate.gender === 'string' ? candidate.gender : '',
    interests: Array.isArray(candidate.interests)
      ? candidate.interests.filter((interest): interest is string => typeof interest === 'string')
      : [],
    helpedCount: typeof candidate.helpedCount === 'number' ? candidate.helpedCount : 0,
    activeDeliveryCount: typeof candidate.activeDeliveryCount === 'number' ? candidate.activeDeliveryCount : 0,
  };
}

function overlapCount(interests: string[], matchingCategories: string[]): number {
  const interestsSet = new Set(interests);
  return matchingCategories.filter(category => interestsSet.has(category)).length;
}

export type InitialRecipientSelectionResult =
  | { status: 'selected'; recipients: SelectedPhase1Recipient[] }
  | { status: 'not_enough_recipients'; eligibleCount: number };

export function selectInitialWorryRecipients(params: {
  author: Phase1AuthorProfile;
  candidates: Phase1HumanCandidate[];
  matchingCategories: string[];
  random: () => number;
}): InitialRecipientSelectionResult {
  const eligible = params.candidates
    .filter(candidate => isEligiblePhase1HumanCandidate(candidate, params.author.uid))
    .map(candidate => {
      const normalized = normalizeCandidate(candidate);
      return {
        ...normalized,
        matchOverlapCount: overlapCount(normalized.interests, params.matchingCategories),
        randomTieBreaker: params.random(),
      };
    });

  if (eligible.length < INITIAL_DELIVERY_TARGET_COUNT) {
    return { status: 'not_enough_recipients', eligibleCount: eligible.length };
  }

  const byMatchedRank = [...eligible].sort((a, b) => {
    const overlap = b.matchOverlapCount - a.matchOverlapCount;
    if (overlap !== 0) return overlap;
    const helped = b.helpedCount - a.helpedCount;
    if (helped !== 0) return helped;
    const gender = Number(b.gender === params.author.gender) - Number(a.gender === params.author.gender);
    if (gender !== 0) return gender;
    return a.randomTieBreaker - b.randomTieBreaker;
  });

  const matched = byMatchedRank.slice(0, INITIAL_MATCHED_DELIVERY_COUNT);
  const matchedUids = new Set(matched.map(candidate => candidate.uid));
  const remaining = eligible.filter(candidate => !matchedUids.has(candidate.uid));
  const randomIndex = Math.floor(params.random() * remaining.length);
  const random = remaining[randomIndex];

  const recipients = [
    ...matched.map((candidate, index): SelectedPhase1Recipient => ({
      uid: candidate.uid,
      gender: candidate.gender,
      interests: candidate.interests,
      helpedCount: candidate.helpedCount,
      activeDeliveryCount: candidate.activeDeliveryCount,
      selectionType: 'matched',
      matchOverlapCount: candidate.matchOverlapCount,
      matchCategoriesSnapshot: [...params.matchingCategories],
      slotIndex: index,
    })),
    {
      uid: random.uid,
      gender: random.gender,
      interests: random.interests,
      helpedCount: random.helpedCount,
      activeDeliveryCount: random.activeDeliveryCount,
      selectionType: 'random' as const,
      matchOverlapCount: random.matchOverlapCount,
      matchCategoriesSnapshot: [...params.matchingCategories],
      slotIndex: INITIAL_MATCHED_DELIVERY_COUNT,
    },
  ];

  return { status: 'selected', recipients };
}
