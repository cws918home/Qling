import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withAuthProfileUid } from './profileIdentity';

test('profile identity is restored from Firebase Auth uid when user doc has no uid', () => {
  const profile = withAuthProfileUid({
    gender: 'female',
    interests: ['취업'],
  }, 'auth-user');

  assert.equal(profile.uid, 'auth-user');
});

test('profile identity uses Firebase Auth uid when user doc uid is stale', () => {
  const profile = withAuthProfileUid({
    uid: 'legacy-user',
    gender: 'female',
    interests: ['취업'],
  }, 'auth-user');

  assert.equal(profile.uid, 'auth-user');
});
