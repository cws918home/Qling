import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminHidingRepository, hideContent } from '.';

type Store = Map<string, Record<string, unknown>>;

function clone(value: Record<string, unknown>) {
  return { ...value };
}

function createFakeFirestore(initial: Record<string, Record<string, unknown>>) {
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, clone(value)]));

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
        doc(id: string) {
          return {
            id,
            path: `${name}/${id}`,
          };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      const staged = new Map<string, Record<string, unknown>>();
      let hasWritten = false;
      const stateWithStaged = () => new Map([...store, ...staged]);
      const result = await callback({
        get: async (docRef: { path: string }) => {
          if (hasWritten) throw new Error(`read_after_write:${docRef.path}`);
          return snapshot(docRef.path, stateWithStaged());
        },
        update: (docRef: { path: string }, data: Record<string, unknown>) => {
          hasWritten = true;
          staged.set(docRef.path, { ...(stateWithStaged().get(docRef.path) ?? {}), ...data });
        },
      });
      for (const [path, data] of staged) store.set(path, data);
      return result;
    },
  };
}

test('active delivery hide decrements recipient counter exactly once and writes hidden metadata', async () => {
  const db = createFakeFirestore({
    'deliveries/d1': { status: 'active', recipientUid: 'recipient' },
    'users/recipient': { activeDeliveryCount: 2 },
  });

  const first = await hideContent({
    db: db as never,
    targetType: 'delivery',
    targetId: 'd1',
    hiddenReason: 'policy',
    hiddenBy: 'operator',
  });
  const second = await hideContent({
    db: db as never,
    targetType: 'delivery',
    targetId: 'd1',
    hiddenReason: 'policy',
    hiddenBy: 'operator',
  });

  assert.deepEqual(first, {
    status: 'hidden',
    targetType: 'delivery',
    targetId: 'd1',
    alreadyHidden: false,
    counterDecremented: true,
  });
  assert.deepEqual(second, {
    status: 'hidden',
    targetType: 'delivery',
    targetId: 'd1',
    alreadyHidden: true,
    counterDecremented: false,
  });
  assert.equal(db.store.get('deliveries/d1')?.status, 'hidden');
  assert.equal(db.store.get('deliveries/d1')?.hiddenReason, 'policy');
  assert.equal(db.store.get('deliveries/d1')?.hiddenBy, 'operator');
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 1);
});

test('active delivery hide fails without partial writes when recipient is missing or counter is malformed', async () => {
  for (const [name, initial, code] of [
    ['missing user', { 'deliveries/d1': { status: 'active', recipientUid: 'recipient' } }, 'recipient_missing'],
    ['missing counter', { 'deliveries/d1': { status: 'active', recipientUid: 'recipient' }, 'users/recipient': {} }, 'recipient_counter_malformed'],
    ['malformed counter', { 'deliveries/d1': { status: 'active', recipientUid: 'recipient' }, 'users/recipient': { activeDeliveryCount: '2' } }, 'recipient_counter_malformed'],
  ] as const) {
    const db = createFakeFirestore(initial);
    const before = { ...db.store.get('deliveries/d1') };

    const result = await hideContent({
      db: db as never,
      targetType: 'delivery',
      targetId: 'd1',
      hiddenReason: 'policy',
      hiddenBy: 'operator',
    });

    assert.equal(result.status, 'conflict', name);
    assert.equal(result.code, code, name);
    assert.deepEqual(db.store.get('deliveries/d1'), before, name);
  }
});

test('active delivery hide never produces a negative recipient counter', async () => {
  const db = createFakeFirestore({
    'deliveries/d1': { status: 'active', recipientUid: 'recipient' },
    'users/recipient': { activeDeliveryCount: 0 },
  });

  const result = await hideContent({
    db: db as never,
    targetType: 'delivery',
    targetId: 'd1',
    hiddenReason: 'policy',
    hiddenBy: 'operator',
  });

  assert.equal(result.status, 'hidden');
  assert.equal(result.counterDecremented, false);
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 0);
});

test('answered passed and already-hidden delivery hides do not decrement counters', async () => {
  for (const [id, status] of [['answered', 'answered'], ['passed', 'passed'], ['hidden', 'hidden']] as const) {
    const db = createFakeFirestore({
      [`deliveries/${id}`]: { status, recipientUid: 'recipient' },
      'users/recipient': { activeDeliveryCount: 3 },
    });

    const result = await hideContent({
      db: db as never,
      targetType: 'delivery',
      targetId: id,
      hiddenReason: 'policy',
      hiddenBy: 'operator',
    });

    assert.equal(result.status, 'hidden');
    assert.equal(result.counterDecremented, false);
    assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 3);
  }
});

test('reply hide sets hidden fields without changing delivery or user counters', async () => {
  const db = createFakeFirestore({
    'replies/r1': { status: 'active', deliveryId: 'd1' },
    'deliveries/d1': { status: 'answered', recipientUid: 'recipient' },
    'users/recipient': { activeDeliveryCount: 4 },
  });

  const result = await hideContent({
    db: db as never,
    targetType: 'reply',
    targetId: 'r1',
    hiddenReason: 'policy',
    hiddenBy: 'operator',
  });

  assert.equal(result.status, 'hidden');
  assert.equal(db.store.get('replies/r1')?.status, 'hidden');
  assert.equal(db.store.get('replies/r1')?.hiddenBy, 'operator');
  assert.equal(db.store.get('deliveries/d1')?.status, 'answered');
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 4);
});

test('internal worry hide sets hidden fields only and does not cascade child deliveries', async () => {
  const db = createFakeFirestore({
    'worries/w1': { status: 'active', authorUid: 'author' },
    'deliveries/d1': { worryId: 'w1', status: 'active', recipientUid: 'recipient' },
    'users/recipient': { activeDeliveryCount: 1 },
  });
  const repository = createAdminHidingRepository({ db: db as never });

  const result = await repository.hideWorry({
    targetId: 'w1',
    hiddenReason: 'policy',
    hiddenBy: 'operator',
  });

  assert.equal(result.status, 'hidden');
  assert.equal(db.store.get('worries/w1')?.status, 'hidden');
  assert.equal(db.store.get('worries/w1')?.hiddenBy, 'operator');
  assert.equal(db.store.get('deliveries/d1')?.status, 'active');
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 1);
});
