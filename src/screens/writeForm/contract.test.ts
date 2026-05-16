import test from 'node:test';
import assert from 'node:assert/strict';
import { WORRY_CATEGORIES } from '@midnight-radio/domain';
import type { WriteFormScreenProps, WriteReplyFormProps, WriteWorryFormProps } from './contract';

const validDraft = {
  value: 'Draft text',
  characterCount: 10,
  maxLength: 500,
  validation: { status: 'valid' },
  moderation: { status: 'idle' },
  isProcessing: false,
} as const;

test('write-worry form contract represents draft, category, validation, and publish event', () => {
  const props = {
    kind: 'write-worry',
    draft: {
      ...validDraft,
      moderation: { status: 'failed', message: 'Submit failed' },
      errorMessage: 'Submit failed',
      submitDisabledReason: 'processing',
    },
    category: WORRY_CATEGORIES[0],
    onDraftChange: () => undefined,
    onCategoryChange: () => undefined,
    onPublish: () => undefined,
  } satisfies WriteWorryFormProps;

  assert.equal(props.kind, 'write-worry');
  assert.equal(props.draft.characterCount, 10);
  assert.equal(props.draft.maxLength, 500);
  assert.equal(props.draft.value, 'Draft text');
  assert.equal(props.draft.validation.status, 'valid');
  assert.equal(props.draft.moderation.status, 'failed');
  assert.equal(props.draft.errorMessage, 'Submit failed');
  assert.equal(props.draft.isProcessing, false);
  assert.equal(typeof props.onDraftChange, 'function');
  assert.equal(typeof props.onPublish, 'function');
});

test('write-reply form contract carries original worry summary, selected delivery, and worry ids', () => {
  const props = {
    kind: 'write-reply',
    originalWorry: {
      deliveryId: 'delivery-1',
      worryId: 'worry-1',
      category: WORRY_CATEGORIES[1],
      bodyText: 'Original worry body',
      receivedAt: { label: 'Today' },
    },
    draft: {
      ...validDraft,
      moderation: { status: 'rejected', reason: 'Rejected content' },
      errorMessage: 'Submit failed',
      submitDisabledReason: 'moderation-pending',
    },
    onDraftChange: () => undefined,
    onPublish: () => undefined,
  } satisfies WriteReplyFormProps;

  assert.equal(props.originalWorry.deliveryId, 'delivery-1');
  assert.equal(props.originalWorry.worryId, 'worry-1');
  assert.equal(props.originalWorry.bodyText, 'Original worry body');
  assert.equal(props.draft.value, 'Draft text');
  assert.equal(props.draft.moderation.status, 'rejected');
  assert.equal(props.draft.submitDisabledReason, 'moderation-pending');
  assert.equal(typeof props.onDraftChange, 'function');
  assert.equal(typeof props.onPublish, 'function');
});

test('write form union keeps publication as event props only', () => {
  const props: WriteFormScreenProps = {
    kind: 'write-worry',
    draft: {
      ...validDraft,
      validation: { status: 'invalid', message: 'Too long' },
      submitDisabledReason: 'too-long',
    },
    onDraftChange: () => undefined,
    onPublish: () => undefined,
  };

  assert.equal(typeof props.onPublish, 'function');
  assert.equal(Object.hasOwn(props, 'publishResult'), false);
  assert.equal(Object.hasOwn(props, 'publicationClient'), false);
  assert.equal(Object.hasOwn(props, 'successRoute'), false);
  assert.equal(Object.hasOwn(props, 'successScreen'), false);
});
