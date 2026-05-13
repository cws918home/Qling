import {
  isEligibleHumanCandidate,
  rankMatchedHumanCandidates,
  normalizeHumanCandidate,
  type HumanCandidate,
} from '../matching/server/recipientPolicy';
import type {
  DeliverySelectionType,
  RematchScan,
  RematchRound,
  RematchSourceBatch,
  SelectedRematchRecipient,
  SourceBatchRound,
} from './types';

export const REMATCH_DELAY_MS = 8 * 60 * 60 * 1000;
export const HUMAN_DELIVERY_LIMIT = 15;

function hasValidRematchProfile(candidate: HumanCandidate): boolean {
  return typeof candidate.gender === 'string'
    && candidate.gender.length > 0
    && Array.isArray(candidate.interests)
    && candidate.interests.some(interest => typeof interest === 'string' && interest.length > 0);
}

function validSourceRound(round: unknown): round is SourceBatchRound {
  return round === 0 || round === 1;
}

function sourceBatchForRound(scan: RematchScan, round: RematchRound): RematchSourceBatch | null {
  if (round === 1) {
    if (typeof scan.initialDeliveryBatchId !== 'string' || scan.initialDeliveryBatchId.length === 0) {
      return null;
    }
    const batch = scan.batches.find(item => item.id === scan.initialDeliveryBatchId);
    if (!batch || batch.worryId !== scan.worryId || batch.batchRound !== 0) return null;
    return batch;
  }

  const roundOneBatches = scan.batches.filter(item => item.batchRound === 1);
  if (roundOneBatches.length !== 1) return null;
  return roundOneBatches[0];
}

export function chooseNextRematchSource(params: {
  scan: RematchScan;
  now: Date;
}): { status: 'due'; sourceBatch: RematchSourceBatch; nextRound: RematchRound } | { status: 'skip'; reason: 'not_due' | 'no_source_batch' | 'round_complete' } {
  const hasRoundTwo = params.scan.batches.some(batch => batch.batchRound === 2);
  if (hasRoundTwo) return { status: 'skip', reason: 'round_complete' };

  const hasRoundOne = params.scan.batches.some(batch => batch.batchRound === 1);
  const nextRound: RematchRound = hasRoundOne ? 2 : 1;
  const sourceBatch = sourceBatchForRound(params.scan, nextRound);
  if (!sourceBatch || !validSourceRound(sourceBatch.batchRound)) {
    return { status: 'skip', reason: 'no_source_batch' };
  }

  if (params.now.getTime() - sourceBatch.createdAt.getTime() < REMATCH_DELAY_MS) {
    return { status: 'skip', reason: 'not_due' };
  }

  return { status: 'due', sourceBatch, nextRound };
}

export function getRematchEligibleAfter(params: {
  nextRound: RematchRound;
  batchCreatedAt: Date;
}): Date | null {
  if (params.nextRound === 2) return null;
  return new Date(params.batchCreatedAt.getTime() + REMATCH_DELAY_MS);
}

export function calculateTargetCount(params: {
  scan: RematchScan;
  sourceBatchId: string;
}): number {
  const sourceDeliveries = params.scan.sourceDeliveries.filter(delivery => (
    delivery.worryId === params.scan.worryId
    && delivery.batchId === params.sourceBatchId
    && delivery.isAiRecipient !== true
  ));
  const answeredInSource = sourceDeliveries.filter(delivery => Boolean(delivery.answeredAt)).length;
  const unansweredSlots = Math.max(0, sourceDeliveries.length - answeredInSource);
  const limit = Number.isFinite(params.scan.humanDeliveryLimit)
    ? Math.min(params.scan.humanDeliveryLimit, HUMAN_DELIVERY_LIMIT)
    : HUMAN_DELIVERY_LIMIT;
  const remainingCapacity = Math.max(0, limit - params.scan.humanDeliveryCount);
  return Math.min(5, unansweredSlots, remainingCapacity);
}

export function randomSlotAvailable(sourceDeliveries: RematchScan['sourceDeliveries']): boolean {
  const randomDelivery = sourceDeliveries.find(delivery => (
    delivery.selectionType === 'random'
    && delivery.isAiRecipient !== true
  ));
  return Boolean(randomDelivery && !randomDelivery.answeredAt);
}

function selectRandomCandidate(params: {
  candidates: HumanCandidate[];
  excludedUids: Set<string>;
  authorUid: string;
  random: () => number;
}): SelectedRematchRecipient | null {
  const eligible = params.candidates
    .filter(candidate => !params.excludedUids.has(candidate.uid))
    .filter(candidate => isEligibleHumanCandidate(candidate, params.authorUid))
    .filter(hasValidRematchProfile)
    .map(candidate => {
      const normalized = normalizeHumanCandidate(candidate);
      return {
        uid: normalized.uid,
        gender: normalized.gender,
        interests: normalized.interests,
        helpedCount: normalized.helpedCount,
        activeDeliveryCount: normalized.activeDeliveryCount,
        matchOverlapCount: 0,
        randomTieBreaker: params.random(),
        selectionType: 'random' as const,
        slotIndex: 0,
      };
    })
    .sort((a, b) => a.randomTieBreaker - b.randomTieBreaker);
  return eligible[0] ?? null;
}

export function buildExcludedUids(scan: RematchScan): Set<string> {
  const excluded = new Set<string>([scan.author.uid]);
  for (const delivery of scan.allDeliveries) {
    if (typeof delivery.recipientUid === 'string') excluded.add(delivery.recipientUid);
    if (typeof delivery.passerUid === 'string') excluded.add(delivery.passerUid);
  }
  for (const uid of scan.answeredUids) excluded.add(uid);
  return excluded;
}

export function selectRematchRecipients(params: {
  scan: RematchScan;
  targetCount: number;
  includeRandom: boolean;
  random: () => number;
}): SelectedRematchRecipient[] {
  if (params.targetCount <= 0) return [];

  const excludedUids = buildExcludedUids(params.scan);
  const recipients: SelectedRematchRecipient[] = [];
  if (params.includeRandom) {
    const randomRecipient = selectRandomCandidate({
      candidates: params.scan.candidates,
      excludedUids,
      authorUid: params.scan.author.uid,
      random: params.random,
    });
    if (randomRecipient) {
      recipients.push(randomRecipient);
      excludedUids.add(randomRecipient.uid);
    }
  }

  const matched = rankMatchedHumanCandidates({
    author: params.scan.author,
    candidates: params.scan.candidates.filter(hasValidRematchProfile),
    matchingCategories: params.scan.matchingCategories,
    excludedUids,
    random: params.random,
  }).slice(0, params.targetCount - recipients.length);

  recipients.push(...matched.map(candidate => ({
    ...candidate,
    selectionType: 'matched' as DeliverySelectionType,
    slotIndex: 0,
  })));

  return recipients.slice(0, params.targetCount).map((recipient, index) => ({
    ...recipient,
    slotIndex: index,
  }));
}
