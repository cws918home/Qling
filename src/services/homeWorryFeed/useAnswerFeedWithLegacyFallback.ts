import { useLegacyLettersAnswerFeedFallback } from './useLegacyLettersAnswerFeedFallback';
import { usePrdAnswerFeed } from './usePrdAnswerFeed';
import type {
  HomeWorryFeedLetter,
  HomeWorryFeedProfile,
} from './types';

export function useAnswerFeedWithLegacyFallback(params: {
  profile: HomeWorryFeedProfile | null;
}): { feedWorries: HomeWorryFeedLetter[] } {
  const { prdFeedWorries } = usePrdAnswerFeed(params);
  const { legacyFeedWorries } = useLegacyLettersAnswerFeedFallback(params);

  return {
    feedWorries: [...prdFeedWorries, ...legacyFeedWorries],
  };
}
