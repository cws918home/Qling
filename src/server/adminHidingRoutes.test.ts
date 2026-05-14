import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAdminHidingRoutes } from './adminHidingRoutes';

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
      assert.equal(path, '/api/internal/admin/hide-content');
      handlers.push(...routeHandlers);
    },
  };

  registerAdminHidingRoutes(app as never, {
    db: (options.db === undefined ? {} : options.db) as never,
    service: {
      hideContent: async params => {
        capturedParams = params;
        if (options.serviceThrows) throw new Error('firestore down');
        return (options.serviceResult ?? {
          status: 'hidden',
          targetType: params.targetType,
          targetId: params.targetId,
          alreadyHidden: false,
          counterDecremented: params.targetType === 'delivery',
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

test('admin hide route rejects missing malformed and invalid internal auth', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const cases = [
    [{ headers: {}, body: validBody('worry') }, 401, 'auth_missing'],
    [{ headers: { authorization: 'Basic secret' }, body: validBody('worry') }, 401, 'auth_malformed'],
    [{ headers: { authorization: 'Bearer wrong' }, body: validBody('worry') }, 403, 'auth_invalid'],
  ] as const;

  for (const [req, statusCode, code] of cases) {
    const route = captureRoute();
    const res = await invoke(route, req);
    assert.equal(res.statusCode, statusCode);
    assert.equal((res.body as { error: { code: string } }).error.code, code);
    assert.equal(route.capturedParams(), null);
  }
});

test('admin hide route rejects unsafe or unknown request fields', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  for (const body of [
    null,
    [],
    'x',
    {},
    { ...validBody('worry'), extra: true },
    { ...validBody('worry'), targetType: 'user' },
    { ...validBody('worry'), targetId: '' },
    { ...validBody('worry'), hiddenReason: '' },
    { ...validBody('worry'), hiddenBy: '' },
  ]) {
    const route = captureRoute();
    const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body });
    assert.equal(res.statusCode, 400);
    assert.equal((res.body as { error: { code: string } }).error.code, 'invalid_body');
    assert.equal(route.capturedParams(), null);
  }
});

test('admin hide route delegates valid worry delivery and reply hides', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  for (const targetType of ['worry', 'delivery', 'reply'] as const) {
    const route = captureRoute();
    const body = validBody(targetType);
    const res = await invoke(route, { headers: { authorization: 'Bearer secret' }, body });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      status: 'hidden',
      targetType,
      targetId: `${targetType}1`,
      alreadyHidden: false,
      counterDecremented: targetType === 'delivery',
    });
    assert.deepEqual(route.capturedParams(), {
      db: {},
      targetType,
      targetId: `${targetType}1`,
      hiddenReason: 'policy',
      hiddenBy: 'operator',
    });
  }
});

test('admin hide route exposes stable alreadyHidden and counterDecremented response fields', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const route = captureRoute({
    serviceResult: {
      status: 'hidden',
      targetType: 'delivery',
      targetId: 'delivery1',
      alreadyHidden: true,
      counterDecremented: false,
    },
  });
  const res = await invoke(route, {
    headers: { authorization: 'Bearer secret' },
    body: validBody('delivery'),
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    status: 'hidden',
    targetType: 'delivery',
    targetId: 'delivery1',
    alreadyHidden: true,
    counterDecremented: false,
  });
});

test('admin hide route maps firebase unavailable and service failures', async () => {
  process.env.INTERNAL_JOB_SECRET = 'secret';
  const unavailable = captureRoute({ db: null });
  const unavailableRes = await invoke(unavailable, { headers: { authorization: 'Bearer secret' }, body: validBody('worry') });
  assert.equal(unavailableRes.statusCode, 503);
  assert.equal((unavailableRes.body as { error: { code: string } }).error.code, 'firebase_unavailable');

  const failing = captureRoute({ serviceThrows: true });
  const failingRes = await invoke(failing, { headers: { authorization: 'Bearer secret' }, body: validBody('worry') });
  assert.equal(failingRes.statusCode, 500);
  assert.equal((failingRes.body as { error: { code: string } }).error.code, 'transaction_aborted');
});

function validBody(targetType: 'worry' | 'delivery' | 'reply') {
  return {
    targetType,
    targetId: `${targetType}1`,
    hiddenReason: 'policy',
    hiddenBy: 'operator',
  };
}
