import test from 'node:test';
import assert from 'node:assert/strict';
import { registerUserProfileRoutes } from './userProfileRoutes';
import type { NicknameReservationRepository } from '../services/userProfile/types';

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

function captureRoutes(repository: NicknameReservationRepository) {
  const routes = new Map<string, Array<(req: unknown, res: unknown, next?: () => void) => unknown>>();
  const app = {
    post(path: string, ...handlers: Array<(req: unknown, res: unknown, next?: () => void) => unknown>) {
      routes.set(path, handlers);
    },
  };
  const db = {
    collection: () => ({
      doc: () => ({
        async get() {
          return { data: () => ({ deleted: false }) };
        },
      }),
    }),
  };

  registerUserProfileRoutes(app as never, {
    db: db as never,
    auth: { verifyIdToken: async () => ({ uid: 'verified-user' }) } as never,
    repository,
  });

  async function call(path: string, body: unknown) {
    const req = { headers: { authorization: 'Bearer token' }, body } as never;
    const res = createRes();
    const handlers = routes.get(path) ?? [];
    let routePromise: unknown;
    await handlers[0](req, res as never, () => {
      routePromise = handlers[1](req, res as never);
    });
    await routePromise;
    return res;
  }

  return { call };
}

test('nickname reservation route uses verified uid and maps duplicate response', async () => {
  const route = captureRoutes({
    async reserveNickname(params) {
      assert.deepEqual(params, {
        uid: 'verified-user',
        nickname: 'QLING',
        normalizedNickname: 'qling',
      });
      return { status: 'duplicate', code: 'nickname_taken', message: '이미 사용 중인 닉네임이에요.' };
    },
    async completeOnboarding() {
      throw new Error('unused');
    },
  });

  const res = await route.call('/api/users/me/nickname-reservation', { nickname: ' QLING ' });
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.body, { status: 'duplicate', code: 'nickname_taken', message: '이미 사용 중인 닉네임이에요.' });
});

test('onboarding profile route persists required age, gender, interests, and nickname', async () => {
  const route = captureRoutes({
    async reserveNickname() {
      throw new Error('unused');
    },
    async completeOnboarding(params) {
      assert.deepEqual(params, {
        uid: 'verified-user',
        nickname: '라미',
        normalizedNickname: '라미',
        gender: 'female',
        age: 99,
        interests: ['워라밸'],
      });
      return { status: 'completed', profile: params };
    },
  });

  const res = await route.call('/api/users/me/onboarding-profile', {
    nickname: ' 라미 ',
    gender: 'female',
    age: 99,
    interests: ['워라밸', '워라벨'],
  });
  assert.equal(res.statusCode, 200);
  assert.equal((res.body as { status: string }).status, 'completed');
});

test('onboarding profile route rejects invalid required fields before persistence', async () => {
  let called = false;
  const route = captureRoutes({
    async reserveNickname() {
      throw new Error('unused');
    },
    async completeOnboarding() {
      called = true;
      throw new Error('should not persist');
    },
  });

  const res = await route.call('/api/users/me/onboarding-profile', {
    nickname: '라미',
    gender: 'female',
    age: 13,
    interests: ['워라밸'],
  });
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});
