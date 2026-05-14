import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isEligiblePhase1HumanCandidate,
  selectInitialWorryRecipients,
} from './recipientSelection';
import type { Phase1HumanCandidate } from './types';

const candidate = (
  uid: string,
  overrides: Partial<Phase1HumanCandidate> = {}
): Phase1HumanCandidate => ({
  uid,
  gender: 'female',
  interests: ['취업'],
  helpedCount: 1,
  ...overrides,
});

test('selects exactly 5 recipients with 4 matched and 1 random', () => {
  const result = selectInitialWorryRecipients({
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    candidates: ['a', 'b', 'c', 'd', 'e', 'f'].map(uid => candidate(uid)),
    matchingCategories: ['취업'],
    random: () => 0.1,
  });

  assert.equal(result.status, 'selected');
  if (result.status !== 'selected') return;
  assert.equal(result.recipients.length, 5);
  assert.equal(result.recipients.filter(r => r.selectionType === 'matched').length, 4);
  assert.equal(result.recipients.filter(r => r.selectionType === 'random').length, 1);
});

test('selects empty list when no eligible recipients exist', () => {
  const result = selectInitialWorryRecipients({
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    candidates: [],
    matchingCategories: ['취업'],
    random: () => 0,
  });

  assert.equal(result.status, 'selected');
  assert.deepEqual(result.recipients, []);
});

test('selects all 1-4 eligible recipients as matched with sequential slots', () => {
  for (const count of [1, 4]) {
    const result = selectInitialWorryRecipients({
      author: { uid: 'author', gender: 'female', interests: ['취업'] },
      candidates: ['a', 'b', 'c', 'd'].slice(0, count).map(uid => candidate(uid)),
      matchingCategories: ['취업'],
      random: () => 0,
    });

    assert.equal(result.status, 'selected');
    assert.equal(result.recipients.length, count);
    assert.equal(result.recipients.every(recipient => recipient.selectionType === 'matched'), true);
    assert.deepEqual(result.recipients.map(recipient => recipient.slotIndex), Array.from({ length: count }, (_, index) => index));
  }
});

test('selected recipients are unique for partial and full selections', () => {
  for (const count of [0, 1, 4, 5, 8]) {
    const result = selectInitialWorryRecipients({
      author: { uid: 'author', gender: 'female', interests: ['취업'] },
      candidates: Array.from({ length: count }, (_, index) => candidate(`u${index}`)),
      matchingCategories: ['취업'],
      random: () => 0.2,
    });

    assert.equal(result.status, 'selected');
    assert.equal(new Set(result.recipients.map(recipient => recipient.uid)).size, result.recipients.length);
    assert.equal(result.recipients.length, Math.min(count, 5));
  }
});

test('excludes author, deleted, inactive, disabled, bots, and over-limit users', () => {
  const authorUid = 'author';
  const excluded = [
    candidate(authorUid),
    candidate('deleted', { deleted: true }),
    candidate('status-deleted', { status: 'deleted' }),
    candidate('inactive', { inactive: true }),
    candidate('disabled', { disabled: true }),
    candidate('bot_id', { uid: 'bot_1' }),
    candidate('isbot', { isBot: true }),
    candidate('typebot', { type: 'bot' }),
    candidate('overlimit', { activeDeliveryCount: 10 }),
  ];

  assert.deepEqual(
    excluded.map(item => isEligiblePhase1HumanCandidate(item, authorUid)),
    excluded.map(() => false)
  );
});

test('missing deleted and activeDeliveryCount are allowed', () => {
  assert.equal(isEligiblePhase1HumanCandidate(candidate('ok'), 'author'), true);
});

test('same-gender tie-breaker applies after overlap and helped count', () => {
  const result = selectInitialWorryRecipients({
    author: { uid: 'author', gender: 'female', interests: [] },
    candidates: [
      candidate('low-overlap', { interests: [], helpedCount: 99, gender: 'female' }),
      candidate('higher-overlap', { interests: ['취업'], helpedCount: 0, gender: 'male' }),
      candidate('helped', { interests: ['취업'], helpedCount: 10, gender: 'male' }),
      candidate('same-gender', { interests: ['취업'], helpedCount: 10, gender: 'female' }),
      candidate('filler1', { interests: [], helpedCount: 0 }),
      candidate('filler2', { interests: [], helpedCount: 0 }),
    ],
    matchingCategories: ['취업'],
    random: () => 0.5,
  });

  assert.equal(result.status, 'selected');
  if (result.status !== 'selected') return;
  assert.equal(result.recipients[0].uid, 'same-gender');
  assert.equal(result.recipients[1].uid, 'helped');
  assert.equal(result.recipients[2].uid, 'higher-overlap');
});
