import test from 'node:test';
import assert from 'node:assert/strict';
import { registerRematchRoutes } from './rematchRoutes';

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
  db?: unknown;
  serviceResult?: unknown;
  serviceThrows?: boolean;
} = {}) {
  const handlers: Array<(req: unknown, res: unknown, next?: () => void) => unknown> = [];
  let capturedParams: unknown = null;
  const app = {
    post(path: string, ...routeHandlers: typeof handlers) {
      assert.equal(path, '/api/internal/rematch-due-deliveries');
      handlers.push(...routeHandlers);
    },
  };

  registerRematchRoutes(app as never, {
    db: (options.db === undefined ? {} : options.db) as never,
    messaging: null,
    service: {
      rematchDueDeliveries: async params => {
        capturedParams = params;
        if (options.serviceThrows) throw new Error('firestore down');
        return (options.serviceResult ?? {
          status: 'completed',
          runId: 'run1',
          dueCount: 0,
          processedCount: 0,
          createdDeliveryCount: 0,
          results: [],
          dryRun: false,
        }) as never;
      },
    },
  });

  return { handlers, capturedParams: () => capturedParams };
}

async function invoke(route: ReturnType<typeof captureRoute>, req: unknown) {
  const res = createRes();
  await route.handlers[0](req, res, () => undefined);
  if (res.body === null && route.handlers[1]) {
    await route.handlers[1](req, res, () => undefined);
  }
  return res;
}

test('rematch route rejects missing secret before service call', async () => {
  const oldSecret = process.env.INTERNAL_JOB_SECRET;
  delete process.env.INTERNAL_JOB_SECRET;
  const route = captureRoute();
  const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body: {} });
  process.env.INTERNAL_JOB_SECRET = oldSecret;

  assert.equal(res.statusCode, 503);
  assert.equal((res.body as { error: { code: string } }).error.code, 'internal_job_secret_missing');
  assert.equal(route.capturedParams(), null);
});

test('rematch route rejects auth missing malformed and invalid bearer', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const cases = [
    [{ headers: {}, body: {} }, 401, 'auth_missing'],
    [{ headers: { authorization: 'Basic secret' }, body: {} }, 401, 'auth_malformed'],
    [{ headers: { authorization: 'Bearer wrong' }, body: {} }, 403, 'auth_invalid'],
  ] as const;

  for (const [req, statusCode, code] of cases) {
    const route = captureRoute();
    const res = await invoke(route, req);
    assert.equal(res.statusCode, statusCode);
    assert.equal((res.body as { error: { code: string } }).error.code, code);
    assert.equal(route.capturedParams(), null);
  }
});

test('rematch route validates body before service call', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  for (const body of [
    null,
    [],
    'x',
    1,
    false,
    { now: 'nope' },
    { dryRun: 'yes' },
    { limit: 0 },
    { limit: -1 },
    { limit: 1.5 },
    { limit: 101 },
  ]) {
    const route = captureRoute();
    const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body });
    assert.equal(res.statusCode, 400);
    assert.equal((res.body as { error: { code: string } }).error.code, 'invalid_body');
    assert.equal(route.capturedParams(), null);
  }
});

test('rematch route delegates valid request to service', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const route = captureRoute();
  const res = await invoke(route, {
    headers: { authorization: 'Bearer secret' },
    body: { now: '2026-05-13T00:00:00.000Z', dryRun: true, limit: 10 },
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(route.capturedParams(), {
    now: new Date('2026-05-13T00:00:00.000Z'),
    dryRun: true,
    limit: 10,
  });
});

test('rematch route maps firestore unavailable and service failure', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const unavailable = captureRoute({ db: null });
  const unavailableRes = await invoke(unavailable, { headers: { authorization: 'Bearer secret' }, body: {} });
  assert.equal(unavailableRes.statusCode, 503);
  assert.equal((unavailableRes.body as { error: { code: string } }).error.code, 'firebase_unavailable');

  const failing = captureRoute({ serviceThrows: true });
  const failingRes = await invoke(failing, { headers: { authorization: 'Bearer secret' }, body: {} });
  assert.equal(failingRes.statusCode, 500);
  assert.equal((failingRes.body as { error: { code: string } }).error.code, 'transaction_aborted');
});

test('rematch route maps lock busy to established 409 result body', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const route = captureRoute({
    serviceResult: {
      status: 'lock_busy',
      runId: 'run1',
      dueCount: 0,
      processedCount: 0,
      createdDeliveryCount: 0,
      results: [],
      dryRun: false,
    },
  });
  const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body: {} });

  assert.equal(res.statusCode, 409);
  assert.equal((res.body as { status: string }).status, 'lock_busy');
});
