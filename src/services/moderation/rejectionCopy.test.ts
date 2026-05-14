import test from 'node:test';
import assert from 'node:assert/strict';
import { getModerationRejectionCopy, mapModerationReasonCode } from './rejectionCopy';

test('maps PRD base reason codes to canonical user messages', () => {
  const copy = getModerationRejectionCopy('personal_info');
  assert.equal(copy.reasonCode, 'personal_info');
  assert.equal(copy.userMessage, '개인정보가 포함되어 전송할 수 없습니다.');
  assert.equal(copy.helpMessage, null);
});

test('adds help only for high-risk self-harm and violence categories', () => {
  assert.equal(getModerationRejectionCopy('self_harm_suicide').helpMessage?.length > 0, true);
  assert.equal(getModerationRejectionCopy('crime_violence_victim').helpMessage?.length > 0, true);
  assert.equal(getModerationRejectionCopy('sexual').helpMessage, null);
});

test('maps provider wording deterministically without leaking provider text', () => {
  const copy = getModerationRejectionCopy('provider says suicide danger');
  assert.equal(copy.reasonCode, 'self_harm_suicide');
  assert.notEqual(copy.userMessage, 'provider says suicide danger');
});

test('unknown or malformed reasons fall back to abuse hate profanity', () => {
  assert.equal(mapModerationReasonCode('unknown-provider-category'), 'abuse_hate_profanity');
  assert.equal(mapModerationReasonCode(null), 'abuse_hate_profanity');
});
