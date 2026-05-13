import {
  rankMatchedHumanCandidates,
  type AuthorProfile,
  type HumanCandidate,
  type RankedHumanCandidate,
} from '../matching/server/recipientPolicy';

export function selectPassReplacementCandidates(params: {
  author: AuthorProfile;
  candidates: HumanCandidate[];
  matchingCategories: string[];
  excludedUids: Set<string>;
  random: () => number;
}): RankedHumanCandidate[] {
  return rankMatchedHumanCandidates({
    author: params.author,
    candidates: params.candidates,
    matchingCategories: params.matchingCategories,
    excludedUids: params.excludedUids,
    random: params.random,
  });
}
