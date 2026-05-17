import test from 'node:test';
import assert from 'node:assert/strict';
import { WORRY_CATEGORIES } from '@midnight-radio/domain';
import { CONTENT_MAX_LENGTH, validateDraftContent } from '../../services/validation/content';
import type { SelectedReceivedWorry } from '../receivedWorries/ReceivedWorriesContainer';
import { buildWriteDraftContract, mapSelectedWorryToOriginalWorrySummary } from './mapping';

test('maps selected delivery data to original worry summary props', () => {
  const summary = mapSelectedWorryToOriginalWorrySummary({
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
    category: WORRY_CATEGORIES[2],
    refinedContent: 'Original worry',
    createdAt: { toMillis: () => Date.UTC(2026, 4, 16) },
  } as SelectedReceivedWorry);

  assert.deepEqual(summary, {
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
    category: WORRY_CATEGORIES[2],
    bodyText: 'Original worry',
    receivedAt: {
      label: '5월 16일',
      isoValue: '2026-05-16T00:00:00.000Z',
    },
  });
});

test('does not create reply summary props without delivery or worry id', () => {
  assert.equal(mapSelectedWorryToOriginalWorrySummary({
    worryId: 'worry-1',
    category: WORRY_CATEGORIES[0],
    refinedContent: 'Legacy worry',
  } as SelectedReceivedWorry), null);

  assert.equal(mapSelectedWorryToOriginalWorrySummary({
    deliveryId: 'delivery-1',
    category: WORRY_CATEGORIES[0],
    refinedContent: 'Legacy worry',
  } as SelectedReceivedWorry), null);
});

test('builds valid draft contract', () => {
  const contract = buildWriteDraftContract({
    value: '  valid draft  ',
    maxLength: CONTENT_MAX_LENGTH,
    validation: validateDraftContent('  valid draft  ', 'worry'),
    moderation: { status: 'idle' },
    isProcessing: false,
  });

  assert.equal(contract.characterCount, 11);
  assert.equal(contract.validation.status, 'valid');
  assert.equal(contract.submitDisabledReason, undefined);
});

test('builds empty and too-long draft disabled states', () => {
  const empty = buildWriteDraftContract({
    value: '   ',
    maxLength: CONTENT_MAX_LENGTH,
    validation: validateDraftContent('   ', 'reply'),
    moderation: { status: 'idle' },
    isProcessing: false,
  });
  const tooLongValue = 'a'.repeat(CONTENT_MAX_LENGTH + 1);
  const tooLong = buildWriteDraftContract({
    value: tooLongValue,
    maxLength: CONTENT_MAX_LENGTH,
    validation: validateDraftContent(tooLongValue, 'reply'),
    moderation: { status: 'idle' },
    isProcessing: false,
  });

  assert.equal(empty.validation.status, 'invalid');
  assert.equal(empty.submitDisabledReason, 'empty');
  assert.equal(tooLong.characterCount, CONTENT_MAX_LENGTH + 1);
  assert.equal(tooLong.submitDisabledReason, 'too-long');
});

test('builds processing and moderation display states', () => {
  const processing = buildWriteDraftContract({
    value: 'draft',
    maxLength: CONTENT_MAX_LENGTH,
    validation: validateDraftContent('draft', 'worry'),
    moderation: { status: 'checking' },
    isProcessing: true,
  });
  const rejected = buildWriteDraftContract({
    value: 'draft',
    maxLength: CONTENT_MAX_LENGTH,
    validation: validateDraftContent('draft', 'worry'),
    moderation: { status: 'rejected', reason: 'Rejected', helpMessage: 'Help' },
    isProcessing: false,
  });
  const failed = buildWriteDraftContract({
    value: 'draft',
    maxLength: CONTENT_MAX_LENGTH,
    validation: validateDraftContent('draft', 'worry'),
    moderation: { status: 'failed', message: 'Failed' },
    isProcessing: false,
  });

  assert.equal(processing.submitDisabledReason, 'processing');
  assert.equal(rejected.moderation.status, 'rejected');
  assert.equal(failed.errorMessage, 'Failed');
});

test('builds moderation-pending disabled state when checking is represented without submit processing', () => {
  const contract = buildWriteDraftContract({
    value: 'draft',
    maxLength: CONTENT_MAX_LENGTH,
    validation: validateDraftContent('draft', 'worry'),
    moderation: { status: 'checking' },
    isProcessing: false,
  });

  assert.equal(contract.submitDisabledReason, 'moderation-pending');
});
