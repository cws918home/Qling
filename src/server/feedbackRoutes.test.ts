import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFeedbackRoutes } from './feedbackRoutes';

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

function captureRoute(options: {
  userData?: Record<string, unknown>;
  verifyIdToken?: () => Promise<{ uid: string }>;
  result?: unknown;
} = {}) {
  const handlers: Array<(req: unknown, res: unknown, next: () => void) => unknown> = [];
  let capturedParams: unknown = null;
  const app = {
    post(path: string, ...routeHandlers: typeof handlers) {
      assert.equal(path, '/api/replies/:replyId/feedback');
      handlers.push(...routeHandlers);
    },
  };

  registerFeedbackRoutes(app as never, {
    auth: {
      verifyIdToken: options.verifyIdToken ?? (async () => ({ uid: 'publisher' })),
    } as never,
    db: createDb(options.userData) as never,
    moderationProvider: async () => ({ status: 'approved' }),
    submit: async params => {
      capturedParams = params;
      return (options.result ?? { status: 'saved', feedbackId: params.replyId, helpedCountApplied: true }) as never;
    },
  });

  return { handlers, capturedParams: () => capturedParams };
}

test('feedback route uses verified publisher uid and ignores body ownership fields', async () => {
  const route = captureRoute({ userData: {} });
  const req = {
    headers: { authorization: 'Bearer token' },
    params: { replyId: 'reply-1' },
    body: {
      type: 'like',
      comment: 'thanks',
      publisherUid: 'attacker',
      authorUid: 'attacker',
      replierUid: 'attacker',
      worryId: 'other',
      deliveryId: 'other',
      helpedCountApplied: false,
      isForAiReply: true,
      isForExampleReply: true,
    },
  };
  const res = createRes();

  await route.handlers[0](req, res, () => undefined);
  await route.handlers[1](req, res, () => undefined);

  assert.equal(res.statusCode, 200);
  const captured = route.capturedParams() as Record<string, unknown>;
  assert.equal(typeof captured.db, 'object');
  assert.equal(typeof captured.moderationProvider, 'function');
  assert.deepEqual({
    publisherUid: captured.publisherUid,
    replyId: captured.replyId,
    type: captured.type,
    comment: captured.comment,
  }, {
    publisherUid: 'publisher',
    replyId: 'reply-1',
    type: 'like',
    comment: 'thanks',
  });
});

test('feedback route maps missing and invalid auth before submit', async () => {
  const missing = captureRoute();
  const missingRes = createRes();
  await missing.handlers[0]({ headers: {}, params: {}, body: {} } as never, missingRes as never, () => undefined);
  assert.equal(missingRes.statusCode, 401);
  assert.equal(missing.capturedParams(), null);

  const invalid = captureRoute({
    verifyIdToken: async () => { throw new Error('bad'); },
  });
  const invalidRes = createRes();
  await invalid.handlers[0]({ headers: { authorization: 'Bearer bad' }, params: {}, body: {} } as never, invalidRes as never, () => undefined);
  assert.equal(invalidRes.statusCode, 401);
  assert.equal(invalid.capturedParams(), null);
});

test('feedback route blocks deleted user but allows missing deleted field', async () => {
  const deleted = captureRoute({ userData: { deleted: true } });
  const deletedRes = createRes();
  await deleted.handlers[0]({ headers: { authorization: 'Bearer token' }, params: {}, body: {} } as never, deletedRes as never, () => undefined);
  assert.equal(deletedRes.statusCode, 403);
  assert.equal(deleted.capturedParams(), null);

  const active = captureRoute({ userData: {} });
  const activeRes = createRes();
  let nextCalled = false;
  await active.handlers[0]({ headers: { authorization: 'Bearer token' }, params: {}, body: {} } as never, activeRes as never, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('feedback route returns firebase unavailable when Admin db is absent', async () => {
  const handlers: Array<(req: unknown, res: unknown) => unknown> = [];
  registerFeedbackRoutes({
    post(path: string, handler: (req: unknown, res: unknown) => unknown) {
      assert.equal(path, '/api/replies/:replyId/feedback');
      handlers.push(handler);
    },
  } as never, {
    auth: {} as never,
    db: null,
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
