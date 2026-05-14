import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPassRoutes } from './passRoutes';

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
      assert.equal(path, '/api/deliveries/:deliveryId/pass');
      handlers.push(...routeHandlers);
    },
  };

  registerPassRoutes(app as never, {
    auth: {
      verifyIdToken: options.verifyIdToken ?? (async () => ({ uid: 'recipient' })),
    } as never,
    db: createDb(options.userData) as never,
    messaging: null,
    service: {
      passDelivery: async params => {
        capturedParams = params;
        return serviceResult as never;
      },
    },
  });

  return { handlers, capturedParams: () => capturedParams };
}

test('pass route uses verified uid and strips internal fields', async () => {
  const route = captureRoute({
    status: 'passed',
    deliveryId: 'delivery1',
    replacementDeliveryId: 'worry1_user2',
    replacementStatus: 'created',
    attemptId: 'delivery1',
    warnings: ['internal'],
  }, { userData: {} });
  const req = {
    headers: { authorization: 'Bearer token' },
    params: { deliveryId: 'delivery1' },
    body: { uid: 'body-user', status: 'passed' },
  };
  const res = createRes();

  await route.handlers[0](req, res, () => undefined);
  (req as { body: unknown }).body = {};
  await route.handlers[1](req, res, () => undefined);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'passed',
    deliveryId: 'delivery1',
    replacementDeliveryId: 'worry1_user2',
    replacementStatus: 'created',
  });
  assert.deepEqual(route.capturedParams(), {
    uid: 'recipient',
    deliveryId: 'delivery1',
  });
});

test('pass route rejects non-empty and non-object bodies before service call', async () => {
  for (const body of [{ deliveryId: 'other' }, null, [], 'x', 1, false]) {
    const route = captureRoute({ status: 'passed', deliveryId: 'delivery1', replacementStatus: 'shortfall' }, {
      userData: {},
    });
    const res = createRes();
    const req = { headers: { authorization: 'Bearer token' }, params: { deliveryId: 'delivery1' }, body };
    await route.handlers[0](req as never, res as never, () => undefined);
    await route.handlers[1](req as never, res as never, () => undefined);

    assert.equal(res.statusCode, 400);
    assert.equal(route.capturedParams(), null);
  }
});

test('pass route maps auth and service errors', async () => {
  const missing = captureRoute({ status: 'passed', deliveryId: 'delivery1', replacementStatus: 'shortfall' });
  const missingRes = createRes();
  await missing.handlers[0]({ headers: {}, params: {}, body: {} } as never, missingRes as never, () => undefined);
  assert.equal(missingRes.statusCode, 401);

  const cases = [
    [{ status: 'forbidden', code: 'not_delivery_recipient', message: 'no' }, 403],
    [{ status: 'not_found', code: 'delivery_missing', message: 'missing' }, 404],
    [{ status: 'conflict', code: 'delivery_not_active', message: 'conflict' }, 409],
    [{ status: 'server_error', code: 'data_integrity_error', message: 'bad' }, 500],
  ] as const;

  for (const [result, statusCode] of cases) {
    const route = captureRoute(result, { userData: {} });
    const res = createRes();
    const req = { headers: { authorization: 'Bearer token' }, params: { deliveryId: 'd1' }, body: {} };
    await route.handlers[0](req as never, res as never, () => undefined);
    await route.handlers[1](req as never, res as never, () => undefined);
    assert.equal(res.statusCode, statusCode);
  }
});

test('pass route blocks deleted user before service call and allows missing deleted field', async () => {
  const deleted = captureRoute({ status: 'passed', deliveryId: 'delivery1', replacementStatus: 'shortfall' }, {
    userData: { deleted: true },
  });
  const deletedRes = createRes();
  await deleted.handlers[0]({ headers: { authorization: 'Bearer token' }, params: {}, body: {} } as never, deletedRes as never, () => undefined);
  assert.equal(deletedRes.statusCode, 403);
  assert.equal(deleted.capturedParams(), null);

  const active = captureRoute({ status: 'passed', deliveryId: 'delivery1', replacementStatus: 'shortfall' }, {
    userData: {},
  });
  const activeRes = createRes();
  let nextCalled = false;
  await active.handlers[0]({ headers: { authorization: 'Bearer token' }, params: {}, body: {} } as never, activeRes as never, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(active.capturedParams(), null);
});

test('pass route returns firebase unavailable when Admin db is absent', async () => {
  const handlers: Array<(req: unknown, res: unknown) => unknown> = [];
  registerPassRoutes({
    post(path: string, handler: (req: unknown, res: unknown) => unknown) {
      assert.equal(path, '/api/deliveries/:deliveryId/pass');
      handlers.push(handler);
    },
  } as never, {
    auth: {} as never,
    db: null,
    messaging: null,
  });

  const res = createRes();
  await handlers[0]({}, res);
  assert.equal(res.statusCode, 500);
});
