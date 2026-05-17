import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
    commentMaxLength: 300,
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
    commentMaxLength: 300,
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

test('reply detail contract covers both feedback callbacks and comment callback', () => {
  const events: string[] = [];
  const props = makeReadyProps({
    onFeedbackChange: value => events.push(`change:${value}`),
    onFeedbackSubmit: () => events.push('feedback'),
    onCommentChange: value => events.push(`comment:${value}`),
    onCommentSubmit: () => events.push('comment-submit'),
  });

  props.onFeedbackChange('like');
  props.onFeedbackSubmit();
  props.onFeedbackChange('dislike');
  props.onFeedbackSubmit();
  props.onCommentChange('고마워요');
  props.onCommentSubmit();

  assert.deepEqual(events, [
    'change:like',
    'feedback',
    'change:dislike',
    'feedback',
    'comment:고마워요',
    'comment-submit',
  ]);
});

test('reply detail contract represents failed feedback/comment and existing display states', () => {
  const props = makeReadyProps({
    existingFeedback: { status: 'submitted', value: 'like', comment: '고마워요' },
    commentValidation: { status: 'invalid', message: '전송 실패' },
    commentModeration: { status: 'rejected', reason: '거절됨\n\n도움말' },
  });

  assert.equal(props.existingFeedback.status, 'submitted');
  assert.equal(props.existingFeedback.status === 'submitted' ? props.existingFeedback.comment : '', '고마워요');
  assert.equal(props.commentValidation.status, 'invalid');
  assert.equal(props.commentModeration.status, 'rejected');
});

test('reply detail source disables feedback and comment buttons while processing', () => {
  const source = readFileSync(join(process.cwd(), 'src/screens/replyDetail/ReplyDetailScreen.tsx'), 'utf8');

  assert.match(source, /processing=\{props\.isFeedbackProcessing\}/);
  assert.match(source, /disabled=\{props\.isCommentProcessing\}/);
  assert.match(source, /aria-label=\{isLike \? '이 답변이 위로가 되었어요 선택 후 제출' : '이 답변이 그냥 그랬어요 선택 후 제출'\}/);
  assert.match(source, /aria-pressed=\{selected\}/);
});

function makeReadyProps(overrides: Partial<ReplyDetailScreenProps> = {}): ReplyDetailScreenProps {
  return {
    variant: 'received-answer-detail',
    state: { status: 'ready' },
    originalWorry: {
      worryId: 'worry-1',
      category: WORRY_CATEGORIES[0],
      summaryText: 'Original worry',
      bodyText: 'Original worry',
      date: { label: 'Today' },
    },
    reply: {
      replyId: 'reply-1',
      bodyText: 'Reply',
      date: { label: 'Today' },
      replierDisplay: 'anonymous',
    },
    existingFeedback: { status: 'none' },
    selectedFeedback: 'like',
    commentDraft: '',
    commentMaxLength: 300,
    commentValidation: { status: 'valid' },
    commentModeration: { status: 'approved' },
    isFeedbackProcessing: false,
    isCommentProcessing: false,
    onBack: () => undefined,
    onFeedbackChange: () => undefined,
    onFeedbackSubmit: () => undefined,
    onCommentChange: () => undefined,
    onCommentSubmit: () => undefined,
    ...overrides,
  };
}
