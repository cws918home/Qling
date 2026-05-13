import test from 'node:test';
import assert from 'node:assert/strict';
import { registerReplyRoutes } from './replyRoutes';

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

function createDb(data: Record<string, unknown> | undefined = {}) {
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

function captureRoute(serviceResult: unknown, options: {
  userData?: Record<string, unknown>;
  verifyIdToken?: () => Promise<{ uid: string }>;
} = {}) {
  const handlers: Array<(req: unknown, res: unknown, next: () => void) => unknown> = [];
  let capturedParams: unknown = null;
  const app = {
    post(path: string, ...routeHandlers: typeof handlers) {
      assert.equal(path, '/api/deliveries/:deliveryId/replies');
      handlers.push(...routeHandlers);
    },
  };

  registerReplyRoutes(app as never, {
    auth: {
      verifyIdToken: options.verifyIdToken ?? (async () => ({ uid: 'recipient' })),
    } as never,
    db: createDb(options.userData) as never,
    messaging: null,
    moderationProvider: async () => ({ status: 'approved' }),
    service: {
      publishReplyForDelivery: async params => {
        capturedParams = params;
        return serviceResult as never;
      },
    } as never,
  });

  return { handlers, capturedParams: () => capturedParams };
}

test('reply route uses verified uid, delivery path, and ignores body uid', async () => {
  const route = captureRoute({ status: 'published', replyId: 'delivery1' }, {
    userData: { deleted: false },
  });
  const req = {
    headers: { authorization: 'Bearer token' },
    params: { deliveryId: 'delivery1' },
    body: { content: 'reply', uid: 'body-user', replierUid: 'body-user' },
  };
  const res = createRes();

  await route.handlers[0](req, res, () => undefined);
  await route.handlers[1](req, res, () => undefined);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { status: 'published', replyId: 'delivery1' });
  assert.deepEqual(route.capturedParams(), {
    replierUid: 'recipient',
    deliveryId: 'delivery1',
    content: 'reply',
  });
});

test('reply route maps missing and invalid auth before service call', async () => {
  const missing = captureRoute({ status: 'published', replyId: 'delivery1' });
  const missingRes = createRes();
  await missing.handlers[0]({ headers: {}, params: {}, body: {} } as never, missingRes as never, () => undefined);
  assert.equal(missingRes.statusCode, 401);
  assert.equal(missing.capturedParams(), null);

  const invalid = captureRoute({ status: 'published', replyId: 'delivery1' }, {
    verifyIdToken: async () => { throw new Error('bad'); },
  });
  const invalidRes = createRes();
  await invalid.handlers[0]({ headers: { authorization: 'Bearer bad' }, params: {}, body: {} } as never, invalidRes as never, () => undefined);
  assert.equal(invalidRes.statusCode, 401);
  assert.equal(invalid.capturedParams(), null);
});

test('reply route blocks deleted user but allows missing deleted field', async () => {
  const deleted = captureRoute({ status: 'published', replyId: 'delivery1' }, {
    userData: { deleted: true },
  });
  const deletedRes = createRes();
  await deleted.handlers[0]({ headers: { authorization: 'Bearer token' }, params: {}, body: {} } as never, deletedRes as never, () => undefined);
  assert.equal(deletedRes.statusCode, 403);
  assert.equal(deleted.capturedParams(), null);

  const active = captureRoute({ status: 'published', replyId: 'delivery1' }, {
    userData: {},
  });
  const activeRes = createRes();
  let nextCalled = false;
  await active.handlers[0]({ headers: { authorization: 'Bearer token' }, params: {}, body: {} } as never, activeRes as never, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('reply route maps validation rejection conflict ownership and provider responses', async () => {
  const cases = [
    [{ status: 'validation_error', code: 'empty', message: 'empty' }, 400],
    [{ status: 'rejected', reasonCode: 'spam_promotion', userMessage: 'blocked', moderationLogId: 'mod1' }, 200],
    [{ status: 'forbidden', code: 'not_delivery_recipient', message: 'no' }, 403],
    [{ status: 'not_found', code: 'delivery_missing', message: 'missing' }, 404],
    [{ status: 'conflict', code: 'duplicate_reply', message: 'duplicate' }, 409],
    [{ status: 'provider_error', code: 'provider_error', message: 'down' }, 502],
  ] as const;

  for (const [result, statusCode] of cases) {
    const route = captureRoute(result, { userData: {} });
    const res = createRes();
    const req = { headers: { authorization: 'Bearer token' }, params: { deliveryId: 'delivery1' }, body: { content: 'reply' } };
    await route.handlers[0](req as never, res as never, () => undefined);
    await route.handlers[1](req as never, res as never, () => undefined);
    assert.equal(res.statusCode, statusCode);
  }
});

test('reply route returns firebase unavailable when Admin db is absent', async () => {
  const handlers: Array<(req: unknown, res: unknown) => unknown> = [];
  registerReplyRoutes({
    post(path: string, handler: (req: unknown, res: unknown) => unknown) {
      assert.equal(path, '/api/deliveries/:deliveryId/replies');
      handlers.push(handler);
    },
  } as never, {
    auth: {} as never,
    db: null,
    messaging: null,
    moderationProvider: async () => ({ status: 'approved' }),
  });

  const res = createRes();
  await handlers[0]({}, res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    error: {
      code: 'firebase_unavailable',
      message: 'Firebase Admin is not initialized.',
    },
  });
});
