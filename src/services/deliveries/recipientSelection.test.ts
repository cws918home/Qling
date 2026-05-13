import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPassReplacementCandidates } from './recipientSelection';

test('pass replacement selection excludes pass-specific users and normal ineligible candidates', () => {
  const selected = selectPassReplacementCandidates({
    author: { uid: 'author', gender: 'female' },
    matchingCategories: ['career'],
    excludedUids: new Set(['passer', 'previousRecipient', 'previousPasser', 'replier']),
    random: () => 0,
    candidates: [
      { uid: 'author', gender: 'female', interests: ['career'] },
      { uid: 'passer', gender: 'female', interests: ['career'] },
      { uid: 'previousRecipient', gender: 'female', interests: ['career'] },
      { uid: 'previousPasser', gender: 'female', interests: ['career'] },
      { uid: 'replier', gender: 'female', interests: ['career'] },
      { uid: 'deleted', deleted: true, gender: 'female', interests: ['career'] },
      { uid: 'inactive', inactive: true, gender: 'female', interests: ['career'] },
      { uid: 'disabled', disabled: true, gender: 'female', interests: ['career'] },
      { uid: 'bot_1', gender: 'female', interests: ['career'] },
      { uid: 'overLimit', activeDeliveryCount: 10, gender: 'female', interests: ['career'] },
      { uid: 'eligible', gender: 'female', interests: ['career'], activeDeliveryCount: 9 },
    ],
  });

  assert.deepEqual(selected.map(candidate => candidate.uid), ['eligible']);
});

test('pass replacement ranks matched candidates by overlap helped count gender and random tie breaker', () => {
  const selected = selectPassReplacementCandidates({
    author: { uid: 'author', gender: 'female' },
    matchingCategories: ['career', 'family'],
    excludedUids: new Set(),
    random: (() => {
      const values = [0.9, 0.2, 0.1, 0.8];
      return () => values.shift() ?? 0;
    })(),
    candidates: [
      { uid: 'oneOverlap', gender: 'female', interests: ['career'], helpedCount: 100 },
      { uid: 'twoOverlapLowHelped', gender: 'male', interests: ['career', 'family'], helpedCount: 1 },
      { uid: 'twoOverlapHighHelped', gender: 'male', interests: ['career', 'family'], helpedCount: 2 },
      { uid: 'twoOverlapSameGender', gender: 'female', interests: ['career', 'family'], helpedCount: 2 },
    ],
  });

  assert.deepEqual(selected.map(candidate => candidate.uid), [
    'twoOverlapSameGender',
    'twoOverlapHighHelped',
    'twoOverlapLowHelped',
    'oneOverlap',
  ]);
});
