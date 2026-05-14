import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteMyAccount } from './deleteMyAccount';
import type { UserAccountRepository } from './types';

function createRepository(options: {
  failCleanupOnce?: boolean;
} = {}) {
  const profile: Record<string, unknown> = {
    uid: 'user-1',
    gender: 'female',
    interests: ['career'],
    helpedCount: 3,
    activeDeliveryCount: 2,
    createdAt: 'created-at',
    updatedAt: 'old-updated-at',
    lastActive: 'last-active',
    lastSeenAt: 'last-seen-at',
  };
  const tokens = new Set(['token-1', 'token-2']);
  let cleanupFailuresRemaining = options.failCleanupOnce ? 1 : 0;
  const contentSentinel = {
    worries: [{ id: 'worry-1' }],
    deliveries: [{ id: 'delivery-1' }],
    replies: [{ id: 'reply-1' }],
    feedbacks: [{ id: 'feedback-1' }],
    moderationLogs: [{ id: 'moderation-1' }],
    pushLogs: [{ id: 'push-1' }],
    letters: [{ id: 'letter-1' }],
  };
  const calls: string[] = [];

  const repository: UserAccountRepository = {
    async softDeleteUser(params) {
      calls.push(`softDelete:${params.uid}`);
      Object.assign(profile, {
        deleted: true,
        deletedAt: params.deletedAt,
        updatedAt: params.updatedAt,
      });
    },
    async deletePushTokens(params) {
      calls.push(`deleteTokens:${params.uid}`);
      if (cleanupFailuresRemaining > 0) {
        cleanupFailuresRemaining -= 1;
        throw new Error('token cleanup failed');
      }
      const deletedCount = tokens.size;
      tokens.clear();
      return { deletedCount };
    },
  };

  return { repository, profile, tokens, contentSentinel, calls };
}

test('deleteMyAccount soft deletes profile, preserves profile fields and removes tokens', async () => {
  const harness = createRepository();
  const beforeContent = structuredClone(harness.contentSentinel);

  const result = await deleteMyAccount({
    uid: 'user-1',
    repository: harness.repository,
    clock: { now: () => 'deleted-at' },
  });

  assert.deepEqual(result, { status: 'deleted', deletedTokenCount: 2 });
  assert.deepEqual(harness.profile, {
    uid: 'user-1',
    gender: 'female',
    interests: ['career'],
    helpedCount: 3,
    activeDeliveryCount: 2,
    createdAt: 'created-at',
    updatedAt: 'deleted-at',
    lastActive: 'last-active',
    lastSeenAt: 'last-seen-at',
    deleted: true,
    deletedAt: 'deleted-at',
  });
  assert.equal(harness.tokens.size, 0);
  assert.deepEqual(harness.contentSentinel, beforeContent);
});

test('deleteMyAccount is idempotent for already deleted users and empty token collections', async () => {
  const harness = createRepository();

  await deleteMyAccount({
    uid: 'user-1',
    repository: harness.repository,
    clock: { now: () => 'first-delete' },
  });
  const result = await deleteMyAccount({
    uid: 'user-1',
    repository: harness.repository,
    clock: { now: () => 'second-delete' },
  });

  assert.deepEqual(result, { status: 'deleted', deletedTokenCount: 0 });
  assert.equal(harness.profile.deleted, true);
  assert.equal(harness.profile.deletedAt, 'second-delete');
  assert.equal(harness.profile.updatedAt, 'second-delete');
  assert.equal(harness.tokens.size, 0);
});

test('deleteMyAccount reports token cleanup failure after soft delete and retry removes remaining tokens', async () => {
  const harness = createRepository({ failCleanupOnce: true });

  await assert.rejects(
    deleteMyAccount({
      uid: 'user-1',
      repository: harness.repository,
      clock: { now: () => 'failed-delete' },
    }),
    /token cleanup failed/
  );
  assert.equal(harness.profile.deleted, true);
  assert.equal(harness.tokens.size, 2);

  const result = await deleteMyAccount({
    uid: 'user-1',
    repository: harness.repository,
    clock: { now: () => 'retry-delete' },
  });

  assert.deepEqual(result, { status: 'deleted', deletedTokenCount: 2 });
  assert.equal(harness.profile.deletedAt, 'retry-delete');
  assert.equal(harness.tokens.size, 0);
});

test('deleteMyAccount accepts only the verified uid parameter and repository exposes no content methods', async () => {
  const harness = createRepository();

  await deleteMyAccount({
    uid: 'verified-user',
    repository: harness.repository,
    clock: { now: () => 'deleted-at' },
  });

  assert.deepEqual(harness.calls, ['softDelete:verified-user', 'deleteTokens:verified-user']);
  assert.deepEqual(Object.keys(harness.repository).sort(), ['deletePushTokens', 'softDeleteUser']);
});
