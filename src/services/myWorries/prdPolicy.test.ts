import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  composeReplyReadModel,
  selectMyGivenReplies,
  selectMyWorries,
  selectRepliesForWorry,
} from './prdPolicy';
import type {
  PrdReplyDoc,
  PrdWorryDoc,
  ReplyReadModelItem,
} from './types';

const ts = (value: number) => ({ toMillis: () => value });

test('own worries are included by authorUid and other users worries are excluded', () => {
  const worries: PrdWorryDoc[] = [
    {
      id: 'mine-new',
      authorUid: 'me',
      content: 'my newer worry',
      matchingCategories: ['career'],
      createdAt: ts(2),
    },
    {
      id: 'other',
      authorUid: 'other',
      content: 'hidden worry',
      matchingCategories: ['career'],
      createdAt: ts(3),
    },
    {
      id: 'mine-old',
      authorUid: 'me',
      content: 'my older worry',
      validCategories: ['family'],
      createdAt: ts(1),
      humanReplyCount: 1,
    },
  ];

  const selected = selectMyWorries({ worries, userUid: 'me' });

  assert.deepEqual(selected.map(worry => worry.id), ['mine-new', 'mine-old']);
  assert.deepEqual(selected.map(worry => worry.source), ['prd_worries', 'prd_worries']);
  assert.deepEqual(selected[1].categories, ['family']);
  assert.equal(selected[1].humanReplyCount, 1);
  assert.equal(selected[1].unreadReplyCount, 0);
  assert.equal(selected[1].hasUnreadReplies, false);
});

test('my worries computes unread reply count from private read-state docs', () => {
  const worries: PrdWorryDoc[] = [
    { id: 'w1', authorUid: 'me', content: 'worry one' },
    { id: 'w2', authorUid: 'me', content: 'worry two' },
  ];
  const replies: PrdReplyDoc[] = [
    prdReply({ id: 'r1', worryId: 'w1', authorUid: 'me' }),
    prdReply({ id: 'r2', worryId: 'w1', authorUid: 'me' }),
    prdReply({ id: 'r3', worryId: 'w2', authorUid: 'me' }),
  ];

  const selected = selectMyWorries({
    worries,
    userUid: 'me',
    replies,
    readStatesByReplyId: new Map([['r2', { replyId: 'r2', readByAuthorAt: {} }]]),
  });

  const w1 = selected.find(worry => worry.id === 'w1');
  const w2 = selected.find(worry => worry.id === 'w2');
  assert.equal(w1?.unreadReplyCount, 1);
  assert.equal(w1?.hasUnreadReplies, true);
  assert.equal(w2?.unreadReplyCount, 1);
  assert.equal(w2?.hasUnreadReplies, true);
});

test('my worries excludes hidden worries and hidden replies from unread counts', () => {
  const worries: PrdWorryDoc[] = [
    { id: 'visible', authorUid: 'me', content: 'visible worry' },
    { id: 'hidden-status', authorUid: 'me', content: 'hidden worry', status: 'hidden' },
    { id: 'hidden-at', authorUid: 'me', content: 'hidden at worry', hiddenAt: {} },
  ];
  const replies: PrdReplyDoc[] = [
    prdReply({ id: 'visible-reply', worryId: 'visible', authorUid: 'me' }),
    prdReply({ id: 'hidden-reply', worryId: 'visible', authorUid: 'me', status: 'hidden' }),
    prdReply({ id: 'hidden-at-reply', worryId: 'visible', authorUid: 'me', hiddenAt: {} }),
  ];

  const selected = selectMyWorries({ worries, userUid: 'me', replies });

  assert.deepEqual(selected.map(worry => worry.id), ['visible']);
  assert.equal(selected[0].unreadReplyCount, 1);
});

test('my worries excludes legacy or mismatched author identity fields', () => {
  const selected = selectMyWorries({
    userUid: 'me',
    worries: [
      { id: 'legacy-uid', uid: 'me', content: 'legacy uid content' } as never,
      { id: 'legacy-sender', senderId: 'me', content: 'legacy sender content' } as never,
      { id: 'wrong-author', authorUid: 'other', content: 'wrong author content' },
      { id: 'missing-content', authorUid: 'me' },
      { id: 'canonical', authorUid: 'me', content: 'canonical content' },
    ],
  });

  assert.deepEqual(selected.map(worry => worry.id), ['canonical']);
});

test('received replies are selected by worryId and authorUid', () => {
  const replies: PrdReplyDoc[] = [
    prdReply({ id: 'include', worryId: 'w1', authorUid: 'author', replierUid: 'r1' }),
    prdReply({ id: 'other-worry', worryId: 'w2', authorUid: 'author', replierUid: 'r1' }),
    prdReply({ id: 'other-author', worryId: 'w1', authorUid: 'other', replierUid: 'r1' }),
  ];

  const selected = selectRepliesForWorry({ replies, userUid: 'author', worryId: 'w1' });

  assert.deepEqual(selected.map(reply => reply.id), ['include']);
  assert.equal(selected[0].source, 'prd_replies');
  assert.equal(selected[0].worryId, 'w1');
  assert.equal(selected[0].authorUid, 'author');
  assert.equal(selected[0].hasUnread, false);
});

test('replies for worry excludes hidden replies', () => {
  const replies: PrdReplyDoc[] = [
    prdReply({ id: 'visible', worryId: 'w1', authorUid: 'author', replierUid: 'r1' }),
    prdReply({ id: 'hidden-status', worryId: 'w1', authorUid: 'author', replierUid: 'r2', status: 'hidden' }),
    prdReply({ id: 'hidden-at', worryId: 'w1', authorUid: 'author', replierUid: 'r3', hiddenAt: {} }),
  ];

  const selected = selectRepliesForWorry({ replies, userUid: 'author', worryId: 'w1' });

  assert.deepEqual(selected.map(reply => reply.id), ['visible']);
});

test('received replies use private author read-state for unread emphasis', () => {
  const replies: PrdReplyDoc[] = [
    prdReply({ id: 'unread', worryId: 'w1', authorUid: 'author', replierUid: 'r1' }),
    prdReply({ id: 'read', worryId: 'w1', authorUid: 'author', replierUid: 'r2' }),
  ];

  const selected = selectRepliesForWorry({
    replies,
    userUid: 'author',
    worryId: 'w1',
    readStatesByReplyId: new Map([['read', { replyId: 'read', readByAuthorAt: {} }]]),
  });

  assert.equal(selected.find(reply => reply.id === 'unread')?.hasUnread, true);
  assert.equal(selected.find(reply => reply.id === 'unread')?.isRead, false);
  assert.equal(selected.find(reply => reply.id === 'read')?.hasUnread, false);
  assert.equal(selected.find(reply => reply.id === 'read')?.isRead, true);
});

test('written replies are selected by replierUid', () => {
  const replies: PrdReplyDoc[] = [
    prdReply({ id: 'mine', worryId: 'w1', authorUid: 'author', replierUid: 'me' }),
    prdReply({ id: 'other', worryId: 'w2', authorUid: 'author', replierUid: 'other' }),
  ];

  const selected = selectMyGivenReplies({ replies, userUid: 'me' });

  assert.deepEqual(selected.map(reply => reply.id), ['mine']);
  assert.equal(selected[0].source, 'prd_replies');
  assert.equal(selected[0].replierUid, 'me');
  assert.equal(selected[0].hasUnread, false);
});

test('my given replies excludes hidden replies', () => {
  const replies: PrdReplyDoc[] = [
    prdReply({ id: 'visible', worryId: 'w1', authorUid: 'author', replierUid: 'me' }),
    prdReply({ id: 'hidden-status', worryId: 'w1', authorUid: 'author', replierUid: 'me', status: 'hidden' }),
    prdReply({ id: 'hidden-at', worryId: 'w1', authorUid: 'author', replierUid: 'me', hiddenAt: {} }),
  ];

  const selected = selectMyGivenReplies({ replies, userUid: 'me' });

  assert.deepEqual(selected.map(reply => reply.id), ['visible']);
});

test('disliked reply is hidden only from publisher view while admin-hidden reply is hidden everywhere', () => {
  const disliked = prdReply({ id: 'disliked', worryId: 'w1', authorUid: 'author', replierUid: 'me' });
  const hidden = prdReply({ id: 'admin-hidden', worryId: 'w1', authorUid: 'author', replierUid: 'me', status: 'hidden' });
  const feedbacksByReplyId = new Map([['disliked', { id: 'disliked', type: 'dislike' as const }]]);

  assert.deepEqual(
    selectRepliesForWorry({ replies: [disliked, hidden], userUid: 'author', worryId: 'w1', feedbacksByReplyId })
      .map(reply => reply.id),
    []
  );
  assert.deepEqual(
    selectMyGivenReplies({ replies: [disliked, hidden], userUid: 'me', feedbacksByReplyId }).map(reply => reply.id),
    ['disliked']
  );
});

test('AI reply appears to author as a normal reply without visible label', () => {
  const aiReply = prdReply({
    id: 'w1_ai',
    deliveryId: 'ai:w1',
    worryId: 'w1',
    authorUid: 'author',
    replierUid: 'ai_fallback',
    isAiGenerated: true,
    isExampleReply: false,
  });

  const selected = selectRepliesForWorry({ replies: [aiReply], userUid: 'author', worryId: 'w1' });

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, 'w1_ai');
  assert.equal(selected[0].deliveryId, 'ai:w1');
  assert.equal(selected[0].replierUid, 'ai_fallback');
  assert.equal(selected[0].isAiGenerated, true);
  assert.equal('label' in selected[0], false);
  assert.equal('aiLabel' in selected[0], false);
});

test('AI reply is not shown in a real user given-replies path', () => {
  const aiReply = prdReply({
    id: 'w1_ai',
    deliveryId: 'ai:w1',
    worryId: 'w1',
    authorUid: 'author',
    replierUid: 'ai_fallback',
    isAiGenerated: true,
    isExampleReply: false,
  });

  assert.deepEqual(selectMyGivenReplies({ replies: [aiReply], userUid: 'recipient' }), []);
});

test('composed read model works without legacy fallback output', () => {
  const prdReplies = [replyItem({ id: 'prd-only', source: 'prd_replies' })];

  const selected = composeReplyReadModel({
    prdReplies,
    mode: 'received_for_worry',
  });

  assert.deepEqual(selected.map(reply => reply.id), ['prd-only']);
  assert.deepEqual(selected.map(reply => reply.source), ['prd_replies']);
});

test('example replies remain visible in my given replies', () => {
  const selected = selectMyGivenReplies({
    userUid: 'replier',
    replies: [
      prdReply({
        id: 'example-reply',
        replierUid: 'replier',
        authorUid: 'example_author',
        isAiGenerated: false,
        isExampleReply: true,
      }),
    ],
  });

  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, 'example-reply');
  assert.equal(selected[0].isExampleReply, true);
});

function prdReply(overrides: Partial<PrdReplyDoc>): PrdReplyDoc {
  return {
    id: 'reply',
    deliveryId: 'delivery',
    worryId: 'worry',
    authorUid: 'author',
    replierUid: 'replier',
    content: 'reply content',
    createdAt: ts(1),
    ...overrides,
  };
}

function replyItem(overrides: Partial<ReplyReadModelItem>): ReplyReadModelItem {
  return {
    id: 'reply',
    deliveryId: undefined,
    worryId: 'worry',
    authorUid: 'author',
    replierUid: 'replier',
    content: 'reply content',
    createdAt: ts(1),
    source: 'prd_replies',
    senderId: 'replier',
    receiverId: 'author',
    originalContent: 'reply content',
    refinedContent: 'reply content',
    replyTo: 'worry',
    isRead: true,
    ...overrides,
  };
}
