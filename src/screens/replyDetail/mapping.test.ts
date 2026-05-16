import test from 'node:test';
import assert from 'node:assert/strict';
import { mapFeedbackToDetailState, mapFeedbackValueToLegacy, mapReplyToDetailProps } from './mapping';

test('selected reply maps original worry and reply detail props', () => {
  const props = mapReplyToDetailProps({
    variant: 'received-answer-detail',
    reply: {
      id: 'reply-1',
      worryId: 'worry-1',
      content: 'raw',
      createdAt: null,
      source: 'prd_replies',
      senderId: 'sender',
      receiverId: 'receiver',
      originalContent: 'original',
      refinedContent: 'refined',
      replyToContent: 'fallback original',
      isRead: false,
      hasUnread: true,
      feedback: null,
    },
  });

  assert.equal(props.state.status, 'ready');
  assert.equal(props.originalWorry?.summaryText, 'fallback original');
  assert.equal(props.reply?.bodyText, 'refined');
});

test('feedback mapping covers submitted and legacy submit values', () => {
  assert.deepEqual(mapFeedbackToDetailState('helpful'), { status: 'submitted', value: 'like' });
  assert.deepEqual(mapFeedbackToDetailState('not_helpful'), { status: 'submitted', value: 'dislike' });
  assert.deepEqual(mapFeedbackToDetailState(null), { status: 'none' });
  assert.equal(mapFeedbackValueToLegacy('like'), 'helpful');
  assert.equal(mapFeedbackValueToLegacy('dislike'), 'not_helpful');
});
