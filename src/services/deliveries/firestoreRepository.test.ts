import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryPassRepository } from './firestoreRepository';

type Store = Map<string, Record<string, unknown>>;

function clone(value: Record<string, unknown>) {
  return { ...value };
}

function createFakeFirestore(initial: Record<string, Record<string, unknown>>) {
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, clone(value)]));

  function ref(path: string) {
    const id = path.split('/').at(-1) ?? '';
    return { id, path };
  }

  function snapshot(path: string, state: Store) {
    return {
      id: path.split('/').at(-1) ?? '',
      exists: state.has(path),
      data: () => {
        const data = state.get(path);
        return data ? clone(data) : undefined;
      },
    };
  }

  return {
    store,
    collection(name: string) {
      return {
        doc(id = `${name}-generated`) {
          return {
            ...ref(`${name}/${id}`),
            collection(subName: string) {
              return {
                async get() {
                  const prefix = `${name}/${id}/${subName}/`;
                  const docs = [...store.entries()]
                    .filter(([path]) => path.startsWith(prefix))
                    .map(([path]) => snapshot(path, store));
                  return { empty: docs.length === 0, docs };
                },
              };
            },
            async get() {
              return snapshot(`${name}/${id}`, store);
            },
          };
        },
        where(field: string, op: string, expected: unknown) {
          assert.equal(op, '==');
          return {
            async get() {
              const prefix = `${name}/`;
              const docs = [...store.entries()]
                .filter(([path, data]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/') && data[field] === expected)
                .map(([path]) => snapshot(path, store));
              return { empty: docs.length === 0, docs };
            },
          };
        },
        async get() {
          const prefix = `${name}/`;
          const docs = [...store.entries()]
            .filter(([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
            .map(([path]) => snapshot(path, store));
          return { empty: docs.length === 0, docs };
        },
        async add(data: Record<string, unknown>) {
          const id = `${name}-add-${store.size}`;
          store.set(`${name}/${id}`, clone(data));
          return { id };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      const staged = new Map<string, Record<string, unknown> | null>();
      let hasWritten = false;
      const stateWithStaged = () => {
        const next = new Map(store);
        for (const [path, data] of staged) {
          if (data === null) next.delete(path);
          else next.set(path, data);
        }
        return next;
      };
      const result = await callback({
        get: async (docRef: { path: string }) => {
          if (hasWritten) {
            throw new Error(`read_after_write:${docRef.path}`);
          }
          return snapshot(docRef.path, stateWithStaged());
        },
        set: (docRef: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          hasWritten = true;
          const current = stateWithStaged().get(docRef.path) ?? {};
          staged.set(docRef.path, options?.merge ? { ...current, ...data } : clone(data));
        },
        update: (docRef: { path: string }, data: Record<string, unknown>) => {
          hasWritten = true;
          const current = stateWithStaged().get(docRef.path) ?? {};
          staged.set(docRef.path, { ...current, ...data });
        },
      });
      for (const [path, data] of staged) {
        if (data === null) store.delete(path);
        else store.set(path, data);
      }
      return result;
    },
  };
}

function baseState(overrides: Record<string, Record<string, unknown>> = {}) {
  return {
    'users/author': { gender: 'female', interests: ['career'] },
    'users/passer': { gender: 'male', interests: ['career'], activeDeliveryCount: 2 },
    'users/replacement': { gender: 'female', interests: ['career'], helpedCount: 3, activeDeliveryCount: 0 },
    'worries/worry1': {
      authorUid: 'author',
      status: 'active',
      matchingCategories: ['career'],
      humanDeliveryCount: 1,
      humanDeliveryLimit: 15,
    },
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'passer',
      status: 'active',
      answeredAt: null,
      passedAt: null,
      hiddenAt: null,
      isAiRecipient: false,
    },
    ...overrides,
  };
}

test('active own delivery pass sets passed, decrements passer, creates attempt and replacement', async () => {
  const db = createFakeFirestore(baseState());
  const repo = createDeliveryPassRepository({ db: db as never });
  const scan = await repo.fetchReplacementScan({ deliveryId: 'delivery1' });

  const result = await repo.commitPassDelivery({
    uid: 'passer',
    deliveryId: 'delivery1',
    selectedRecipient: {
      uid: 'replacement',
      gender: 'female',
      interests: ['career'],
      helpedCount: 3,
      activeDeliveryCount: 0,
      matchOverlapCount: 1,
      randomTieBreaker: 0,
    },
    existingHumanDeliveryCount: scan.existingHumanDeliveryCount,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.replacementStatus, 'created');
  assert.equal(result.replacementDeliveryId, 'worry1_replacement');
  assert.equal(db.store.get('deliveries/delivery1')?.status, 'passed');
  assert.ok(db.store.get('deliveries/delivery1')?.passedAt);
  assert.equal(db.store.get('users/passer')?.activeDeliveryCount, 1);
  assert.equal(db.store.get('passReplacementAttempts/delivery1')?.status, 'created');
  assert.equal(db.store.get('passReplacementAttempts/delivery1')?.createdDeliveryId, 'worry1_replacement');
  assert.equal(db.store.get('deliveries/worry1_replacement')?.status, 'active');
  assert.equal(db.store.get('deliveries/worry1_replacement')?.batchId, null);
  assert.equal(db.store.get('deliveries/worry1_replacement')?.batchRound, null);
  assert.equal(db.store.get('deliveries/worry1_replacement')?.replacementForDeliveryId, 'delivery1');
  assert.equal(db.store.get('worries/worry1')?.humanDeliveryCount, 2);
  assert.equal(db.store.get('worries/worry1')?.passedAt, undefined);
  assert.equal(db.store.get('worries/worry1')?.passerUid, undefined);
});

test('missing passer user doc still passes and retry after user creation does not decrement', async () => {
  const initial = baseState();
  delete initial['users/passer'];
  const db = createFakeFirestore(initial);
  const repo = createDeliveryPassRepository({ db: db as never });

  const result = await repo.commitPassDelivery({
    uid: 'passer',
    deliveryId: 'delivery1',
    selectedRecipient: {
      uid: 'replacement',
      gender: 'female',
      interests: ['career'],
      helpedCount: 3,
      activeDeliveryCount: 0,
      matchOverlapCount: 1,
      randomTieBreaker: 0,
    },
    existingHumanDeliveryCount: 1,
  });

  assert.equal(result.status, 'passed');
  assert.deepEqual(result.warnings, ['missing_passer_user_doc_counter_decrement_skipped']);
  assert.equal(db.store.has('users/passer'), false);

  db.store.set('users/passer', { activeDeliveryCount: 5 });
  const retry = await repo.commitPassDelivery({
    uid: 'passer',
    deliveryId: 'delivery1',
    selectedRecipient: null,
    existingHumanDeliveryCount: 2,
  });

  assert.equal(retry.status, 'passed');
  assert.equal(retry.replacementStatus, 'created');
  assert.equal(db.store.get('users/passer')?.activeDeliveryCount, 5);
});

test('already passed without attempt is not_applicable and performs no writes', async () => {
  const db = createFakeFirestore(baseState({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'passer',
      status: 'passed',
      passedAt: 'old-passed-at',
    },
  }));
  const repo = createDeliveryPassRepository({ db: db as never });

  const result = await repo.commitPassDelivery({
    uid: 'passer',
    deliveryId: 'delivery1',
    selectedRecipient: null,
    existingHumanDeliveryCount: 1,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.replacementStatus, 'not_applicable');
  assert.equal(db.store.has('passReplacementAttempts/delivery1'), false);
  assert.equal(db.store.get('deliveries/delivery1')?.passedAt, 'old-passed-at');
  assert.equal(db.store.get('users/passer')?.activeDeliveryCount, 2);
});

test('shortfall passes delivery and creates no replacement', async () => {
  const db = createFakeFirestore(baseState());
  const repo = createDeliveryPassRepository({ db: db as never });

  const result = await repo.commitPassDelivery({
    uid: 'passer',
    deliveryId: 'delivery1',
    selectedRecipient: null,
    existingHumanDeliveryCount: 1,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.replacementStatus, 'shortfall');
  assert.equal(db.store.get('deliveries/delivery1')?.status, 'passed');
  assert.equal(db.store.get('passReplacementAttempts/delivery1')?.status, 'shortfall');
  assert.equal(db.store.has('deliveries/worry1_replacement'), false);
});

test('other user and terminal delivery are rejected with no state changes', async () => {
  const otherDb = createFakeFirestore(baseState());
  const otherRepo = createDeliveryPassRepository({ db: otherDb as never });
  await assert.rejects(() => otherRepo.commitPassDelivery({
    uid: 'other',
    deliveryId: 'delivery1',
    selectedRecipient: null,
    existingHumanDeliveryCount: 1,
  }), /not_delivery_recipient/);
  assert.equal(otherDb.store.get('deliveries/delivery1')?.status, 'active');

  const terminalDb = createFakeFirestore(baseState({
    'deliveries/delivery1': {
      worryId: 'worry1',
      authorUid: 'author',
      recipientUid: 'passer',
      status: 'active',
      answeredAt: {},
    },
  }));
  const terminalRepo = createDeliveryPassRepository({ db: terminalDb as never });
  await assert.rejects(() => terminalRepo.commitPassDelivery({
    uid: 'passer',
    deliveryId: 'delivery1',
    selectedRecipient: null,
    existingHumanDeliveryCount: 1,
  }), /delivery_terminal_timestamp/);
  assert.equal(terminalDb.store.has('passReplacementAttempts/delivery1'), false);
});

test('repository reads before transaction writes', async () => {
  const db = createFakeFirestore(baseState());
  const repo = createDeliveryPassRepository({ db: db as never });

  await assert.doesNotReject(() => repo.commitPassDelivery({
    uid: 'passer',
    deliveryId: 'delivery1',
    selectedRecipient: {
      uid: 'replacement',
      gender: 'female',
      interests: ['career'],
      helpedCount: 3,
      activeDeliveryCount: 0,
      matchOverlapCount: 1,
      randomTieBreaker: 0,
    },
    existingHumanDeliveryCount: 1,
  }));
});
