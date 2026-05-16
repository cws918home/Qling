import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserProfileFirestoreRepository } from './firestoreRepository';

type StoredDoc = Record<string, unknown>;
type Operation =
  | { type: 'get'; path: string }
  | { type: 'set'; path: string; data: StoredDoc; options?: { merge?: boolean } };
type DocRef = { readonly path: string };

function createFakeFirestore(initial: Record<string, StoredDoc> = {}) {
  const committed = new Map<string, StoredDoc>(Object.entries(initial).map(([path, data]) => [path, { ...data }]));
  const operations: Operation[] = [];
  let writeStarted = false;

  return {
    operations,
    committed,
    collection(collectionName: string) {
      return {
        doc(id: string): DocRef {
          return { path: `${collectionName}/${id}` };
        },
      };
    },
    async runTransaction<T>(callback: (transaction: {
      get(ref: DocRef): Promise<{ exists: boolean; data(): StoredDoc | undefined }>;
      set(ref: DocRef, data: StoredDoc, options?: { merge?: boolean }): void;
    }) => Promise<T>): Promise<T> {
      const staged = new Map<string, StoredDoc>();
      writeStarted = false;
      const result = await callback({
        async get(ref) {
          assert.equal(writeStarted, false, `transaction read after write: ${ref.path}`);
          operations.push({ type: 'get', path: ref.path });
          const data = staged.get(ref.path) ?? committed.get(ref.path);
          return {
            exists: data !== undefined,
            data: () => data ? { ...data } : undefined,
          };
        },
        set(ref, data, options) {
          writeStarted = true;
          operations.push({ type: 'set', path: ref.path, data: { ...data }, options });
          const existing = options?.merge ? (staged.get(ref.path) ?? committed.get(ref.path) ?? {}) : {};
          staged.set(ref.path, { ...existing, ...data });
        },
      });
      for (const [path, data] of staged) committed.set(path, data);
      return result;
    },
  };
}

const profile = {
  uid: 'user-1',
  nickname: 'QLING',
  normalizedNickname: 'qling',
  gender: 'female' as const,
  age: 20,
  interests: ['워라밸'] as const,
};

test('real repository reserves nickname under nicknameReservations/{normalizedNickname}', async () => {
  const db = createFakeFirestore();
  const repository = createUserProfileFirestoreRepository({ db: db as never });

  const result = await repository.reserveNickname({
    uid: 'user-1',
    nickname: 'QLING',
    normalizedNickname: 'qling',
  });

  assert.deepEqual(result, {
    status: 'available',
    uid: 'user-1',
    nickname: 'QLING',
    normalizedNickname: 'qling',
  });
  assert.deepEqual(db.operations.map(({ type, path }) => [type, path]), [
    ['get', 'nicknameReservations/qling'],
    ['get', 'users/user-1'],
    ['set', 'nicknameReservations/qling'],
  ]);
  assert.equal(db.committed.has('nicknameReservations/QLING'), false);
  assert.equal(db.committed.get('nicknameReservations/qling')?.uid, 'user-1');
  assert.equal(db.committed.get('nicknameReservations/qling')?.nickname, 'QLING');
  assert.equal(db.committed.get('nicknameReservations/qling')?.normalizedNickname, 'qling');
});

test('real repository duplicate reservation returns duplicate and writes no profile', async () => {
  const db = createFakeFirestore({
    'nicknameReservations/qling': {
      uid: 'other-user',
      nickname: 'qling',
      normalizedNickname: 'qling',
      createdAt: 'old',
    },
  });
  const repository = createUserProfileFirestoreRepository({ db: db as never });

  const result = await repository.reserveNickname({
    uid: 'user-1',
    nickname: 'QLING',
    normalizedNickname: 'qling',
  });

  assert.deepEqual(result, {
    status: 'duplicate',
    code: 'nickname_taken',
    message: '이미 사용 중인 닉네임이에요.',
  });
  assert.equal(db.operations.some(op => op.type === 'set'), false);
  assert.equal(db.committed.has('users/user-1'), false);
  assert.equal(db.committed.get('nicknameReservations/qling')?.uid, 'other-user');
});

test('real repository allows idempotent same-user reservation and preserves normalized key', async () => {
  const db = createFakeFirestore({
    'nicknameReservations/qling': {
      uid: 'user-1',
      nickname: 'QLING',
      normalizedNickname: 'qling',
      createdAt: 'old',
    },
  });
  const repository = createUserProfileFirestoreRepository({ db: db as never });

  const result = await repository.reserveNickname({
    uid: 'user-1',
    nickname: 'QLING',
    normalizedNickname: 'qling',
  });

  assert.equal(result.status, 'available');
  assert.equal(db.committed.get('nicknameReservations/qling')?.uid, 'user-1');
  assert.equal(db.committed.get('nicknameReservations/qling')?.createdAt, 'old');
  assert.equal(db.committed.has('nicknameReservations/QLING'), false);
});

test('real repository rejects same uid changing normalized nickname without corrupting reservations', async () => {
  const db = createFakeFirestore({
    'users/user-1': {
      uid: 'user-1',
      nickname: 'QLING',
      normalizedNickname: 'qling',
    },
    'nicknameReservations/qling': {
      uid: 'user-1',
      nickname: 'QLING',
      normalizedNickname: 'qling',
    },
  });
  const repository = createUserProfileFirestoreRepository({ db: db as never });

  const result = await repository.reserveNickname({
    uid: 'user-1',
    nickname: '라미',
    normalizedNickname: '라미',
  });

  assert.deepEqual(result, {
    status: 'conflict',
    code: 'normalized_name_conflict',
    message: '이미 다른 닉네임 예약이 있어요. 다시 시도해주세요.',
  });
  assert.equal(db.operations.some(op => op.type === 'set'), false);
  assert.equal(db.committed.has('nicknameReservations/라미'), false);
  assert.equal(db.committed.get('nicknameReservations/qling')?.uid, 'user-1');
});

test('real repository completeOnboarding requires matching reservation', async () => {
  const missingDb = createFakeFirestore();
  const missingRepository = createUserProfileFirestoreRepository({ db: missingDb as never });
  assert.deepEqual(await missingRepository.completeOnboarding(profile), {
    status: 'reservation_missing',
    code: 'nickname_reservation_missing',
    message: '닉네임 중복 확인을 먼저 완료해주세요.',
  });
  assert.equal(missingDb.operations.some(op => op.type === 'set'), false);

  const wrongDb = createFakeFirestore({
    'nicknameReservations/qling': {
      uid: 'other-user',
      nickname: 'QLING',
      normalizedNickname: 'qling',
    },
  });
  const wrongRepository = createUserProfileFirestoreRepository({ db: wrongDb as never });
  assert.deepEqual(await wrongRepository.completeOnboarding(profile), {
    status: 'reservation_conflict',
    code: 'nickname_reservation_conflict',
    message: '닉네임 예약 정보가 일치하지 않아요. 다시 확인해주세요.',
  });
  assert.equal(wrongDb.operations.some(op => op.type === 'set' && op.path === 'users/user-1'), false);
});

test('real repository completeOnboarding writes server-owned profile fields after reservation read', async () => {
  const db = createFakeFirestore({
    'nicknameReservations/qling': {
      uid: 'user-1',
      nickname: 'QLING',
      normalizedNickname: 'qling',
    },
  });
  const repository = createUserProfileFirestoreRepository({ db: db as never });

  const result = await repository.completeOnboarding(profile);

  assert.deepEqual(result, {
    status: 'completed',
    profile,
  });
  assert.deepEqual(db.operations.map(({ type, path }) => [type, path]), [
    ['get', 'nicknameReservations/qling'],
    ['set', 'users/user-1'],
  ]);
  const written = db.committed.get('users/user-1');
  assert.equal(written?.uid, 'user-1');
  assert.equal(written?.nickname, 'QLING');
  assert.equal(written?.normalizedNickname, 'qling');
  assert.equal(written?.age, 20);
  assert.equal(written?.gender, 'female');
  assert.deepEqual(written?.interests, ['워라밸']);
  assert.ok(Object.hasOwn(written ?? {}, 'createdAt'));
  assert.ok(Object.hasOwn(written ?? {}, 'updatedAt'));
  assert.ok(Object.hasOwn(written ?? {}, 'lastActive'));
});
