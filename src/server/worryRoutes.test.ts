import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWorryRoutes } from './worryRoutes';

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

function capturePublishRoute(options: {
  userData?: Record<string, unknown>;
  verifyIdToken?: () => Promise<{ uid: string }>;
  result?: unknown;
  throws?: boolean;
} = {}) {
  const handlers: Array<(req: unknown, res: unknown, next: () => void) => unknown> = [];
  let serviceCalled = false;
  const app = {
    post(path: string, ...routeHandlers: typeof handlers) {
      assert.equal(path, '/api/worries/publish');
      handlers.push(...routeHandlers);
    },
  };

  registerWorryRoutes(app as never, {
    auth: {
      verifyIdToken: options.verifyIdToken ?? (async () => ({ uid: 'verified-user' })),
    } as never,
    db: {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            data: () => options.userData ?? { gender: 'female', interests: ['취업'] },
          }),
        }),
      }),
    } as never,
    messaging: null,
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    publishWorry: async () => {
      serviceCalled = true;
      if (options.throws) throw new Error('unexpected');
      return (options.result ?? {
        status: 'published',
        worryId: 'worry1',
        deliveryIds: ['delivery1'],
        moderationLogId: 'mod1',
      }) as never;
    },
  });

  return { handlers, serviceCalled: () => serviceCalled };
}

test('publish route uses verified author profile and ignores body identity/profile fields', async () => {
  const handlers: Array<(req: unknown, res: unknown, next: () => void) => unknown> = [];
  const app = {
    post(path: string, ...routeHandlers: typeof handlers) {
      assert.equal(path, '/api/worries/publish');
      handlers.push(...routeHandlers);
    },
  };
  let capturedAuthor: unknown = null;

  registerWorryRoutes(app as never, {
    auth: {
      verifyIdToken: async () => ({ uid: 'verified-user' }),
    } as never,
    db: {
      collection: () => ({
        doc: () => ({
          get: async () => ({
            data: () => ({
              gender: 'female',
              interests: ['취업'],
            }),
          }),
        }),
      }),
    } as never,
    messaging: null,
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    publishWorry: async params => {
      capturedAuthor = params.author;
      return {
        status: 'published',
        worryId: 'worry1',
        deliveryIds: ['delivery1'],
        moderationLogId: 'mod1',
      };
    },
  });

  const req = {
    headers: { authorization: 'Bearer token' },
    body: {
      content: 'content',
      uid: 'body-user',
      authorUid: 'body-author',
      gender: 'male',
      interests: ['연애'],
    },
  };
  const res = createRes();

  await handlers[0](req, res, () => undefined);
  await handlers[1](req, res, () => undefined);

  assert.deepEqual(capturedAuthor, {
    uid: 'verified-user',
    gender: 'female',
    interests: ['취업'],
  });
  assert.equal(res.statusCode, 200);
});

test('publish route blocks deleted user before service call and allows missing deleted field', async () => {
  const capture = (userData: Record<string, unknown>) => {
    const handlers: Array<(req: unknown, res: unknown, next: () => void) => unknown> = [];
    let serviceCalled = false;
    const app = {
      post(_path: string, ...routeHandlers: typeof handlers) {
        handlers.push(...routeHandlers);
      },
    };

    registerWorryRoutes(app as never, {
      auth: {
        verifyIdToken: async () => ({ uid: 'verified-user' }),
      } as never,
      db: {
        collection: () => ({
          doc: () => ({
            get: async () => ({
              data: () => userData,
            }),
          }),
        }),
      } as never,
      messaging: null,
      moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
      publishWorry: async () => {
        serviceCalled = true;
        return {
          status: 'published',
          worryId: 'worry1',
          deliveryIds: [],
          moderationLogId: 'mod1',
        };
      },
    });

    return { handlers, serviceCalled: () => serviceCalled };
  };

  const deleted = capture({ gender: 'female', interests: ['취업'], deleted: true });
  const deletedRes = createRes();
  await deleted.handlers[0]({ headers: { authorization: 'Bearer token' }, body: { content: 'content' } } as never, deletedRes as never, () => undefined);
  assert.equal(deletedRes.statusCode, 403);
  assert.equal(deleted.serviceCalled(), false);

  const active = capture({ gender: 'female', interests: ['취업'] });
  const activeRes = createRes();
  let nextCalled = false;
  await active.handlers[0]({ headers: { authorization: 'Bearer token' }, body: { content: 'content' } } as never, activeRes as never, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(active.serviceCalled(), false);
});

test('publish route maps auth validation moderation provider and server errors', async () => {
  const missing = capturePublishRoute();
  const missingRes = createRes();
  await missing.handlers[0]({ headers: {}, body: {} } as never, missingRes as never, () => undefined);
  assert.equal(missingRes.statusCode, 401);
  assert.equal(missing.serviceCalled(), false);

  const invalid = capturePublishRoute({
    verifyIdToken: async () => { throw new Error('bad'); },
  });
  const invalidRes = createRes();
  await invalid.handlers[0]({ headers: { authorization: 'Bearer bad' }, body: {} } as never, invalidRes as never, () => undefined);
  assert.equal(invalidRes.statusCode, 401);
  assert.equal(invalid.serviceCalled(), false);

  const cases = [
    [{ status: 'validation_error', code: 'empty', message: 'empty' }, 400],
    [{ status: 'rejected', reasonCode: 'spam_promotion', userMessage: 'blocked', targetId: 'mod1' }, 200],
    [{ status: 'provider_error', code: 'provider_error', message: 'down', details: 'x' }, 502],
    [{ status: 'server_error', code: 'eligible_recipient_shortfall', message: 'not enough users' }, 500],
  ] as const;

  for (const [result, statusCode] of cases) {
    const route = capturePublishRoute({ result });
    const res = createRes();
    const req = { headers: { authorization: 'Bearer token' }, body: { content: 'content' } };
    await route.handlers[0](req as never, res as never, () => undefined);
    await route.handlers[1](req as never, res as never, () => undefined);
    assert.equal(res.statusCode, statusCode);
    assert.equal(Boolean((res.body as { error?: unknown }).error), statusCode >= 400);
  }

  const thrown = capturePublishRoute({ throws: true });
  const thrownRes = createRes();
  const req = { headers: { authorization: 'Bearer token' }, body: { content: 'content' } };
  await thrown.handlers[0](req as never, thrownRes as never, () => undefined);
  await thrown.handlers[1](req as never, thrownRes as never, () => undefined);
  assert.equal(thrownRes.statusCode, 500);
  assert.equal((thrownRes.body as { error: { code: string } }).error.code, 'transaction_aborted');
});

test('publish route returns firebase unavailable when Admin db is absent', async () => {
  const handlers: Array<(req: unknown, res: unknown) => unknown> = [];
  registerWorryRoutes({
    post(path: string, handler: (req: unknown, res: unknown) => unknown) {
      assert.equal(path, '/api/worries/publish');
      handlers.push(handler);
    },
  } as never, {
    auth: {} as never,
    db: null,
    messaging: null,
    moderationProvider: async () => ({ status: 'approved', categories: [] }),
  });

  const res = createRes();
  await handlers[0]({}, res);
  assert.equal(res.statusCode, 500);
  assert.equal((res.body as { error: { code: string } }).error.code, 'firebase_unavailable');
});
