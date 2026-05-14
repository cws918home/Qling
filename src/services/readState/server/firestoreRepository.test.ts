import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadStateRepository } from './firestoreRepository';

type Store = Map<string, Record<string, unknown>>;

function createFakeFirestore(initial: Record<string, Record<string, unknown>>) {
  const store: Store = new Map(Object.entries(initial).map(([path, value]) => [path, { ...value }]));

  function ref(path: string) {
    const id = path.split('/').at(-1) ?? '';
    return { id, path };
  }

  function collection(path: string) {
    return {
      doc(id: string) {
        const docPath = `${path}/${id}`;
        return {
          ...ref(docPath),
          collection(name: string) {
            return collection(`${docPath}/${name}`);
          },
        };
      },
      where(field: string, op: string, value: unknown) {
        const filters = [{ field, op, value }];
        return {
          path,
          filters,
          where(nextField: string, nextOp: string, nextValue: unknown) {
            return { path, filters: [...filters, { field: nextField, op: nextOp, value: nextValue }] };
          },
        };
      },
    };
  }

  return {
    store,
    collection,
    async runTransaction<T>(callback: (transaction: unknown) => Promise<T>) {
      let hasWritten = false;
      return callback({
        get: async (target: { path: string; filters?: Array<{ field: string; value: unknown }> }) => {
          if (hasWritten) throw new Error(`read_after_write:${target.path}`);
          if (target.filters) {
            const docs = [...store.entries()]
              .filter(([path]) => path.startsWith(`${target.path}/`))
              .filter(([, data]) => target.filters?.every(filter => data[filter.field] === filter.value))
              .map(([path, data]) => ({
                id: path.split('/').at(-1) ?? '',
                exists: true,
                data: () => ({ ...data }),
              }));
            return { docs };
          }

          return {
            id: target.path.split('/').at(-1) ?? '',
            exists: store.has(target.path),
            data: () => {
              const data = store.get(target.path);
              return data ? { ...data } : undefined;
            },
          };
        },
        set: (docRef: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
          hasWritten = true;
          store.set(docRef.path, options?.merge ? { ...(store.get(docRef.path) ?? {}), ...data } : { ...data });
        },
        update: (docRef: { path: string }, data: Record<string, unknown>) => {
          hasWritten = true;
          store.set(docRef.path, { ...(store.get(docRef.path) ?? {}), ...data });
        },
      });
    },
  };
}

test('delivery read writes private read-state doc without mutating delivery or counters', async () => {
  const db = createFakeFirestore({
    'deliveries/d1': {
      worryId: 'w1',
      recipientUid: 'recipient',
      authorUid: 'author',
      status: 'active',
    },
    'users/recipient': {
      activeDeliveryCount: 2,
    },
  });
  const repo = createReadStateRepository({ db: db as never });

  const result = await repo.markDeliveryRead({ recipientUid: 'recipient', deliveryId: 'd1' });

  assert.equal(result.status, 'read');
  assert.equal(result.deliveryId, 'd1');
  assert.ok(result.readAt);
  assert.equal(db.store.get('users/recipient/deliveryReadStates/d1')?.deliveryId, 'd1');
  assert.equal(db.store.get('users/recipient/deliveryReadStates/d1')?.recipientUid, 'recipient');
  assert.equal(db.store.get('deliveries/d1')?.readAt, undefined);
  assert.equal(db.store.get('deliveries/d1')?.status, 'active');
  assert.equal(db.store.get('users/recipient')?.activeDeliveryCount, 2);
  assert.equal([...db.store.keys()].some(path => path.startsWith('pushLogs/')), false);
});

test('delivery read repeat returns existing private state idempotently', async () => {
  const existingReadAt = { committed: true };
  const db = createFakeFirestore({
    'deliveries/d1': {
      worryId: 'w1',
      recipientUid: 'recipient',
      authorUid: 'author',
      status: 'active',
    },
    'users/recipient/deliveryReadStates/d1': {
      deliveryId: 'd1',
      worryId: 'w1',
      recipientUid: 'recipient',
      readAt: existingReadAt,
    },
  });
  const repo = createReadStateRepository({ db: db as never });

  const result = await repo.markDeliveryRead({ recipientUid: 'recipient', deliveryId: 'd1' });

  assert.equal(result.idempotent, true);
  assert.equal(result.readAt, existingReadAt);
});

test('delivery read validates missing wrong recipient and hidden delivery', async () => {
  const repo = createReadStateRepository({ db: createFakeFirestore({}) as never });
  await assert.rejects(() => repo.markDeliveryRead({ recipientUid: 'recipient', deliveryId: 'missing' }), /delivery_missing/);

  const wrong = createReadStateRepository({ db: createFakeFirestore({
    'deliveries/d1': { recipientUid: 'other', status: 'active' },
  }) as never });
  await assert.rejects(() => wrong.markDeliveryRead({ recipientUid: 'recipient', deliveryId: 'd1' }), /not_delivery_recipient/);

  const hidden = createReadStateRepository({ db: createFakeFirestore({
    'deliveries/d1': { recipientUid: 'recipient', status: 'hidden' },
  }) as never });
  await assert.rejects(() => hidden.markDeliveryRead({ recipientUid: 'recipient', deliveryId: 'd1' }), /delivery_hidden/);
});

test('reply read marks current replies privately and repeat is no-op', async () => {
  const db = createFakeFirestore({
    'worries/w1': { authorUid: 'author' },
    'replies/r1': { worryId: 'w1', authorUid: 'author', replierUid: 'recipient', status: 'active' },
    'replies/r2': { worryId: 'w1', authorUid: 'author', replierUid: 'recipient2', status: 'active' },
    'replies/r3': { worryId: 'w2', authorUid: 'author', replierUid: 'recipient3', status: 'active' },
  });
  const repo = createReadStateRepository({ db: db as never });

  const first = await repo.markRepliesForWorryRead({ authorUid: 'author', worryId: 'w1' });
  const second = await repo.markRepliesForWorryRead({ authorUid: 'author', worryId: 'w1' });

  assert.equal(first.markedCount, 2);
  assert.equal(second.markedCount, 0);
  assert.equal(db.store.get('users/author/replyReadStates/r1')?.replyId, 'r1');
  assert.equal(db.store.get('users/author/replyReadStates/r2')?.replyId, 'r2');
  assert.equal(db.store.get('users/author/replyReadStates/r3'), undefined);
  assert.equal(db.store.get('replies/r1')?.readByAuthorAt, undefined);
});

test('reply read can mark an AI reply by deterministic reply ID', async () => {
  const db = createFakeFirestore({
    'worries/w1': { authorUid: 'author' },
    'replies/w1_ai': {
      deliveryId: 'ai:w1',
      worryId: 'w1',
      authorUid: 'author',
      replierUid: 'ai_fallback',
      status: 'active',
      isAiGenerated: true,
      isExampleReply: false,
    },
  });
  const repo = createReadStateRepository({ db: db as never });

  const result = await repo.markRepliesForWorryRead({
    authorUid: 'author',
    worryId: 'w1',
    replyIds: ['w1_ai'],
  });

  assert.equal(result.markedCount, 1);
  assert.equal(db.store.get('users/author/replyReadStates/w1_ai')?.replyId, 'w1_ai');
});

test('reply subset read is all-or-nothing for invalid requested replies', async () => {
  const db = createFakeFirestore({
    'worries/w1': { authorUid: 'author' },
    'replies/r1': { worryId: 'w1', authorUid: 'author', replierUid: 'recipient', status: 'active' },
    'replies/r2': { worryId: 'w2', authorUid: 'author', replierUid: 'recipient2', status: 'active' },
  });
  const repo = createReadStateRepository({ db: db as never });

  await assert.rejects(() => repo.markRepliesForWorryRead({
    authorUid: 'author',
    worryId: 'w1',
    replyIds: ['r1', 'r2'],
  }), /reply_not_for_worry_author/);

  assert.equal(db.store.get('users/author/replyReadStates/r1'), undefined);
  assert.equal(db.store.get('users/author/replyReadStates/r2'), undefined);
});

test('later reply remains unread until another endpoint call', async () => {
  const db = createFakeFirestore({
    'worries/w1': { authorUid: 'author' },
    'replies/r1': { worryId: 'w1', authorUid: 'author', replierUid: 'recipient', status: 'active' },
  });
  const repo = createReadStateRepository({ db: db as never });

  await repo.markRepliesForWorryRead({ authorUid: 'author', worryId: 'w1' });
  db.store.set('replies/r2', { worryId: 'w1', authorUid: 'author', replierUid: 'recipient2', status: 'active' });

  assert.equal(db.store.get('users/author/replyReadStates/r2'), undefined);
  const result = await repo.markRepliesForWorryRead({ authorUid: 'author', worryId: 'w1' });
  assert.equal(result.markedCount, 1);
});
