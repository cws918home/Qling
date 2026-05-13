import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequireActiveFirebaseAuth, createRequireFirebaseAuth, parseBearerToken } from './auth';

function createRes() {
  return {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

function createDb(data: Record<string, unknown> | undefined) {
  return {
    collection: () => ({
      doc: () => ({
        get: async () => ({
          data: () => data,
        }),
      }),
    }),
  };
}

test('parseBearerToken accepts only bearer token header', () => {
  assert.equal(parseBearerToken('Bearer abc'), 'abc');
  assert.equal(parseBearerToken('Basic abc'), null);
  assert.equal(parseBearerToken(undefined), null);
});

test('missing bearer returns 401', async () => {
  const middleware = createRequireFirebaseAuth({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) } as never,
    db: createDb({ gender: 'female', interests: ['취업'] }) as never,
  });
  const res = createRes();

  await middleware({ headers: {}, body: { uid: 'body' } } as never, res as never, () => undefined);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: { code: 'auth_missing', message: '로그인이 필요합니다.' } });
});

test('invalid token returns 401', async () => {
  const middleware = createRequireFirebaseAuth({
    auth: { verifyIdToken: async () => { throw new Error('bad'); } } as never,
    db: createDb({ gender: 'female', interests: ['취업'] }) as never,
  });
  const res = createRes();

  await middleware({ headers: { authorization: 'Bearer bad' }, body: {} } as never, res as never, () => undefined);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: { code: 'auth_invalid', message: '로그인 정보를 확인할 수 없습니다.' } });
});

test('body uid/profile is ignored and verified profile is attached', async () => {
  const middleware = createRequireFirebaseAuth({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) } as never,
    db: createDb({ gender: 'female', interests: ['취업'], deleted: false }) as never,
  });
  const req = {
    headers: { authorization: 'Bearer good' },
    body: { uid: 'body', authorUid: 'body', gender: 'male', interests: ['연애'] },
  };
  const res = createRes();
  let nextCalled = false;

  await middleware(req as never, res as never, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual((req as never as { auth: unknown }).auth, { uid: 'verified' });
  assert.deepEqual((req as never as { authorProfile: unknown }).authorProfile, {
    uid: 'verified',
    gender: 'female',
    interests: ['취업'],
    deleted: false,
  });
});

test('deleted user is blocked and missing deleted is allowed', async () => {
  const deletedMiddleware = createRequireFirebaseAuth({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) } as never,
    db: createDb({ gender: 'female', interests: ['취업'], deleted: true }) as never,
  });
  const deletedRes = createRes();
  await deletedMiddleware({ headers: { authorization: 'Bearer good' } } as never, deletedRes as never, () => undefined);
  assert.equal(deletedRes.statusCode, 403);
  assert.deepEqual(deletedRes.body, { error: { code: 'user_deleted', message: '삭제된 계정입니다.' } });

  const activeMiddleware = createRequireFirebaseAuth({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) } as never,
    db: createDb({ gender: 'female', interests: ['취업'] }) as never,
  });
  const activeRes = createRes();
  let nextCalled = false;
  await activeMiddleware({ headers: { authorization: 'Bearer good' } } as never, activeRes as never, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('incomplete profile is blocked for publication', async () => {
  const middleware = createRequireFirebaseAuth({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) } as never,
    db: createDb({ gender: '', interests: [] }) as never,
  });
  const res = createRes();

  await middleware({ headers: { authorization: 'Bearer good' } } as never, res as never, () => undefined);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: { code: 'profile_incomplete', message: '고민을 보내려면 프로필 설정이 필요합니다.' } });
});

test('active auth allows missing profile fields for reply endpoints', async () => {
  const middleware = createRequireActiveFirebaseAuth({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) } as never,
    db: createDb({}) as never,
  });
  const req = {
    headers: { authorization: 'Bearer good' },
    body: { uid: 'body' },
  };
  const res = createRes();
  let nextCalled = false;

  await middleware(req as never, res as never, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual((req as never as { auth: unknown }).auth, { uid: 'verified' });
});

test('active auth blocks only deleted true', async () => {
  const middleware = createRequireActiveFirebaseAuth({
    auth: { verifyIdToken: async () => ({ uid: 'verified' }) } as never,
    db: createDb({ deleted: true }) as never,
  });
  const res = createRes();

  await middleware({ headers: { authorization: 'Bearer good' } } as never, res as never, () => undefined);

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: { code: 'user_deleted', message: '삭제된 계정입니다.' } });
});
