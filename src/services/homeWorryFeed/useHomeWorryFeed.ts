import { usePrdAnswerFeed } from './usePrdAnswerFeed';
import type {
  HomeWorryFeedLetter,
  HomeWorryFeedProfile,
} from './types';

export function useHomeWorryFeed(params: {
  profile: HomeWorryFeedProfile | null;
}): { feedWorries: HomeWorryFeedLetter[] } {
  const { prdFeedWorries } = usePrdAnswerFeed(params);
  return { feedWorries: prdFeedWorries };
}
