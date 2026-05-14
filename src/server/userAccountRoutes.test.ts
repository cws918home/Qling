import test from 'node:test';
import assert from 'node:assert/strict';
import { registerUserAccountRoutes } from './userAccountRoutes';
import type { deleteMyAccount } from '../services/userAccount';

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

function captureRoute(options: {
  verifyIdToken?: () => Promise<{ uid: string }>;
  deleteAccount?: typeof deleteMyAccount;
} = {}) {
  const handlers: Array<(req: unknown, res: unknown) => unknown> = [];
  const calls: unknown[] = [];
  const app = {
    post(path: string, handler: (req: unknown, res: unknown) => unknown) {
      assert.equal(path, '/api/users/me/delete');
      handlers.push(handler);
    },
  };
  const repository = {
    softDeleteUser: async () => undefined,
    deletePushTokens: async () => ({ deletedCount: 0 }),
  };
  const clock = { now: () => 'now' };

  registerUserAccountRoutes(app as never, {
    db: {} as never,
    auth: {
      verifyIdToken: options.verifyIdToken ?? (async () => ({ uid: 'verified-user' })),
    } as never,
    repository,
    clock,
    deleteAccount: options.deleteAccount ?? (async params => {
      calls.push(params);
      return { status: 'deleted', deletedTokenCount: 0 };
    }),
  });

  return { handler: handlers[0], calls };
}

test('delete account route maps missing and invalid auth', async () => {
  const missing = captureRoute();
  const missingRes = createRes();
  await missing.handler({ headers: {}, body: { confirm: true } } as never, missingRes as never);
  assert.equal(missingRes.statusCode, 401);
  assert.deepEqual(missingRes.body, { error: { code: 'auth_missing', message: '로그인이 필요합니다.' } });
  assert.deepEqual(missing.calls, []);

  const invalid = captureRoute({
    verifyIdToken: async () => { throw new Error('bad token'); },
  });
  const invalidRes = createRes();
  await invalid.handler({ headers: { authorization: 'Bearer bad' }, body: { confirm: true } } as never, invalidRes as never);
  assert.equal(invalidRes.statusCode, 401);
  assert.deepEqual(invalidRes.body, { error: { code: 'auth_invalid', message: '로그인 정보를 확인할 수 없습니다.' } });
  assert.deepEqual(invalid.calls, []);
});

test('delete account route requires exact confirmation body', async () => {
  for (const body of [undefined, {}, { confirm: false }]) {
    const route = captureRoute();
    const res = createRes();
    await route.handler({ headers: { authorization: 'Bearer token' }, body } as never, res as never);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      error: {
        code: 'confirmation_required',
        message: '계정 삭제 확인이 필요합니다.',
      },
    });
    assert.deepEqual(route.calls, []);
  }
});

test('delete account route uses verified uid and ignores spoofed body identity fields', async () => {
  const route = captureRoute({
    verifyIdToken: async () => ({ uid: 'verified-user' }),
  });
  const res = createRes();
  await route.handler({
    headers: { authorization: 'Bearer token' },
    body: {
      confirm: true,
      uid: 'attacker',
      userId: 'attacker',
      authorUid: 'attacker',
      replierUid: 'attacker',
      targetUid: 'attacker',
    },
  } as never, res as never);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'deleted' });
  assert.equal(route.calls.length, 1);
  assert.equal((route.calls[0] as { uid: string }).uid, 'verified-user');
});

test('delete account route returns 200 for already deleted service result', async () => {
  const route = captureRoute({
    deleteAccount: async () => ({ status: 'deleted', deletedTokenCount: 0 }),
  });
  const res = createRes();
  await route.handler({ headers: { authorization: 'Bearer token' }, body: { confirm: true } } as never, res as never);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'deleted' });
});

test('delete account route maps storage failure', async () => {
  const route = captureRoute({
    deleteAccount: async () => { throw new Error('cleanup failed'); },
  });
  const res = createRes();
  await route.handler({ headers: { authorization: 'Bearer token' }, body: { confirm: true } } as never, res as never);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    error: {
      code: 'account_deletion_failed',
      message: '계정 삭제 처리 중 문제가 발생했습니다.',
    },
  });
});
