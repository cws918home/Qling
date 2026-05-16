import test from 'node:test';
import assert from 'node:assert/strict';
import { WORRY_CATEGORIES } from '@midnight-radio/domain';
import {
  AGE_VALIDATION_MESSAGES,
  NICKNAME_VALIDATION_MESSAGES,
  normalizeInterests,
  normalizedNicknameKey,
  validateAge,
  validateNickname,
} from './profileValidation';

test('nickname validation trims before validation and storage', () => {
  assert.deepEqual(validateNickname('  라미  '), {
    valid: true,
    nickname: '라미',
    normalizedNickname: '라미',
  });
});

test('nickname validation normalizes NFC and lowercase duplicate key', () => {
  const decomposed = '\u1100\u1161A';
  assert.deepEqual(validateNickname(decomposed), {
    valid: true,
    nickname: '가A',
    normalizedNickname: '가a',
  });
  assert.equal(normalizedNicknameKey('QLING'), 'qling');
});

test('nickname length boundaries are enforced', () => {
  assert.deepEqual(validateNickname('가'), {
    valid: false,
    error: 'tooShort',
    message: NICKNAME_VALIDATION_MESSAGES.tooShort,
  });
  assert.equal(validateNickname('가나').valid, true);
  assert.equal(validateNickname('가나다라마바사아자차카타').valid, true);
  assert.deepEqual(validateNickname('가나다라마바사아자차카타파'), {
    valid: false,
    error: 'tooLong',
    message: NICKNAME_VALIDATION_MESSAGES.tooLong,
  });
});

test('nickname allowed and blocked characters match Phase 9 contract', () => {
  assert.equal(validateNickname('라미Qling17').valid, true);
  assert.deepEqual(validateNickname('라 미'), {
    valid: false,
    error: 'invalidCharacters',
    message: NICKNAME_VALIDATION_MESSAGES.invalidCharacters,
  });
  assert.equal(validateNickname('라미!').valid, false);
  assert.equal(validateNickname('라미🙂').valid, false);
  assert.equal(validateNickname('라\n미').valid, false);
  assert.deepEqual(validateNickname('   '), {
    valid: false,
    error: 'required',
    message: NICKNAME_VALIDATION_MESSAGES.required,
  });
});

test('age validation requires numeric 14 through 99 inclusive', () => {
  assert.deepEqual(validateAge(''), {
    valid: false,
    error: 'required',
    message: AGE_VALIDATION_MESSAGES.required,
  });
  assert.deepEqual(validateAge('스무살'), {
    valid: false,
    error: 'numeric',
    message: AGE_VALIDATION_MESSAGES.numeric,
  });
  assert.deepEqual(validateAge('14'), { valid: true, age: 14 });
  assert.deepEqual(validateAge('99'), { valid: true, age: 99 });
  assert.deepEqual(validateAge('13'), {
    valid: false,
    error: 'range',
    message: AGE_VALIDATION_MESSAGES.range,
  });
  assert.deepEqual(validateAge('100'), {
    valid: false,
    error: 'range',
    message: AGE_VALIDATION_MESSAGES.range,
  });
});

test('interests normalize through domain categories and preserve 워라밸', () => {
  assert.ok(WORRY_CATEGORIES.includes('워라밸'));
  assert.deepEqual(normalizeInterests(['워라밸', '없는값', '워라밸', '취업']), ['워라밸', '취업']);
});
