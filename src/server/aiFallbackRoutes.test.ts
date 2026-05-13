import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAiFallbackRoutes } from './aiFallbackRoutes';

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
  result?: unknown;
  throws?: boolean;
} = {}) {
  const handlers: Array<(req: unknown, res: unknown, next?: () => void) => unknown> = [];
  let capturedParams: unknown = null;
  const app = {
    post(path: string, ...routeHandlers: typeof handlers) {
      assert.equal(path, '/api/internal/create-ai-fallbacks');
      handlers.push(...routeHandlers);
    },
  };

  registerAiFallbackRoutes(app as never, {
    db: (options.db === undefined ? {} : options.db) as never,
    messaging: null,
    createAiFallbacks: async params => {
      capturedParams = params;
      if (options.throws) throw new Error('unexpected');
      return (options.result ?? {
        status: 'completed',
        runId: 'run1',
        checkedCount: 0,
        createdReplyCount: 0,
        results: [],
        dryRun: false,
      }) as never;
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

test('missing internal secret', async () => {
  const oldSecret = process.env.INTERNAL_JOB_SECRET;
  delete process.env.INTERNAL_JOB_SECRET;
  const route = captureRoute();
  const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body: {} });
  process.env.INTERNAL_JOB_SECRET = oldSecret;

  assert.equal(res.statusCode, 503);
  assert.equal((res.body as { error: { code: string } }).error.code, 'internal_job_secret_missing');
  assert.equal(route.capturedParams(), null);
});

test('missing malformed and invalid bearer', async () => {
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

test('invalid body rejects before service call', async () => {
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
    { extra: true },
  ]) {
    const route = captureRoute();
    const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body });
    assert.equal(res.statusCode, 400);
    assert.equal((res.body as { error: { code: string } }).error.code, 'invalid_body');
    assert.equal(route.capturedParams(), null);
  }
});

test('valid body delegates to small public callable with parsed Date limit and dryRun', async () => {
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

test('Firebase unavailable maps 503', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const route = captureRoute({ db: null });
  const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body: {} });
  assert.equal(res.statusCode, 503);
  assert.equal((res.body as { error: { code: string } }).error.code, 'firebase_unavailable');
});

test('lock busy maps 409', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const route = captureRoute({
    result: {
      status: 'lock_busy',
      runId: 'run1',
      checkedCount: 0,
      createdReplyCount: 0,
      results: [],
      dryRun: false,
    },
  });
  const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body: {} });
  assert.equal(res.statusCode, 409);
});

test('provider failure before usable candidate maps 502', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const route = captureRoute({
    result: {
      status: 'provider_error',
      runId: 'run1',
      code: 'generator_failed',
      message: 'generator failed',
    },
  });
  const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body: {} });
  assert.equal(res.statusCode, 502);
  assert.equal((res.body as { error: { code: string } }).error.code, 'generator_failed');
});

test('unexpected service throw maps 500', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const route = captureRoute({ throws: true });
  const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body: {} });
  assert.equal(res.statusCode, 500);
  assert.equal((res.body as { error: { code: string } }).error.code, 'transaction_aborted');
});
