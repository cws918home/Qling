import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canSubmitOnboarding,
  completeOnboarding,
  mapReservationResultToDuplicateState,
  reserveNickname,
  validateOnboardingDraft,
} from './onboardingProfile';
import type { NicknameReservationRepository } from './types';

function repository(): NicknameReservationRepository & { writes: unknown[] } {
  const writes: unknown[] = [];
  return {
    writes,
    async reserveNickname(params) {
      writes.push(params);
      return { status: 'available', ...params };
    },
    async completeOnboarding(params) {
      writes.push(params);
      return { status: 'completed', profile: params };
    },
  };
}

test('valid onboarding produces profile persistence contract', async () => {
  const repo = repository();
  const result = await completeOnboarding({
    uid: 'user-1',
    draft: {
      nickname: ' QLING ',
      gender: 'female',
      age: '14',
      interests: ['워라밸', '취업'],
    },
    repository: repo,
  });

  assert.equal(result.status, 'completed');
  assert.deepEqual(result.status === 'completed' ? result.profile : null, {
    uid: 'user-1',
    nickname: 'QLING',
    normalizedNickname: 'qling',
    gender: 'female',
    age: 14,
    interests: ['워라밸', '취업'],
  });
});

test('invalid required fields, duplicate nickname, and network states cannot submit or transition', () => {
  const validDraft = {
    nickname: '라미',
    gender: 'female',
    age: '20',
    interests: ['워라밸'],
  };
  assert.equal(canSubmitOnboarding({ draft: validDraft, duplicateState: 'idle' }), false);
  assert.equal(canSubmitOnboarding({ draft: validDraft, duplicateState: 'duplicate' }), false);
  assert.equal(canSubmitOnboarding({ draft: validDraft, duplicateState: 'network-failed' }), false);
  assert.equal(canSubmitOnboarding({ draft: validDraft, duplicateState: 'retry' }), false);
  assert.equal(canSubmitOnboarding({ draft: { ...validDraft, age: '' }, duplicateState: 'available' }), false);
  assert.equal(canSubmitOnboarding({ draft: { ...validDraft, interests: [] }, duplicateState: 'available' }), false);
  assert.equal(canSubmitOnboarding({ draft: validDraft, duplicateState: 'available' }), true);
});

test('duplicate-check result maps to UI states', () => {
  assert.equal(mapReservationResultToDuplicateState({ status: 'available', uid: 'u', nickname: '라미', normalizedNickname: '라미' }), 'available');
  assert.equal(mapReservationResultToDuplicateState({ status: 'duplicate', code: 'nickname_taken', message: 'taken' }), 'duplicate');
  assert.equal(mapReservationResultToDuplicateState({ status: 'invalid', code: 'bad', message: 'bad' }), 'invalid');
  assert.equal(mapReservationResultToDuplicateState({ status: 'conflict', code: 'reservation_conflict', message: 'conflict' }), 'retry');
  assert.equal(mapReservationResultToDuplicateState({ status: 'server_error', code: 'x', message: 'x' }), 'network-failed');
});

test('reservation trims and normalizes before repository call', async () => {
  const repo = repository();
  const result = await reserveNickname({ uid: 'user-1', nickname: ' QLING ', repository: repo });

  assert.equal(result.status, 'available');
  assert.deepEqual(repo.writes[0], {
    uid: 'user-1',
    nickname: 'QLING',
    normalizedNickname: 'qling',
  });
});

test('invalid draft does not persist profile', async () => {
  const repo = repository();
  const result = await completeOnboarding({
    uid: 'user-1',
    draft: {
      nickname: '라미',
      gender: 'female',
      age: '13',
      interests: ['워라밸'],
    },
    repository: repo,
  });

  assert.deepEqual(result, {
    status: 'invalid',
    code: 'invalid_profile',
    message: '온보딩 필수 입력값을 확인해주세요.',
  });
  assert.deepEqual(repo.writes, []);
});

test('validation uses domain category values and keeps 워라밸 selected', () => {
  const validation = validateOnboardingDraft({
    nickname: '라미',
    gender: 'female',
    age: '20',
    interests: ['워라밸', '워라벨'],
  });

  assert.equal(validation.valid, true);
  assert.deepEqual(validation.interests, { valid: true, interests: ['워라밸'] });
});
