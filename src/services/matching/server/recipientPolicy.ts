export const ACTIVE_DELIVERY_LIMIT = 10;

export interface HumanCandidate {
  uid: string;
  gender?: string;
  interests?: string[];
  helpedCount?: number;
  activeDeliveryCount?: number;
  deleted?: boolean;
  status?: string;
  inactive?: boolean;
  disabled?: boolean;
  isBot?: boolean;
  type?: string;
}

export interface AuthorProfile {
  uid: string;
  gender: string;
  interests?: string[];
}

export interface RankedHumanCandidate extends Required<Pick<HumanCandidate,
  'uid' | 'gender' | 'interests' | 'helpedCount' | 'activeDeliveryCount'
>> {
  matchOverlapCount: number;
  randomTieBreaker: number;
}

export function isEligibleHumanCandidate(
  candidate: HumanCandidate,
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

export function normalizeHumanCandidate(candidate: HumanCandidate) {
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

export function overlapCount(interests: string[], matchingCategories: string[]): number {
  const interestsSet = new Set(interests);
  return matchingCategories.filter(category => interestsSet.has(category)).length;
}

export function rankMatchedHumanCandidates(params: {
  author: AuthorProfile;
  candidates: HumanCandidate[];
  matchingCategories: string[];
  excludedUids?: Set<string>;
  random: () => number;
}): RankedHumanCandidate[] {
  const excludedUids = params.excludedUids ?? new Set<string>();
  return params.candidates
    .filter(candidate => !excludedUids.has(candidate.uid))
    .filter(candidate => isEligibleHumanCandidate(candidate, params.author.uid))
    .map(candidate => {
      const normalized = normalizeHumanCandidate(candidate);
      return {
        uid: normalized.uid,
        gender: normalized.gender,
        interests: normalized.interests,
        helpedCount: normalized.helpedCount,
        activeDeliveryCount: normalized.activeDeliveryCount,
        matchOverlapCount: overlapCount(normalized.interests, params.matchingCategories),
        randomTieBreaker: params.random(),
      };
    })
    .sort((a, b) => {
      const overlap = b.matchOverlapCount - a.matchOverlapCount;
      if (overlap !== 0) return overlap;
      const helped = b.helpedCount - a.helpedCount;
      if (helped !== 0) return helped;
      const gender = Number(b.gender === params.author.gender) - Number(a.gender === params.author.gender);
      if (gender !== 0) return gender;
      return a.randomTieBreaker - b.randomTieBreaker;
    });
}
