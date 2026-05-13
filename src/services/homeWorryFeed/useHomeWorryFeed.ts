import { useAnswerFeedWithLegacyFallback } from './useAnswerFeedWithLegacyFallback';
import type {
  HomeWorryFeedLetter,
  HomeWorryFeedProfile,
} from './types';

export function useHomeWorryFeed(params: {
  profile: HomeWorryFeedProfile | null;
}): { feedWorries: HomeWorryFeedLetter[] } {
  return useAnswerFeedWithLegacyFallback(params);
}
