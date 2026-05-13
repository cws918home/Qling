import test from 'node:test';
import assert from 'node:assert/strict';
import { createReplyPublicationRepository } from './firestoreRepository';
import type { ReplyModerationLogWriteModel } from './types';

type Store = Map<string, Record<string, unknown>>;

function createFakeFirestore(initial: Record<string, Record<string, unknown>>) {
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, { ...value }]));

  function ref(path: string) {
    const id = path.split('/').at(-1) ?? '';
    return { id, path };
  }

  return {
    store,
    collection(name: string) {
      return {
        doc(id = `${name}-generated`) {
          return ref(`${name}/${id}`);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      return callback({
        get: async (docRef: { path: string }) => ({
          exists: store.has(docRef.path),
          data: () => {
            const data = store.get(docRef.path);
            return data ? { ...data } : undefined;
          },
        }),
        set: (docRef: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          store.set(docRef.path, options?.merge ? { ...(store.get(docRef.path) ?? {}), ...data } : { ...data });
        },
        update: (docRef: { path: string }, data: Record<string, unknown>) => {
          store.set(docRef.path, { ...(store.get(docRef.path) ?? {}), ...data });
        },
      });
    },
  };
}

const moderationLog: ReplyModerationLogWriteModel = {
  id: 'mod1',
  targetType: 'reply',
  targetId: 'delivery1',
  uid: 'recipient',
  originalContent: 'reply',
  status: 'approved',
  reasonCode: 'approved',
  userMessage: '',
  helpMessage: null,
  rawProviderResponse: { status: 'approved' },
  provider: 'openai',
  model: 'gpt-5.4-mini',
  createdAt: {},
  updatedAt: {},
};

test('repository creates replies by deterministic delivery id and answers delivery transactionally', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
      answeredAt: null,
    },
    'worries/worry1': {
      authorUid: 'author',
      humanReplyCount: 0,
      hasHumanReply: false,
    },
    'users/recipient': {
      activeDeliveryCount: 2,
    },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  const result = await repo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });

  assert.equal(result.status, 'created');
  assert.equal(result.replyId, 'delivery1');
  assert.equal(db.store.get('replies/delivery1')?.deliveryId, 'delivery1');
  assert.equal(db.store.get('replies/delivery1')?.worryId, 'worry1');
  assert.equal(db.store.get('replies/delivery1')?.replierUid, 'recipient');
  assert.equal(db.store.get('replies/delivery1')?.authorUid, 'author');
  assert.equal(db.store.get('replies/delivery1')?.isAiGenerated, false);
  assert.equal(db.store.get('replies/delivery1')?.isExampleReply, false);
  assert.equal(db.store.get('deliveries/delivery1')?.status, 'answered');
  assert.equal(db.store.get('worries/worry1')?.hasHumanReply, true);
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 1);
});

test('repository idempotent same-content retry does not decrement counter again', async () => {
  const db = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'answered',
      answeredAt: {},
    },
    'worries/worry1': { authorUid: 'author' },
    'users/recipient': { activeDeliveryCount: 1 },
    'replies/delivery1': {
      deliveryId: 'delivery1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient',
      content: 'reply',
      status: 'active',
      moderationLogId: 'mod1',
      createdAt: {},
      updatedAt: {},
      isAiGenerated: false,
      isExampleReply: false,
    },
  });
  const repo = createReplyPublicationRepository({ db: db as never });

  const result = await repo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });

  assert.equal(result.status, 'idempotent');
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 1);
});

test('repository rejects different-content duplicate and never decrements below zero', async () => {
  const duplicateDb = createFakeFirestore({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'answered',
      answeredAt: {},
    },
    'worries/worry1': { authorUid: 'author' },
    'users/recipient': { activeDeliveryCount: 1 },
    'replies/delivery1': {
      deliveryId: 'delivery1',
      worryId: 'worry1',
      authorUid: 'author',
      replierUid: 'recipient',
      content: 'old reply',
      status: 'active',
      moderationLogId: 'mod1',
    },
  });
  const duplicateRepo = createReplyPublicationRepository({ db: duplicateDb as never });
  await assert.rejects(() => duplicateRepo.commitApprovedReplyPublication({
    deliveryId: 'delivery1',
    replierUid: 'recipient',
    content: 'new reply',
    moderationLog,
  }), /duplicate_reply/);

  const zeroDb = createFakeFirestore({
    'deliveries/delivery2': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'recipient',
      status: 'active',
      answeredAt: null,
    },
    'worries/worry1': { authorUid: 'author' },
    'users/recipient': { activeDeliveryCount: 0 },
  });
  const zeroRepo = createReplyPublicationRepository({ db: zeroDb as never });
  await zeroRepo.commitApprovedReplyPublication({
    deliveryId: 'delivery2',
    replierUid: 'recipient',
    content: 'reply',
    moderationLog,
  });
  assert.equal(zeroDb.store.get('users/recipient')?.activeDeliveryCount, 0);
});
