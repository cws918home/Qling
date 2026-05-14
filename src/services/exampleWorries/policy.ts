import type { ExampleWorrySeed, SelectedExampleSeed } from './types';

const MAX_EXAMPLES = 5;
const MIN_FEEDBACK_DELAY_MS = 5 * 60 * 1000;
const MAX_FEEDBACK_DELAY_MS = 15 * 60 * 1000;

export function selectExampleSeeds(params: {
  seeds: ExampleWorrySeed[];
  interests: string[];
  maxCount?: number;
  order?: (seeds: ExampleWorrySeed[]) => ExampleWorrySeed[];
}): SelectedExampleSeed[] {
  const interests = new Set(params.interests.map(item => item.trim()).filter(Boolean));
  const seen = new Set<string>();
  const activeMatching = params.seeds.filter(seed => {
    if (seed.status !== 'active') return false;
    if (seen.has(seed.id)) return false;
    seen.add(seed.id);
    return seed.categories.some(category => interests.has(category));
  });
  const ordered = params.order ? params.order(activeMatching) : [...activeMatching].sort((a, b) => a.id.localeCompare(b.id));
  return ordered.slice(0, params.maxCount ?? MAX_EXAMPLES).map((seed, index) => ({
    ...seed,
    selectionIndex: index,
  }));
}

export function createExampleFeedbackRunAfter(params: {
  submittedAt: Date;
  delayMs?: number;
  random?: () => number;
}): Date {
  const span = MAX_FEEDBACK_DELAY_MS - MIN_FEEDBACK_DELAY_MS;
  const delay = params.delayMs ?? MIN_FEEDBACK_DELAY_MS + Math.floor((params.random ?? Math.random)() * (span + 1));
  const clampedDelay = Math.max(MIN_FEEDBACK_DELAY_MS, Math.min(delay, MAX_FEEDBACK_DELAY_MS));
  return new Date(params.submittedAt.getTime() + clampedDelay);
}

export function buildExampleAutoLikeComment(): null {
  return null;
}
