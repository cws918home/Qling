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
