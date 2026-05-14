import test from 'node:test';
import assert from 'node:assert/strict';
import { publishReplyForDelivery } from './publishReplyForDelivery';
import type {
  ReplyModerationLogWriteModel,
  ReplyPublicationRepository,
  ReplyWriteModel,
} from './types';

function createFakeDb(options: {
  tokenDocsByUid?: Record<string, Array<{ id: string; token: string }>>;
  onPushLog?: (data: unknown) => void;
} = {}) {
  const pushLogs: unknown[] = [];
  return {
    pushLogs,
    collection(name: string) {
      if (name === 'pushLogs') {
        return { add: async (data: unknown) => {
          options.onPushLog?.(data);
          pushLogs.push(data);
        } };
      }
      return {
        doc(uid?: string) {
          return {
            get: async () => ({ exists: true, data: () => ({}) }),
            collection(collectionName: string) {
              assert.equal(collectionName, 'fcmTokens');
              const tokenDocs = uid ? (options.tokenDocsByUid?.[uid] ?? []) : [];
              return {
                get: async () => ({
                  empty: tokenDocs.length === 0,
                  docs: tokenDocs.map(tokenDoc => ({
                    id: tokenDoc.id,
                    data: () => ({ token: tokenDoc.token }),
                    ref: { delete: async () => undefined },
                  })),
                }),
              };
            },
          };
        },
      };
    },
  };
}

function reply(content = 'reply'): ReplyWriteModel {
  return {
    id: 'delivery1',
    deliveryId: 'delivery1',
    worryId: 'worry1',
    authorUid: 'author',
    replierUid: 'recipient',
    content,
    status: 'active',
    publisherVisible: true,
    moderationLogId: 'mod1',
    createdAt: {},
    updatedAt: {},
    isAiGenerated: false,
    isExampleReply: false,
  };
}

function createFakeRepository(
  commitApproved: ReplyPublicationRepository['commitApprovedReplyPublication'] = async params => ({
    status: 'created',
    replyId: params.deliveryId,
    reply: reply(params.content),
  })
): ReplyPublicationRepository & {
  rejectedLogs: ReplyModerationLogWriteModel[];
  approvedLogs: ReplyModerationLogWriteModel[];
  approvedCommits: number;
} {
  const repo = {
    rejectedLogs: [] as ReplyModerationLogWriteModel[],
    approvedLogs: [] as ReplyModerationLogWriteModel[],
    approvedCommits: 0,
    createIds: () => ({ moderationLogId: 'mod1' }),
    commitRejectedReplyModeration: async ({ moderationLog }) => {
      repo.rejectedLogs.push(moderationLog);
      return { moderationLogId: moderationLog.id };
    },
    commitApprovedReplyPublication: async params => {
      repo.approvedCommits += 1;
      repo.approvedLogs.push(params.moderationLog);
      return commitApproved(params);
    },
  };
  return repo;
}

test('validates empty and too-long reply content before moderation', async () => {
  const repo = createFakeRepository();
  const empty = await publishReplyForDelivery({
    db: createFakeDb() as never,
    messaging: null,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: '   ',
    moderationProvider: async () => ({ status: 'approved' }),
    repository: repo,
  });
  const tooLong = await publishReplyForDelivery({
    db: createFakeDb() as never,
    messaging: null,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: 'a'.repeat(1001),
    moderationProvider: async () => ({ status: 'approved' }),
    repository: repo,
  });

  assert.equal(empty.status, 'validation_error');
  assert.equal(tooLong.status, 'validation_error');
  assert.equal(repo.approvedCommits, 0);
});

test('rejected moderation writes reply moderation log only', async () => {
  const repo = createFakeRepository();
  const result = await publishReplyForDelivery({
    db: createFakeDb() as never,
    messaging: null,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: 'bad',
    moderationProvider: async () => ({ status: 'rejected', reason: 'spam' }),
    repository: repo,
  });

  assert.equal(result.status, 'rejected');
  assert.equal(repo.rejectedLogs.length, 1);
  assert.equal(repo.rejectedLogs[0].targetType, 'reply');
  assert.equal(repo.rejectedLogs[0].targetId, 'delivery1');
  assert.equal(repo.approvedCommits, 0);
});

test('provider failure and invalid provider output create no reply state', async () => {
  const failureRepo = createFakeRepository();
  const failure = await publishReplyForDelivery({
    db: createFakeDb() as never,
    messaging: null,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: 'reply',
    moderationProvider: async () => { throw new Error('down'); },
    repository: failureRepo,
  });
  const invalidRepo = createFakeRepository();
  const invalid = await publishReplyForDelivery({
    db: createFakeDb() as never,
    messaging: null,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: 'reply',
    moderationProvider: async () => ({ nope: true }),
    repository: invalidRepo,
  });

  assert.equal(failure.status, 'provider_error');
  assert.equal(invalid.status, 'provider_error');
  assert.equal(failureRepo.approvedCommits, 0);
  assert.equal(invalidRepo.approvedCommits, 0);
});

test('approved reply creates deterministic reply and notifies after commit', async () => {
  const repo = createFakeRepository();
  const db = createFakeDb({
    tokenDocsByUid: { author: [{ id: 'token1', token: 'token1' }] },
    onPushLog: () => assert.equal(repo.approvedCommits, 1),
  });

  const result = await publishReplyForDelivery({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: '  reply  ',
    moderationProvider: async () => ({ status: 'approved' }),
    repository: repo,
  });

  assert.equal(result.status, 'published');
  assert.equal(result.status === 'published' ? result.replyId : '', 'delivery1');
  assert.equal(repo.approvedLogs[0].status, 'approved');
  assert.equal(db.pushLogs.length, 1);
  assert.equal((db.pushLogs[0] as { kind: string; sourceType: string; sourceId: string }).kind, 'new_reply');
  assert.equal((db.pushLogs[0] as { kind: string; sourceType: string; sourceId: string }).sourceType, 'reply');
  assert.equal((db.pushLogs[0] as { kind: string; sourceType: string; sourceId: string }).sourceId, 'delivery1');
});

test('same-content idempotent repeat does not re-notify or re-decrement', async () => {
  const repo = createFakeRepository(async params => ({
    status: 'idempotent',
    replyId: params.deliveryId,
    reply: reply(params.content),
  }));
  const db = createFakeDb({ tokenDocsByUid: { author: [{ id: 'token1', token: 'token1' }] } });

  const result = await publishReplyForDelivery({
    db: db as never,
    messaging: { send: async () => 'message-id' } as never,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: 'reply',
    moderationProvider: async () => ({ status: 'approved' }),
    repository: repo,
  });

  assert.equal(result.status, 'published');
  assert.equal(result.status === 'published' ? result.idempotent : false, true);
  assert.equal(db.pushLogs.length, 0);
});

test('repository precondition errors map to ownership not found and conflict results', async () => {
  const cases = [
    ['not_delivery_recipient', 'forbidden'],
    ['delivery_missing', 'not_found'],
    ['worry_missing', 'not_found'],
    ['delivery_hidden', 'conflict'],
    ['delivery_not_active', 'conflict'],
    ['duplicate_reply', 'conflict'],
  ] as const;

  for (const [code, status] of cases) {
    const repo = createFakeRepository(async () => { throw new Error(code); });
    const result = await publishReplyForDelivery({
      db: createFakeDb() as never,
      messaging: null,
      replierUid: 'recipient',
      deliveryId: 'delivery1',
      content: 'reply',
      moderationProvider: async () => ({ status: 'approved' }),
      repository: repo,
    });
    assert.equal(result.status, status);
  }
});

test('push failure writes failed push log and does not roll back publication', async () => {
  const repo = createFakeRepository();
  const db = createFakeDb({
    tokenDocsByUid: { author: [{ id: 'token1', token: 'token1' }] },
  });

  const result = await publishReplyForDelivery({
    db: db as never,
    messaging: { send: async () => { throw new Error('push down'); } } as never,
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: 'reply',
    moderationProvider: async () => ({ status: 'approved' }),
    repository: repo,
  });

  assert.equal(result.status, 'published');
  assert.equal((db.pushLogs[0] as { status: string }).status, 'failed');
});
