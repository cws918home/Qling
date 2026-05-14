import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialWorryPublicationRepository } from './firestoreRepository';
import type {
  DeliveryBatchWriteModel,
  DeliveryWriteModel,
  ModerationLogWriteModel,
  WorryWriteModel,
} from './types';

type CollectionName = 'users' | 'deliveries' | 'worries' | 'deliveryBatches' | 'moderationLogs';

interface FakeRef {
  collectionName: CollectionName;
  id: string;
  path: string;
}

interface FakeDoc {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

function fakeDoc(data: Record<string, unknown> | undefined): FakeDoc {
  return {
    exists: data !== undefined,
    data: () => data,
  };
}

function createFakeFirestore(initial?: {
  users?: Record<string, Record<string, unknown>>;
  deliveries?: Record<string, Record<string, unknown>>;
}) {
  const state: Record<CollectionName, Record<string, Record<string, unknown>>> = {
    users: { ...(initial?.users ?? {}) },
    deliveries: { ...(initial?.deliveries ?? {}) },
    worries: {},
    deliveryBatches: {},
    moderationLogs: {},
  };
  const transactionReads: string[] = [];

  const makeRef = (collectionName: CollectionName, id: string): FakeRef => ({
    collectionName,
    id,
    path: `${collectionName}/${id}`,
  });

  return {
    state,
    transactionReads,
    collection(collectionName: CollectionName) {
      return {
        doc(id = `${collectionName}_generated`) {
          return makeRef(collectionName, id);
        },
      };
    },
    async runTransaction<T>(callback: (transaction: {
      get(ref: FakeRef): Promise<FakeDoc>;
      set(ref: FakeRef, data: Record<string, unknown>): void;
      update(ref: FakeRef, data: Record<string, unknown>): void;
    }) => Promise<T>): Promise<T> {
      const writes: Array<() => void> = [];
      const transaction = {
        get: async (ref: FakeRef) => {
          transactionReads.push(ref.path);
          return fakeDoc(state[ref.collectionName][ref.id]);
        },
        set: (ref: FakeRef, data: Record<string, unknown>) => {
          writes.push(() => {
            state[ref.collectionName][ref.id] = { ...data };
          });
        },
        update: (ref: FakeRef, data: Record<string, unknown>) => {
          writes.push(() => {
            const existing = state[ref.collectionName][ref.id];
            if (!existing) throw new Error('update_missing');
            state[ref.collectionName][ref.id] = {
              ...existing,
              activeDeliveryCount: Number(existing.activeDeliveryCount ?? 0) + Number(data.activeDeliveryCount ? 1 : 0),
            };
          });
        },
      };

      const result = await callback(transaction);
      writes.forEach(write => write());
      return result;
    },
  };
}

function user(overrides: Record<string, unknown> = {}) {
  return {
    gender: 'female',
    interests: ['취업'],
    helpedCount: 0,
    activeDeliveryCount: 0,
    ...overrides,
  };
}

function buildCommitModels(recipientUids = ['a', 'b', 'c', 'd', 'e']) {
  const worry: WorryWriteModel = {
    id: 'worry1',
    authorUid: 'author',
    content: 'content',
    status: 'active',
    rawCategories: ['취업'],
    validCategories: ['취업'],
    invalidCategories: [],
    matchingCategories: ['취업'],
    moderationLogId: 'mod1',
    initialDeliveryBatchId: 'batch1',
    initialDeliveryTargetCount: 5,
    humanDeliveryLimit: 15,
    humanDeliveryCount: 5,
    humanReplyCount: 0,
    hasHumanReply: false,
    createdAt: 'ts',
    updatedAt: 'ts',
    lastDeliveryCreatedAt: 'ts',
  };
  const moderationLog: ModerationLogWriteModel = {
    id: 'mod1',
    targetType: 'worry',
    targetId: 'worry1',
    uid: 'author',
    originalContent: 'content',
    status: 'approved',
    reasonCode: 'approved',
    userMessage: '',
    helpMessage: null,
    rawProviderResponse: { status: 'approved' },
    rawCategories: ['취업'],
    validCategories: ['취업'],
    invalidCategories: [],
    matchingCategories: ['취업'],
    provider: 'openai',
    model: 'gpt-5.4-mini',
    createdAt: 'ts',
    updatedAt: 'ts',
  };
  const batch: DeliveryBatchWriteModel = {
    id: 'batch1',
    worryId: 'worry1',
    batchRound: 0,
    createdAt: 'ts',
    targetCount: 5,
    createdCount: 5,
    matchedCount: 4,
    randomCount: 1,
    reason: 'initial',
  };
  const deliveries: DeliveryWriteModel[] = recipientUids.map((recipientUid, slotIndex) => ({
    id: `worry1_${recipientUid}`,
    worryId: 'worry1',
    recipientUid,
    authorUid: 'author',
    status: 'active',
    answeredAt: null,
    batchId: 'batch1',
    batchRound: 0,
    slotIndex,
    selectionType: slotIndex === 4 ? 'random' : 'matched',
    matchOverlapCount: 1,
    matchCategoriesSnapshot: ['취업'],
    recipientInterestsSnapshot: ['취업'],
    recipientGenderSnapshot: 'female',
    recipientHelpedCountSnapshot: 0,
    authorGenderSnapshot: 'female',
    isAiRecipient: false,
    createdAt: 'ts',
    updatedAt: 'ts',
    answerableUntil: null,
  }));

  return {
    worry,
    moderationLog,
    batch,
    deliveries,
    selectedRecipientUids: recipientUids,
    eligibilitySnapshot: recipientUids.map(uid => ({ uid, activeDeliveryCount: 0 })),
  };
}

test('successful commit re-reads selected recipients and increments each exactly once', async () => {
  const db = createFakeFirestore({
    users: Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map(uid => [uid, user()])),
  });
  const repository = createInitialWorryPublicationRepository({ db: db as never });

  const result = await repository.commitInitialWorryPublication(buildCommitModels());

  assert.deepEqual(result.deliveryIds, ['worry1_a', 'worry1_b', 'worry1_c', 'worry1_d', 'worry1_e']);
  assert.deepEqual(
    ['a', 'b', 'c', 'd', 'e'].map(uid => db.state.users[uid].activeDeliveryCount),
    [1, 1, 1, 1, 1]
  );
  assert.deepEqual(
    ['a', 'b', 'c', 'd', 'e'].map(uid => db.transactionReads.includes(`users/${uid}`)),
    [true, true, true, true, true]
  );
  assert.equal(Object.keys(db.state.worries).length, 1);
  assert.equal(Object.keys(db.state.deliveryBatches).length, 1);
  assert.equal(Object.keys(db.state.deliveries).length, 5);
  assert.equal(Object.keys(db.state.moderationLogs).length, 1);
});

test('empty commit writes moderation log worry and batch without recipient reads updates or deliveries', async () => {
  const db = createFakeFirestore();
  const repository = createInitialWorryPublicationRepository({ db: db as never });
  const models = buildCommitModels([]);
  models.worry.humanDeliveryCount = 0;
  models.batch.createdCount = 0;
  models.batch.matchedCount = 0;
  models.batch.randomCount = 0;

  const result = await repository.commitInitialWorryPublication(models);

  assert.deepEqual(result.deliveryIds, []);
  assert.deepEqual(db.transactionReads, []);
  assert.equal(Object.keys(db.state.worries).length, 1);
  assert.equal(Object.keys(db.state.deliveryBatches).length, 1);
  assert.equal(Object.keys(db.state.deliveries).length, 0);
  assert.equal(Object.keys(db.state.moderationLogs).length, 1);
  assert.equal(db.state.worries.worry1.humanDeliveryCount, 0);
  assert.equal(db.state.deliveryBatches.batch1.createdCount, 0);
});

test('recipient becoming over activeDeliveryCount limit inside transaction aborts with no partial state', async () => {
  const db = createFakeFirestore({
    users: {
      a: user(),
      b: user(),
      c: user({ activeDeliveryCount: 10 }),
      d: user(),
      e: user(),
    },
  });
  const repository = createInitialWorryPublicationRepository({ db: db as never });

  await assert.rejects(
    repository.commitInitialWorryPublication(buildCommitModels()),
    /recipient_ineligible/
  );
  assert.equal(Object.keys(db.state.worries).length, 0);
  assert.equal(Object.keys(db.state.deliveryBatches).length, 0);
  assert.equal(Object.keys(db.state.deliveries).length, 0);
  assert.equal(Object.keys(db.state.moderationLogs).length, 0);
  assert.equal(db.state.users.a.activeDeliveryCount, 0);
});

test('missing recipient aborts with no partial state', async () => {
  const db = createFakeFirestore({
    users: {
      a: user(),
      b: user(),
      d: user(),
      e: user(),
    },
  });
  const repository = createInitialWorryPublicationRepository({ db: db as never });

  await assert.rejects(
    repository.commitInitialWorryPublication(buildCommitModels()),
    /recipient_missing/
  );
  assert.equal(Object.keys(db.state.worries).length, 0);
  assert.equal(Object.keys(db.state.deliveries).length, 0);
  assert.equal(db.state.users.a.activeDeliveryCount, 0);
});

test('duplicate selected recipient ids abort before transaction writes', async () => {
  const db = createFakeFirestore({
    users: Object.fromEntries(['a', 'b', 'c', 'd'].map(uid => [uid, user()])),
  });
  const repository = createInitialWorryPublicationRepository({ db: db as never });

  await assert.rejects(
    repository.commitInitialWorryPublication(buildCommitModels(['a', 'b', 'c', 'd', 'd'])),
    /duplicate_recipient/
  );
  assert.equal(Object.keys(db.state.worries).length, 0);
  assert.equal(Object.keys(db.state.deliveries).length, 0);
});

test('existing deterministic delivery aborts with no partial state', async () => {
  const db = createFakeFirestore({
    users: Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map(uid => [uid, user()])),
    deliveries: {
      worry1_c: { worryId: 'worry1', recipientUid: 'c' },
    },
  });
  const repository = createInitialWorryPublicationRepository({ db: db as never });

  await assert.rejects(
    repository.commitInitialWorryPublication(buildCommitModels()),
    /duplicate_delivery/
  );
  assert.equal(Object.keys(db.state.worries).length, 0);
  assert.equal(Object.keys(db.state.deliveryBatches).length, 0);
  assert.equal(Object.keys(db.state.moderationLogs).length, 0);
  assert.equal(Object.keys(db.state.deliveries).length, 1);
  assert.equal(db.state.users.a.activeDeliveryCount, 0);
});
