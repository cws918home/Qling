import test from 'node:test';
import assert from 'node:assert/strict';
import { sendNewWorryPushesAfterCommit } from './pushLogs';

function createPushDb(tokensByUid: Record<string, Array<{ id: string; token?: string }>>) {
  const pushLogs: unknown[] = [];
  return {
    pushLogs,
    collection(name: string) {
      if (name === 'pushLogs') {
        return {
          add: async (data: unknown) => {
            pushLogs.push(data);
          },
        };
      }

      return {
        doc(uid: string) {
          return {
            get: async () => ({ exists: true, data: () => ({}) }),
            collection(collectionName: string) {
              assert.equal(collectionName, 'fcmTokens');
              return {
                get: async () => {
                  const tokenDocs = tokensByUid[uid] ?? [];
                  return {
                    empty: tokenDocs.length === 0,
                  docs: tokenDocs.map(tokenDoc => ({
                    id: tokenDoc.id,
                    data: () => tokenDoc.token ? { token: tokenDoc.token } : {},
                    ref: { delete: async () => undefined },
                  })),
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test('no-token user still gets skipped_no_token push log', async () => {
  const db = createPushDb({});

  await sendNewWorryPushesAfterCommit({
    db: db as never,
    messaging: null,
    deliveries: [{ deliveryId: 'delivery1', recipientUid: 'user1', worryId: 'worry1' }],
  });

  assert.equal(db.pushLogs.length, 1);
  assert.equal((db.pushLogs[0] as { status: string }).status, 'skipped_no_token');
});

test('messaging null writes failed log for available token', async () => {
  const db = createPushDb({ user1: [{ id: 'tokenDoc', token: 'token-value' }] });

  await sendNewWorryPushesAfterCommit({
    db: db as never,
    messaging: null,
    deliveries: [{ deliveryId: 'delivery1', recipientUid: 'user1', worryId: 'worry1' }],
  });

  assert.equal((db.pushLogs[0] as { status: string }).status, 'failed');
  assert.equal((db.pushLogs[0] as { errorCode: string }).errorCode, 'messaging_unavailable');
});

test('sent and failed token attempts create push logs without throwing', async () => {
  const db = createPushDb({
    user1: [
      { id: 'sent', token: 'sent-token' },
      { id: 'failed', token: 'failed-token' },
    ],
  });

  await sendNewWorryPushesAfterCommit({
    db: db as never,
    messaging: {
      send: async ({ token }: { token: string }) => {
        if (token === 'failed-token') throw new Error('send failed');
        return 'ok';
      },
    } as never,
    deliveries: [{ deliveryId: 'delivery1', recipientUid: 'user1', worryId: 'worry1' }],
  });

  assert.deepEqual(db.pushLogs.map(log => (log as { status: string }).status), ['sent', 'failed']);
});
