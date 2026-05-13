import { useLegacyLettersAnswerFeedFallback } from './useLegacyLettersAnswerFeedFallback';
import { usePrdAnswerFeed } from './usePrdAnswerFeed';
import { selectAnswerFeedWithLegacyFallback } from './prdPolicy';
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
    feedWorries: selectAnswerFeedWithLegacyFallback({
      prdFeedWorries,
      legacyFeedWorries,
    }),
  };
}
