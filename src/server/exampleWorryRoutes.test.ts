import test from 'node:test';
import assert from 'node:assert/strict';
import { registerExampleWorryRoutes } from './exampleWorryRoutes';

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
  db?: unknown;
  userData?: Record<string, unknown>;
  verifyIdToken?: () => Promise<{ uid: string }>;
  createThrows?: boolean;
  jobThrows?: boolean;
} = {}) {
  const routes = new Map<string, Array<(req: unknown, res: unknown, next?: () => void) => unknown>>();
  const calls: unknown[] = [];
  const app = {
    post(path: string, ...handlers: Array<(req: unknown, res: unknown, next?: () => void) => unknown>) {
      routes.set(path, handlers);
    },
  };

  registerExampleWorryRoutes(app as never, {
    auth: {
      verifyIdToken: options.verifyIdToken ?? (async () => ({ uid: 'verified-user' })),
    } as never,
    db: (options.db === undefined ? createDb(options.userData) : options.db) as never,
    service: {
      createExamplesForUser: async params => {
        calls.push({ name: 'createExamplesForUser', params });
        if (options.createThrows) throw new Error('create failed');
        return { status: 'created', uid: params.uid, worryIds: [], deliveryIds: [], seedIds: [] };
      },
      createDueExampleFeedbacks: async params => {
        calls.push({ name: 'createDueExampleFeedbacks', params });
        if (options.jobThrows) throw new Error('job failed');
        return { status: 'completed', checkedCount: 0, completedCount: 0, skippedCount: 0, failedCount: 0, results: [] };
      },
    },
  });

  return { routes, calls };
}

async function invoke(handlers: Array<(req: unknown, res: unknown, next?: () => void) => unknown>, req: unknown) {
  const res = createRes();
  await handlers[0](req, res, () => undefined);
  if (res.body === null && handlers[1]) await handlers[1](req, res, () => undefined);
  return res;
}

test('POST /api/users/me/example-worries requires Firebase auth and ignores body uid', async () => {
  const { routes, calls } = captureRoutes({ userData: {} });
  const handlers = routes.get('/api/users/me/example-worries')!;

  const missing = await invoke(handlers, { headers: {}, body: {} });
  assert.equal(missing.statusCode, 401);

  const valid = await invoke(handlers, {
    headers: { authorization: 'Bearer token' },
    body: { uid: 'body-user' },
  });
  assert.equal(valid.statusCode, 200);
  assert.deepEqual(calls[0], {
    name: 'createExamplesForUser',
    params: { uid: 'verified-user' },
  });
});

test('POST /api/users/me/example-worries rejects unsupported body fields', async () => {
  const { routes, calls } = captureRoutes({ userData: {} });
  const res = await invoke(routes.get('/api/users/me/example-worries')!, {
    headers: { authorization: 'Bearer token' },
    body: { uid: 'body-user', interests: ['career'] },
  });

  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('example routes return structured firebase_unavailable when Admin db is absent', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const { routes } = captureRoutes({ db: null });

  const createRes = await invoke(routes.get('/api/users/me/example-worries')!, { headers: {}, body: {} });
  assert.equal(createRes.statusCode, 503);
  assert.equal((createRes.body as { error: { code: string } }).error.code, 'firebase_unavailable');

  const jobRes = await invoke(routes.get('/api/internal/create-example-feedbacks')!, {
    headers: { authorization: 'Bearer secret' },
    body: {},
  });
  assert.equal(jobRes.statusCode, 503);
  assert.equal((jobRes.body as { error: { code: string } }).error.code, 'firebase_unavailable');
});

test('POST /api/internal/create-example-feedbacks requires internal job secret and accepts valid body', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const cases = [
    [{ headers: {}, body: {} }, 401, 'auth_missing'],
    [{ headers: { authorization: 'Basic secret' }, body: {} }, 401, 'auth_malformed'],
    [{ headers: { authorization: 'Bearer wrong' }, body: {} }, 403, 'auth_invalid'],
  ] as const;

  for (const [req, statusCode, code] of cases) {
    const { routes, calls } = captureRoutes();
    const res = await invoke(routes.get('/api/internal/create-example-feedbacks')!, req);
    assert.equal(res.statusCode, statusCode);
    assert.equal((res.body as { error: { code: string } }).error.code, code);
    assert.equal(calls.length, 0);
  }

  const { routes, calls } = captureRoutes();
  const res = await invoke(routes.get('/api/internal/create-example-feedbacks')!, {
    headers: { authorization: 'Bearer secret' },
    body: { now: '2026-05-13T00:00:00.000Z', limit: 5 },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls[0], {
    name: 'createDueExampleFeedbacks',
    params: { now: new Date('2026-05-13T00:00:00.000Z'), limit: 5 },
  });
});

test('POST /api/internal/create-example-feedbacks validates exact body matrix', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  for (const body of [null, [], 'x', { now: 'bad' }, { limit: 0 }, { limit: 101 }, { dryRun: true }]) {
    const { routes, calls } = captureRoutes();
    const res = await invoke(routes.get('/api/internal/create-example-feedbacks')!, {
      headers: { authorization: 'Bearer secret' },
      body,
    });
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  }
});

test('example routes map service failures to canonical 500', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';

  const create = captureRoutes({ createThrows: true, userData: {} });
  const createRes = await invoke(create.routes.get('/api/users/me/example-worries')!, {
    headers: { authorization: 'Bearer token' },
    body: {},
  });
  assert.equal(createRes.statusCode, 500);
  assert.equal((createRes.body as { error: { code: string } }).error.code, 'transaction_aborted');

  const job = captureRoutes({ jobThrows: true });
  const jobRes = await invoke(job.routes.get('/api/internal/create-example-feedbacks')!, {
    headers: { authorization: 'Bearer secret' },
    body: {},
  });
  assert.equal(jobRes.statusCode, 500);
  assert.equal((jobRes.body as { error: { code: string } }).error.code, 'transaction_aborted');
});
