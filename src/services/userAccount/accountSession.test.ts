import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmAccountDeletionWithCleanup, confirmLogoutWithCleanup } from './accountSession';

test('logout confirmation cleanup clears local push state before sign-out', async () => {
  const calls: string[] = [];
  const result = await confirmLogoutWithCleanup({
    async cleanupLocalPushState() {
      calls.push('cleanup');
    },
    async signOut() {
      calls.push('signOut');
    },
  });

  assert.deepEqual(result, { status: 'completed' });
  assert.deepEqual(calls, ['cleanup', 'signOut']);
});

test('account deletion confirmation runs server deletion, then local cleanup, then sign-out', async () => {
  const calls: string[] = [];
  const result = await confirmAccountDeletionWithCleanup({
    async deleteAccount() {
      calls.push('delete');
      return { status: 'deleted' };
    },
    async cleanupLocalPushState() {
      calls.push('cleanup');
    },
    async signOut() {
      calls.push('signOut');
    },
  });

  assert.deepEqual(result, { status: 'completed' });
  assert.deepEqual(calls, ['delete', 'cleanup', 'signOut']);
});

test('account deletion confirmation does not clean up or sign out after deletion failure', async () => {
  const calls: string[] = [];
  const result = await confirmAccountDeletionWithCleanup({
    async deleteAccount() {
      calls.push('delete');
      return { status: 'failed', reason: 'server failed' };
    },
    async cleanupLocalPushState() {
      calls.push('cleanup');
    },
    async signOut() {
      calls.push('signOut');
    },
  });

  assert.deepEqual(result, { status: 'failed', reason: 'server failed' });
  assert.deepEqual(calls, ['delete']);
});

test('account deletion confirmation completes with warning when local cleanup fails after server deletion', async () => {
  const calls: string[] = [];
  const result = await confirmAccountDeletionWithCleanup({
    async deleteAccount() {
      calls.push('delete');
      return { status: 'deleted' };
    },
    async cleanupLocalPushState() {
      calls.push('cleanup');
      throw new Error('cleanup failed');
    },
    async signOut() {
      calls.push('signOut');
    },
  });

  assert.deepEqual(result, { status: 'completed_with_local_warning', reason: 'cleanup failed' });
  assert.deepEqual(calls, ['delete', 'cleanup']);
});

test('account deletion confirmation completes with warning when sign-out fails after server deletion', async () => {
  const calls: string[] = [];
  const result = await confirmAccountDeletionWithCleanup({
    async deleteAccount() {
      calls.push('delete');
      return { status: 'deleted' };
    },
    async cleanupLocalPushState() {
      calls.push('cleanup');
    },
    async signOut() {
      calls.push('signOut');
      throw new Error('sign out failed');
    },
  });

  assert.deepEqual(result, { status: 'completed_with_local_warning', reason: 'sign out failed' });
  assert.deepEqual(calls, ['delete', 'cleanup', 'signOut']);
});
