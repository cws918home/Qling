import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptPrdAnswerFeedItemToHomeWorryFeedLetter,
  selectActivePrdAnswerFeedItems,
} from './prdPolicy';

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
  });

  assert.equal(letter.id, 'delivery1');
  assert.equal(letter.deliveryId, 'delivery1');
  assert.equal(letter.worryId, 'worry1');
  assert.equal(letter.authorUid, 'author');
  assert.equal(letter.recipientUid, 'recipient');
  assert.equal(letter.source, 'prd_delivery');
});
