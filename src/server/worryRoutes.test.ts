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
