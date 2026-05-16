import test from 'node:test';
import assert from 'node:assert/strict';
import { WORRY_CATEGORIES } from '@midnight-radio/domain';
import type { ReplyDetailScreenProps } from './contract';

test('reply detail contract distinguishes received and my answer variants', () => {
  const variants: ReplyDetailScreenProps['variant'][] = [
    'received-answer-detail',
    'my-answer-detail',
  ];

  assert.deepEqual(variants, ['received-answer-detail', 'my-answer-detail']);
});

test('reply detail contract represents original worry, reply, feedback, and comment events', () => {
  const props = {
    variant: 'received-answer-detail',
    state: { status: 'ready' },
    originalWorry: {
      worryId: 'worry-1',
      category: WORRY_CATEGORIES[2],
      summaryText: 'Summary',
      bodyText: 'Original worry',
      date: { label: 'Today' },
      isUnread: true,
    },
    reply: {
      replyId: 'reply-1',
      bodyText: 'Reply body',
      date: { label: 'Today' },
      replierDisplay: 'anonymous',
    },
    existingFeedback: {
      status: 'submitted',
      value: 'like',
      comment: 'Helpful',
    },
    selectedFeedback: 'like',
    commentDraft: 'Comment draft',
    commentValidation: { status: 'valid' },
    commentModeration: { status: 'approved' },
    isFeedbackProcessing: false,
    isCommentProcessing: false,
    onBack: () => undefined,
    onFeedbackChange: () => undefined,
    onFeedbackSubmit: () => undefined,
    onCommentChange: () => undefined,
    onCommentSubmit: () => undefined,
  } satisfies ReplyDetailScreenProps;

  assert.equal(props.originalWorry?.isUnread, true);
  assert.equal(props.existingFeedback.status, 'submitted');
  assert.equal(typeof props.onFeedbackSubmit, 'function');
  assert.equal(typeof props.onCommentSubmit, 'function');
  assert.equal(typeof props.onBack, 'function');
  assert.equal(Object.hasOwn(props, 'onHelpedCountChange'), false);
});

test('reply detail contract represents rejection and unavailable states without mutation clients', () => {
  const props = {
    variant: 'my-answer-detail',
    state: { status: 'empty', message: 'Not found' },
    existingFeedback: { status: 'none' },
    commentDraft: '',
    commentValidation: { status: 'invalid', message: 'Required' },
    commentModeration: { status: 'rejected', reason: 'Rejected comment' },
    isFeedbackProcessing: false,
    isCommentProcessing: false,
    onBack: () => undefined,
    onFeedbackChange: () => undefined,
    onFeedbackSubmit: () => undefined,
    onCommentChange: () => undefined,
    onCommentSubmit: () => undefined,
  } satisfies ReplyDetailScreenProps;

  assert.equal(props.commentModeration.status, 'rejected');
  assert.equal(Object.hasOwn(props, 'feedbackClient'), false);
  assert.equal(Object.hasOwn(props, 'read' + 'StateClient'), false);
});
