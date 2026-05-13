import test from 'node:test';
import assert from 'node:assert/strict';
import { registerReadStateRoutes } from './readStateRoutes';

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

function captureRoutes(options: {
  userData?: Record<string, unknown>;
  verifyIdToken?: () => Promise<{ uid: string }>;
  deliveryResult?: unknown;
  repliesResult?: unknown;
} = {}) {
  const routes = new Map<string, Array<(req: unknown, res: unknown, next: () => void) => unknown>>();
  let deliveryParams: unknown = null;
  let repliesParams: unknown = null;
  const app = {
    post(path: string, ...handlers: Array<(req: unknown, res: unknown, next: () => void) => unknown>) {
      routes.set(path, handlers);
    },
  };

  registerReadStateRoutes(app as never, {
    auth: {
      verifyIdToken: options.verifyIdToken ?? (async () => ({ uid: 'user1' })),
    } as never,
    db: createDb(options.userData) as never,
    service: {
      markDeliveryRead: async params => {
        deliveryParams = params;
        return options.deliveryResult as never;
      },
      markRepliesForWorryRead: async params => {
        repliesParams = params;
        return options.repliesResult as never;
      },
    } as never,
  });

  return { routes, deliveryParams: () => deliveryParams, repliesParams: () => repliesParams };
}

test('delivery read route uses verified uid and ignores body-supplied identity', async () => {
  const route = captureRoutes({
    userData: {},
    deliveryResult: { status: 'read', deliveryId: 'd1', readAt: {} },
  });
  const handlers = route.routes.get('/api/deliveries/:deliveryId/read') ?? [];
  const req = {
    headers: { authorization: 'Bearer token' },
    params: { deliveryId: 'd1' },
    body: { uid: 'body-user', recipientUid: 'body-user', replierUid: 'body-user' },
  };
  const res = createRes();

  await handlers[0](req, res, () => undefined);
  await handlers[1](req, res, () => undefined);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(route.deliveryParams(), { recipientUid: 'user1', deliveryId: 'd1' });
});

test('replies read route supports empty body and passes verified uid', async () => {
  const route = captureRoutes({
    userData: {},
    repliesResult: { status: 'read', worryId: 'w1', markedCount: 0 },
  });
  const handlers = route.routes.get('/api/worries/:worryId/replies/read') ?? [];
  const req = {
    headers: { authorization: 'Bearer token' },
    params: { worryId: 'w1' },
    body: { uid: 'body-user' },
  };
  const res = createRes();

  await handlers[0](req, res, () => undefined);
  await handlers[1](req, res, () => undefined);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(route.repliesParams(), { authorUid: 'user1', worryId: 'w1', body: { uid: 'body-user' } });
});

test('read-state routes reject missing invalid and deleted auth before service call', async () => {
  const missing = captureRoutes();
  const missingHandlers = missing.routes.get('/api/deliveries/:deliveryId/read') ?? [];
  const missingRes = createRes();
  await missingHandlers[0]({ headers: {}, params: {}, body: {} } as never, missingRes as never, () => undefined);
  assert.equal(missingRes.statusCode, 401);
  assert.equal(missing.deliveryParams(), null);

  const invalid = captureRoutes({
    verifyIdToken: async () => { throw new Error('bad'); },
  });
  const invalidRes = createRes();
  await (invalid.routes.get('/api/deliveries/:deliveryId/read') ?? [])[0](
    { headers: { authorization: 'Bearer bad' }, params: {}, body: {} } as never,
    invalidRes as never,
    () => undefined
  );
  assert.equal(invalidRes.statusCode, 401);

  const deleted = captureRoutes({ userData: { deleted: true } });
  const deletedRes = createRes();
  await (deleted.routes.get('/api/worries/:worryId/replies/read') ?? [])[0](
    { headers: { authorization: 'Bearer token' }, params: {}, body: {} } as never,
    deletedRes as never,
    () => undefined
  );
  assert.equal(deletedRes.statusCode, 403);
});

test('read-state routes map service errors', async () => {
  const cases = [
    ['/api/deliveries/:deliveryId/read', 'deliveryResult', { status: 'not_found', code: 'delivery_missing', message: 'missing' }, 404],
    ['/api/deliveries/:deliveryId/read', 'deliveryResult', { status: 'forbidden', code: 'not_delivery_recipient', message: 'no' }, 403],
    ['/api/deliveries/:deliveryId/read', 'deliveryResult', { status: 'conflict', code: 'delivery_hidden', message: 'hidden' }, 409],
    ['/api/worries/:worryId/replies/read', 'repliesResult', { status: 'validation_error', code: 'invalid_reply_ids', message: 'bad' }, 400],
    ['/api/worries/:worryId/replies/read', 'repliesResult', { status: 'not_found', code: 'reply_missing', message: 'missing' }, 404],
    ['/api/worries/:worryId/replies/read', 'repliesResult', { status: 'forbidden', code: 'not_worry_author', message: 'no' }, 403],
  ] as const;

  for (const [path, key, result, statusCode] of cases) {
    const route = captureRoutes({ userData: {}, [key]: result });
    const handlers = route.routes.get(path) ?? [];
    const res = createRes();
    const req = { headers: { authorization: 'Bearer token' }, params: { deliveryId: 'd1', worryId: 'w1' }, body: {} };
    await handlers[0](req as never, res as never, () => undefined);
    await handlers[1](req as never, res as never, () => undefined);
    assert.equal(res.statusCode, statusCode);
  }
});

test('read-state routes return firebase unavailable when Admin db is absent', async () => {
  const routes = new Map<string, (req: unknown, res: unknown) => unknown>();
  registerReadStateRoutes({
    post(path: string, handler: (req: unknown, res: unknown) => unknown) {
      routes.set(path, handler);
    },
  } as never, {
    auth: {} as never,
    db: null,
  });

  for (const handler of routes.values()) {
    const res = createRes();
    await handler({}, res);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      error: {
        code: 'firebase_unavailable',
        message: 'Firebase Admin is not initialized.',
      },
    });
  }
});
