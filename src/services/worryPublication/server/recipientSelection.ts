import type {
  Phase1AuthorProfile,
  Phase1HumanCandidate,
  SelectedPhase1Recipient,
} from './types';
import {
  ACTIVE_DELIVERY_LIMIT,
  isEligibleHumanCandidate,
  rankMatchedHumanCandidates,
} from '../../matching/server/recipientPolicy';

export const INITIAL_DELIVERY_TARGET_COUNT = 5;
export const INITIAL_MATCHED_DELIVERY_COUNT = 4;
export const INITIAL_RANDOM_DELIVERY_COUNT = 1;
export { ACTIVE_DELIVERY_LIMIT };

export function isEligiblePhase1HumanCandidate(
  candidate: Phase1HumanCandidate,
  authorUid: string
): boolean {
  return isEligibleHumanCandidate(candidate, authorUid);
}

export type InitialRecipientSelectionResult =
  | { status: 'selected'; recipients: SelectedPhase1Recipient[] };

export function selectInitialWorryRecipients(params: {
  author: Phase1AuthorProfile;
  candidates: Phase1HumanCandidate[];
  matchingCategories: string[];
  random: () => number;
}): InitialRecipientSelectionResult {
  const eligible = rankMatchedHumanCandidates({
    author: params.author,
    candidates: params.candidates,
    matchingCategories: params.matchingCategories,
    random: params.random,
  });

  if (eligible.length < INITIAL_DELIVERY_TARGET_COUNT) {
    return {
      status: 'selected',
      recipients: eligible.map((candidate, index): SelectedPhase1Recipient => ({
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
    };
  }

  const matched = eligible.slice(0, INITIAL_MATCHED_DELIVERY_COUNT);
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
