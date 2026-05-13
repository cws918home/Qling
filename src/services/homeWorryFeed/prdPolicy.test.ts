import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptPrdAnswerFeedItemToHomeWorryFeedLetter,
  selectActivePrdAnswerFeedItems,
  selectAnswerFeedWithLegacyFallback,
} from './prdPolicy';
import type { HomeWorryFeedLetter } from './types';

test('PRD active deliveries appear with worry content and delivery id', () => {
  const items = selectActivePrdAnswerFeedItems({
    profileUid: 'recipient',
    deliveries: [{
      id: 'delivery1',
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
    }],
    worriesById: new Map([[
      'worry1',
      {
        id: 'worry1',
        content: 'content',
        matchingCategories: ['취업'],
        createdAt: { toMillis: () => 1 },
      },
    ]]),
  });

  assert.equal(items[0].id, 'delivery1');
  assert.equal(items[0].deliveryId, 'delivery1');
  assert.equal(items[0].worryId, 'worry1');
  assert.equal(items[0].authorUid, 'author');
  assert.equal(items[0].recipientUid, 'recipient');
  assert.equal(items[0].originalContent, 'content');
  assert.equal(items[0].hasUnread, true);
});

test('pass replacement delivery appears through joined worry without content snapshots', () => {
  const items = selectActivePrdAnswerFeedItems({
    profileUid: 'replacementRecipient',
    deliveries: [{
      id: 'worry1_replacementRecipient',
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'replacementRecipient',
      status: 'active',
      createdByPassDeliveryId: 'worry1_passer',
      replacementForDeliveryId: 'worry1_passer',
      replacementReason: 'pass',
      createdAt: { toMillis: () => 2 },
      updatedAt: { toMillis: () => 2 },
    } as never],
    worriesById: new Map([[
      'worry1',
      {
        id: 'worry1',
        content: 'joined worry content',
        matchingCategories: ['진로', '관계'],
        createdAt: { toMillis: () => 1 },
      },
    ]]),
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].deliveryId, 'worry1_replacementRecipient');
  assert.equal(items[0].originalContent, 'joined worry content');
  assert.deepEqual(items[0].categories, ['진로', '관계']);
});

test('replacement display categories fall back to joined worry validCategories', () => {
  const items = selectActivePrdAnswerFeedItems({
    profileUid: 'replacementRecipient',
    deliveries: [{
      id: 'worry1_replacementRecipient',
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'replacementRecipient',
      status: 'active',
      createdByPassDeliveryId: 'worry1_passer',
      replacementForDeliveryId: 'worry1_passer',
      replacementReason: 'pass',
      createdAt: { toMillis: () => 2 },
      updatedAt: { toMillis: () => 2 },
    } as never],
    worriesById: new Map([[
      'worry1',
      {
        id: 'worry1',
        content: 'joined worry content',
        matchingCategories: [],
        validCategories: ['학업'],
        createdAt: { toMillis: () => 1 },
      },
    ]]),
  });

  assert.deepEqual(items.map(item => item.categories), [['학업']]);
});

test('private delivery read-state clears unread emphasis', () => {
  const items = selectActivePrdAnswerFeedItems({
    profileUid: 'recipient',
    deliveries: [{
      id: 'delivery1',
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
    }],
    worriesById: new Map([['worry1', { id: 'worry1', content: 'content' }]]),
    readStatesByDeliveryId: new Map([['delivery1', { deliveryId: 'delivery1', readAt: {} }]]),
  });

  assert.equal(items[0].hasUnread, false);
});

test('non-recipient, answered, passed, and hidden deliveries do not appear', () => {
  const items = selectActivePrdAnswerFeedItems({
    profileUid: 'recipient',
    deliveries: [
      { id: 'other', worryId: 'w1', authorUid: 'a', recipientUid: 'other', status: 'active' },
      { id: 'answered', worryId: 'w1', authorUid: 'a', recipientUid: 'recipient', status: 'active', answeredAt: {} },
      { id: 'passed', worryId: 'w1', authorUid: 'a', recipientUid: 'recipient', status: 'active', passedAt: {} },
      { id: 'hidden', worryId: 'w1', authorUid: 'a', recipientUid: 'recipient', status: 'active', hiddenAt: {} },
    ],
    worriesById: new Map([['w1', { id: 'w1', content: 'content' }]]),
  });

  assert.deepEqual(items, []);
});

test('status answered delivery is excluded even without answeredAt', () => {
  const items = selectActivePrdAnswerFeedItems({
    profileUid: 'recipient',
    deliveries: [
      { id: 'answered-status', worryId: 'w1', authorUid: 'a', recipientUid: 'recipient', status: 'answered' },
    ],
    worriesById: new Map([['w1', { id: 'w1', content: 'content' }]]),
  });

  assert.deepEqual(items, []);
});

test('successful reply transaction state excludes delivery from answer feed', () => {
  const before = selectActivePrdAnswerFeedItems({
    profileUid: 'recipient',
    deliveries: [
      { id: 'delivery1', worryId: 'w1', authorUid: 'a', recipientUid: 'recipient', status: 'active' },
    ],
    worriesById: new Map([['w1', { id: 'w1', content: 'content' }]]),
  });
  const after = selectActivePrdAnswerFeedItems({
    profileUid: 'recipient',
    deliveries: [
      { id: 'delivery1', worryId: 'w1', authorUid: 'a', recipientUid: 'recipient', status: 'answered', answeredAt: {} },
    ],
    worriesById: new Map([['w1', { id: 'w1', content: 'content' }]]),
  });

  assert.equal(before.length, 1);
  assert.deepEqual(after, []);
});

test('example active delivery appears normally without label exposure', () => {
  const selected = selectActivePrdAnswerFeedItems({
    profileUid: 'recipient',
    deliveries: [
      {
        id: 'example_delivery',
        worryId: 'example_worry',
        authorUid: 'example_author',
        recipientUid: 'recipient',
        status: 'active',
        isExample: true,
        exampleSeedId: 'seed1',
      } as never,
    ],
    worriesById: new Map([[
      'example_worry',
      {
        id: 'example_worry',
        content: 'example content',
        matchingCategories: ['career'],
        isExample: true,
        exampleSeedId: 'seed1',
      } as never,
    ]]),
  });
  const letter = adaptPrdAnswerFeedItemToHomeWorryFeedLetter(selected[0]);

  assert.equal(selected.length, 1);
  assert.equal(selected[0].originalContent, 'example content');
  assert.equal('isExample' in selected[0], false);
  assert.equal('exampleSeedId' in selected[0], false);
  assert.equal('isExample' in letter, false);
  assert.equal('exampleSeedId' in letter, false);
});

test('adapter preserves PRD identity fields for reply form compatibility', () => {
  const letter = adaptPrdAnswerFeedItemToHomeWorryFeedLetter({
    id: 'delivery1',
    deliveryId: 'delivery1',
    worryId: 'worry1',
    authorUid: 'author',
    recipientUid: 'recipient',
    originalContent: 'content',
    refinedContent: 'content',
    categories: ['잡담'],
    createdAt: null,
    status: 'active',
    source: 'prd_delivery',
    hasUnread: true,
  });

  assert.equal(letter.id, 'delivery1');
  assert.equal(letter.deliveryId, 'delivery1');
  assert.equal(letter.worryId, 'worry1');
  assert.equal(letter.authorUid, 'author');
  assert.equal(letter.recipientUid, 'recipient');
  assert.equal(letter.source, 'prd_delivery');
  assert.equal(letter.hasUnread, true);
});

test('PRD items suppress legacy fallback items', () => {
  const prd = [{ id: 'prd', source: 'prd_delivery' }] as HomeWorryFeedLetter[];
  const legacy = [{ id: 'legacy', source: 'legacy_letters' }] as HomeWorryFeedLetter[];

  assert.deepEqual(selectAnswerFeedWithLegacyFallback({
    prdFeedWorries: prd,
    legacyFeedWorries: legacy,
  }), prd);
});

test('legacy fallback appears only when no PRD delivery items exist', () => {
  const legacy = [{ id: 'legacy', source: 'legacy_letters' }] as HomeWorryFeedLetter[];

  assert.deepEqual(selectAnswerFeedWithLegacyFallback({
    prdFeedWorries: [],
    legacyFeedWorries: legacy,
  }), legacy);
});

test('PRD delivery feed works without legacy fallback', () => {
  const prd = [{ id: 'prd', source: 'prd_delivery' }] as HomeWorryFeedLetter[];

  assert.deepEqual(selectAnswerFeedWithLegacyFallback({
    prdFeedWorries: prd,
    legacyFeedWorries: [],
  }), prd);
});

test('legacy fallback items are explicitly marked', () => {
  const legacy = [{ id: 'legacy', source: 'legacy_letters' }] as HomeWorryFeedLetter[];

  const selected = selectAnswerFeedWithLegacyFallback({
    prdFeedWorries: [],
    legacyFeedWorries: legacy,
  });

  assert.equal(selected[0].source, 'legacy_letters');
});
