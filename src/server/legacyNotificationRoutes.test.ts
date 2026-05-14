import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyNotificationRoutes } from './legacyNotificationRoutes';

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

test('legacy notification routes are registered as non-success', async () => {
  const handlers = new Map<string, (req: unknown, res: ReturnType<typeof createRes>) => unknown>();
  const app = {
    post(path: string, handler: (req: unknown, res: ReturnType<typeof createRes>) => unknown) {
      handlers.set(path, handler);
    },
  };

  registerLegacyNotificationRoutes(app as never);

  for (const path of ['/api/notify-new-worry', '/api/notify-new-reply', '/api/notify-new-comment']) {
    const res = createRes();
    await handlers.get(path)?.({ body: { receiverUid: 'user', kind: 'comment' } }, res);
    assert.equal(res.statusCode, 410);
  }
});

test('comment notification route cannot send comment or dislike notifications', async () => {
  const handlers = new Map<string, (req: unknown, res: ReturnType<typeof createRes>) => unknown>();
  registerLegacyNotificationRoutes({
    post(path: string, handler: (req: unknown, res: ReturnType<typeof createRes>) => unknown) {
      handlers.set(path, handler);
    },
  } as never);

  const res = createRes();
  await handlers.get('/api/notify-new-comment')?.({
    body: { receiverUid: 'user', kind: 'dislike' },
  }, res);

  assert.equal(res.statusCode, 410);
  assert.equal((res.body as { error: { code: string } }).error.code, 'legacy_notification_route_disabled');
});
