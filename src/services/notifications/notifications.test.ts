import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteAllPushTokensForUser,
  sendNewReplyNotificationAfterCommit,
  sendNewWorryNotificationAfterCommit,
  sendReplyLikedNotificationAfterCommit,
} from './index';

type TokenDoc = { id: string; token: string; deleted?: boolean };

function createDb(options: {
  user?: Record<string, unknown> | null;
  tokens?: TokenDoc[];
} = {}) {
  const logs: Record<string, unknown>[] = [];
  const tokens = options.tokens ?? [{ id: 'token-1', token: 'token-1' }];
  const db = {
    logs,
    tokens,
    collection(name: string) {
      if (name === 'pushLogs') {
        return {
          async add(data: Record<string, unknown>) {
            logs.push(data);
            return { id: `log-${logs.length}` };
          },
        };
      }
      assert.equal(name, 'users');
      return {
        doc(uid: string) {
          return {
            async get() {
              return {
                exists: options.user !== null,
                data: () => options.user ?? {},
              };
            },
            collection(collectionName: string) {
              assert.equal(collectionName, 'fcmTokens');
              return {
                async get() {
                  const liveTokens = tokens.filter(token => !token.deleted);
                  return {
                    empty: liveTokens.length === 0,
                    docs: liveTokens.map(tokenDoc => ({
                      id: tokenDoc.id,
                      data: () => ({ token: tokenDoc.token }),
                      ref: {
                        delete: async () => {
                          tokenDoc.deleted = true;
                        },
                      },
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
  return db;
}

test('new_worry sends and writes sent', async () => {
  const db = createDb();
  const sends: unknown[] = [];
  await sendNewWorryNotificationAfterCommit({
    db: db as never,
    messaging: { send: async message => { sends.push(message); return 'message-id'; } } as never,
    targetUid: 'user-1',
    sourceId: 'delivery-1',
    sourceType: 'delivery',
  });

  assert.equal(sends.length, 1);
  assert.equal(db.logs[0].kind, 'new_worry');
  assert.equal(db.logs[0].status, 'sent');
});

test('new_reply sends and writes common schema', async () => {
  const db = createDb();
  await sendNewReplyNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    targetUid: 'author',
    sourceId: 'reply-1',
  });

  assert.deepEqual(Object.keys(db.logs[0]).sort(), [
    'createdAt',
    'errorCode',
    'errorMessage',
    'kind',
    'sourceId',
    'sourceType',
    'status',
    'targetUid',
    'tokenDocId',
    'tokenSummary',
  ].sort());
  assert.equal(db.logs[0].kind, 'new_reply');
  assert.equal(db.logs[0].sourceType, 'reply');
});

test('reply_liked sends and writes common schema', async () => {
  const db = createDb();
  await sendReplyLikedNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    targetUid: 'replier',
    sourceId: 'feedback-1',
    sourceType: 'feedback',
  });

  assert.equal(db.logs[0].kind, 'reply_liked');
  assert.equal(db.logs[0].sourceType, 'feedback');
  assert.equal(db.logs[0].status, 'sent');
});

test('missing messaging writes failed and does not throw', async () => {
  const db = createDb();
  await sendNewReplyNotificationAfterCommit({
    db: db as never,
    messaging: null,
    targetUid: 'author',
    sourceId: 'reply-1',
  });

  assert.equal(db.logs[0].status, 'failed');
  assert.equal(db.logs[0].errorCode, 'messaging_unavailable');
});

test('no token docs writes skipped_no_token', async () => {
  const db = createDb({ tokens: [] });
  await sendNewWorryNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    targetUid: 'user-1',
    sourceId: 'delivery-1',
    sourceType: 'delivery',
  });

  assert.equal(db.logs[0].status, 'skipped_no_token');
});

test('deleted target user writes skipped_deleted_user', async () => {
  const db = createDb({ user: { deleted: true } });
  await sendNewWorryNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    targetUid: 'user-1',
    sourceId: 'delivery-1',
    sourceType: 'delivery',
  });

  assert.equal(db.logs[0].status, 'skipped_deleted_user');
});

test('invalid-token error deletes token doc and writes invalid_token_deleted', async () => {
  const token: TokenDoc = { id: 'bad-token', token: 'bad-token' };
  const db = createDb({ tokens: [token] });
  const error = new Error('not registered') as Error & { code: string };
  error.code = 'messaging/registration-token-not-registered';

  await sendNewReplyNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => { throw error; } } as never,
    targetUid: 'author',
    sourceId: 'reply-1',
  });

  assert.equal(token.deleted, true);
  assert.equal(db.logs[0].status, 'invalid_token_deleted');
  assert.equal(db.logs[0].errorCode, 'messaging/registration-token-not-registered');
});

test('generic failure writes failed, preserves token doc, and does not throw', async () => {
  const token: TokenDoc = { id: 'token-1', token: 'token-1' };
  const db = createDb({ tokens: [token] });
  await sendNewReplyNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => { throw new Error('provider down'); } } as never,
    targetUid: 'author',
    sourceId: 'reply-1',
  });

  assert.equal(token.deleted, undefined);
  assert.equal(db.logs[0].status, 'failed');
  assert.equal(db.logs[0].errorMessage, 'provider down');
});

test('multiple token docs write one log per token attempt', async () => {
  const db = createDb({
    tokens: [
      { id: 'token-1', token: 'token-1' },
      { id: 'token-2', token: 'token-2' },
    ],
  });

  await sendNewWorryNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    targetUid: 'user-1',
    sourceId: 'delivery-1',
    sourceType: 'delivery',
  });

  assert.deepEqual(db.logs.map(log => log.status), ['sent', 'sent']);
});

test('pass replacement writes new_worry with sourceReason pass_replacement', async () => {
  const db = createDb();
  await sendNewWorryNotificationAfterCommit({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    targetUid: 'replacement',
    sourceId: 'replacement-delivery',
    sourceType: 'delivery',
    sourceReason: 'pass_replacement',
  });

  assert.equal(db.logs[0].kind, 'new_worry');
  assert.equal(db.logs[0].sourceReason, 'pass_replacement');
});

test('non-PRD notification kinds are impossible through public exports', async () => {
  const exported = await import('./index');
  assert.equal('sendCommentNotificationAfterCommit' in exported, false);
  assert.equal('sendDislikeNotificationAfterCommit' in exported, false);
  assert.equal('sendPublisherCommentNotificationAfterCommit' in exported, false);
});

test('deleteAllPushTokensForUser deletes every token doc for a user', async () => {
  const tokens: TokenDoc[] = [
    { id: 'token-1', token: 'token-1' },
    { id: 'token-2', token: 'token-2' },
  ];
  const db = createDb({ tokens });

  const result = await deleteAllPushTokensForUser({ db: db as never, uid: 'user-1' });

  assert.deepEqual(result, { deletedCount: 2 });
  assert.equal(tokens.every(token => token.deleted), true);
});
