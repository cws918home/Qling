import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPushTokenDoc, buildUserNotificationProfile } from './adapters';
import { createPushRegistrationLifecycle, PUSH_CONFIRMATION_COOLDOWN_MS } from './internalLifecycle';
import { getPushTokenSessionKey, getTokenPreview } from './policy';
import { selectAppControlledRegistration } from './serviceWorker';
import {
  clearStoredPushMetadataInStorage,
  getDefaultStoredPushMetadata,
  getOrCreatePushInstanceIdInStorage,
  PUSH_INSTANCE_ID_STORAGE_KEY,
  PUSH_LAST_TOKEN_STORAGE_KEY,
  PUSH_LAST_UID_STORAGE_KEY,
  readStoredPushMetadataFromStorage,
  writeStoredPushMetadataToStorage,
} from './storage';
import type {
  PushRegistrationAdapters,
  PushRegistrationStatus,
  StoredPushMetadata,
} from './types';

class MemoryStorage {
  values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const completeMetadata = (overrides: Partial<StoredPushMetadata> = {}): StoredPushMetadata => ({
  ...getDefaultStoredPushMetadata(),
  instanceId: 'instance-1',
  lastKnownFcmToken: 'token-1',
  lastKnownUid: 'user-1',
  lastSuccessfulRegistrationAt: 1000,
  lastSuccessfulRegistrationToken: 'token-1',
  lastSuccessfulRegistrationUid: 'user-1',
  lastSuccessfulRegistrationInstanceId: 'instance-1',
  ...overrides,
});

function createHarness(overrides: Partial<PushRegistrationAdapters<string>> = {}) {
  let metadata = getDefaultStoredPushMetadata();
  let status: PushRegistrationStatus = 'idle';
  let permission: NotificationPermission = 'granted';
  let token = 'token-1';
  let now = 100_000;
  let tokenDocExists = true;
  let resolveToken: ((value: string | null) => void) | null = null;

  const calls = {
    deleteTokenDoc: [] as Array<[string, string]>,
    writeTokenDoc: [] as unknown[],
    getTokenDoc: [] as Array<[string, string]>,
    resolveMessagingRegistration: [] as boolean[],
  };

  const adapters: PushRegistrationAdapters<string> = {
    hasMessaging: () => true,
    isNotificationSupported: () => true,
    isServiceWorkerSupported: () => true,
    getNotificationPermission: () => permission,
    requestNotificationPermission: async () => permission,
    isInstalledPWA: () => false,
    readStoredMetadata: () => metadata,
    writeStoredMetadata: updates => {
      metadata = { ...metadata, ...updates };
    },
    clearStoredMetadata: () => {
      metadata = {
        ...metadata,
        lastKnownFcmToken: null,
        lastKnownUid: null,
        lastSuccessfulRegistrationAt: null,
        lastSuccessfulRegistrationToken: null,
        lastSuccessfulRegistrationUid: null,
        lastSuccessfulRegistrationInstanceId: null,
      };
    },
    getOrCreateInstanceId: () => {
      metadata = { ...metadata, instanceId: metadata.instanceId ?? 'instance-1' };
      return metadata.instanceId ?? 'instance-1';
    },
    resolveMessagingRegistration: async installedPWA => {
      calls.resolveMessagingRegistration.push(installedPWA);
      return { registration: 'registration-1', registrationType: 'app-controlled' };
    },
    getFcmToken: async () => {
      if (resolveToken) {
        return new Promise(resolve => {
          resolveToken = value => resolve(value);
        });
      }
      return token;
    },
    getTokenDoc: async (uid, fcmToken) => {
      calls.getTokenDoc.push([uid, fcmToken]);
      return {
        exists: () => tokenDocExists,
        data: () => ({ createdAt: 'created-at' }),
      };
    },
    writeTokenDoc: async params => {
      calls.writeTokenDoc.push(params);
    },
    updateLastTokenRefresh: async () => undefined,
    deleteTokenDoc: async (uid, fcmToken) => {
      calls.deleteTokenDoc.push([uid, fcmToken]);
    },
    now: () => now,
    alert: () => undefined,
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
    ...overrides,
  };

  const lifecycle = createPushRegistrationLifecycle({
    adapters,
    state: {
      getPushRegistrationStatus: () => status,
      setNotificationPermission: nextPermission => {
        permission = nextPermission;
      },
      setPushRegistrationStatus: nextStatus => {
        status = nextStatus;
      },
      setFcmDebugToken: () => undefined,
    },
  });

  return {
    adapters,
    calls,
    lifecycle,
    get metadata() {
      return metadata;
    },
    set metadata(nextMetadata: StoredPushMetadata) {
      metadata = nextMetadata;
    },
    get status() {
      return status;
    },
    set status(nextStatus: PushRegistrationStatus) {
      status = nextStatus;
    },
    set permission(nextPermission: NotificationPermission) {
      permission = nextPermission;
    },
    set token(nextToken: string) {
      token = nextToken;
    },
    set now(nextNow: number) {
      now = nextNow;
    },
    set tokenDocExists(nextExists: boolean) {
      tokenDocExists = nextExists;
    },
    holdNextToken() {
      resolveToken = () => undefined;
      return (nextToken: string | null) => {
        resolveToken?.(nextToken);
        resolveToken = null;
      };
    },
  };
}

test('legacy localStorage key fallback', () => {
  const storage = new MemoryStorage();
  storage.setItem(PUSH_INSTANCE_ID_STORAGE_KEY, 'legacy-instance');
  storage.setItem(PUSH_LAST_TOKEN_STORAGE_KEY, 'legacy-token');
  storage.setItem(PUSH_LAST_UID_STORAGE_KEY, 'legacy-user');

  assert.deepEqual(readStoredPushMetadataFromStorage(storage), {
    ...getDefaultStoredPushMetadata(),
    instanceId: 'legacy-instance',
    lastKnownFcmToken: 'legacy-token',
    lastKnownUid: 'legacy-user',
  });
});

test('metadata write and clear behavior preserves instance id', () => {
  const storage = new MemoryStorage();
  writeStoredPushMetadataToStorage(storage, {
    instanceId: 'instance-1',
    lastKnownFcmToken: 'token-1',
    lastKnownUid: 'user-1',
  });

  clearStoredPushMetadataInStorage(storage);

  assert.equal(readStoredPushMetadataFromStorage(storage).instanceId, 'instance-1');
  assert.equal(readStoredPushMetadataFromStorage(storage).lastKnownFcmToken, null);
  assert.equal(storage.getItem(PUSH_LAST_TOKEN_STORAGE_KEY), null);
});

test('token session key formatting', () => {
  assert.equal(getPushTokenSessionKey('uid', 'token'), 'uid::token');
});

test('token preview formatting', () => {
  assert.equal(getTokenPreview('abcdefghijklmnop'), 'abcdefghijkl');
  assert.equal(getTokenPreview(null), null);
});

test('token doc write model includes exact notification fields and preserves createdAt on update', () => {
  const tokenDoc = buildPushTokenDoc({
    token: 'token-1',
    userAgent: 'agent',
    instanceId: 'instance-1',
    permission: 'granted',
    installedPWA: true,
    timestamp: 'updated-at',
    existingCreatedAt: 'created-at',
  });

  assert.deepEqual(Object.keys(tokenDoc).sort(), [
    'createdAt',
    'instanceId',
    'isInstalledPWA',
    'lastSeenAt',
    'notificationPermission',
    'platform',
    'token',
    'updatedAt',
    'userAgent',
  ].sort());
  assert.equal(tokenDoc.createdAt, 'created-at');
  assert.equal(tokenDoc.updatedAt, 'updated-at');
  assert.equal(tokenDoc.lastSeenAt, 'updated-at');
  assert.equal(tokenDoc.notificationPermission, 'granted');
  assert.equal(tokenDoc.isInstalledPWA, true);
});

test('new token doc write model uses current timestamp for createdAt updatedAt and lastSeenAt', () => {
  const tokenDoc = buildPushTokenDoc({
    token: 'token-1',
    userAgent: 'agent',
    instanceId: 'instance-1',
    permission: 'granted',
    installedPWA: false,
    timestamp: 'now',
  });

  assert.equal(tokenDoc.createdAt, 'now');
  assert.equal(tokenDoc.updatedAt, 'now');
  assert.equal(tokenDoc.lastSeenAt, 'now');
});

test('user notification profile writes only notificationPermission and isInstalledPWA', () => {
  assert.deepEqual(buildUserNotificationProfile({
    permission: 'denied',
    installedPWA: false,
  }), {
    notificationPermission: 'denied',
    isInstalledPWA: false,
  });
});

test('permission revoked after previous token triggers cleanup', async () => {
  const harness = createHarness();
  harness.permission = 'denied';
  harness.status = 'registered';
  harness.metadata = completeMetadata();

  const result = await harness.lifecycle.maybeRecoverPushRegistration({ uid: 'user-1' }, 'app-foreground');

  assert.equal(result.status, 'skipped');
  assert.deepEqual(harness.calls.deleteTokenDoc, [['user-1', 'token-1']]);
  assert.equal(harness.metadata.lastKnownFcmToken, null);
});

test('different signed-in user triggers previous token cleanup only after new registration succeeds', async () => {
  const harness = createHarness();
  harness.metadata = completeMetadata();
  harness.token = 'token-2';

  await harness.lifecycle.ensurePushRegistration({ uid: 'user-2' }, 'signed-in-stable');

  assert.deepEqual(harness.calls.writeTokenDoc.map(call => (call as { uid: string }).uid), ['user-2']);
  assert.deepEqual(harness.calls.deleteTokenDoc, [['user-1', 'token-1']]);
});

test('token change triggers previous token cleanup only after new registration succeeds', async () => {
  const harness = createHarness();
  harness.metadata = completeMetadata();
  harness.token = 'token-2';

  await harness.lifecycle.ensurePushRegistration({ uid: 'user-1' }, 'signed-in-stable');

  assert.deepEqual(harness.calls.writeTokenDoc.map(call => (call as { token: string }).token), ['token-2']);
  assert.deepEqual(harness.calls.deleteTokenDoc, [['user-1', 'token-1']]);
});

test('successful registration writes permission and PWA state to token doc request', async () => {
  const harness = createHarness({ isInstalledPWA: () => true });
  harness.permission = 'granted';

  await harness.lifecycle.ensurePushRegistration({ uid: 'user-1' }, 'signed-in-stable');

  assert.equal(harness.calls.writeTokenDoc.length, 1);
  const write = harness.calls.writeTokenDoc[0] as {
    uid: string;
    token: string;
    permission: NotificationPermission;
    installedPWA: boolean;
    instanceId: string;
    existingTokenDoc: { exists(): boolean; data(): { createdAt?: unknown } };
  };
  assert.equal(write.uid, 'user-1');
  assert.equal(write.token, 'token-1');
  assert.equal(write.permission, 'granted');
  assert.equal(write.installedPWA, true);
  assert.equal(write.instanceId, 'instance-1');
  assert.equal(write.existingTokenDoc.data().createdAt, 'created-at');
});

test('successful foreground confirmation refreshes token doc lastSeenAt path', async () => {
  const harness = createHarness();
  harness.metadata = completeMetadata({
    lastSuccessfulRegistrationAt: 100_000 - PUSH_CONFIRMATION_COOLDOWN_MS - 1,
    lastSuccessfulRegistrationToken: 'old-token',
  });

  const result = await harness.lifecycle.maybeRecoverPushRegistration({ uid: 'user-1' }, 'app-foreground');

  assert.equal(result.status, 'confirmed');
  assert.equal(harness.calls.writeTokenDoc.length, 1);
  assert.equal((harness.calls.writeTokenDoc[0] as { token: string }).token, 'token-1');
});

test('confirmation cooldown suppresses repeated Firestore reads', async () => {
  const harness = createHarness();
  harness.metadata = completeMetadata({
    lastSuccessfulRegistrationAt: 100_000 - PUSH_CONFIRMATION_COOLDOWN_MS + 1,
    lastSuccessfulRegistrationToken: 'old-token',
  });

  const result = await harness.lifecycle.maybeRecoverPushRegistration({ uid: 'user-1' }, 'app-foreground');

  assert.equal(result.status, 'skipped');
  assert.equal(harness.calls.getTokenDoc.length, 0);
});

test('in-flight registration dedupes repeated recovery triggers', async () => {
  const harness = createHarness();
  const releaseToken = harness.holdNextToken();

  const first = harness.lifecycle.maybeRecoverPushRegistration({ uid: 'user-1' }, 'app-foreground');
  const second = harness.lifecycle.maybeRecoverPushRegistration({ uid: 'user-1' }, 'signed-in-stable');
  releaseToken('token-1');

  const [firstResult, secondResult] = await Promise.all([first, second]);

  assert.equal(firstResult.status, 'registered');
  assert.equal(secondResult.status, 'registered');
  assert.equal(harness.calls.resolveMessagingRegistration.length, 1);
});

test('app-controlled service worker is preferred over fallback when available', () => {
  const fallback = {
    active: { scriptURL: 'https://example.test/firebase-messaging-sw.js' },
  } as ServiceWorkerRegistration;
  const appControlled = {
    active: { scriptURL: 'https://example.test/sw.js' },
  } as ServiceWorkerRegistration;

  assert.equal(selectAppControlledRegistration([fallback, appControlled]), appControlled);
});

test('instance id creation persists generated id', () => {
  const storage = new MemoryStorage();

  assert.equal(getOrCreatePushInstanceIdInStorage(storage, () => 'instance-1'), 'instance-1');
  assert.equal(getOrCreatePushInstanceIdInStorage(storage, () => 'instance-2'), 'instance-1');
});
