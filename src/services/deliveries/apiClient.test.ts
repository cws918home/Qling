import test from 'node:test';
import assert from 'node:assert/strict';
import { passDeliveryViaApi } from './apiClient';

const user = {
  getIdToken: async () => 'token',
};

test('pass API client posts empty body to encoded delivery path', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  const result = await passDeliveryViaApi({
    user: user as never,
    deliveryId: 'delivery/one',
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body);
      return new Response(JSON.stringify({
        status: 'passed',
        deliveryId: 'delivery/one',
        replacementStatus: 'shortfall',
      }), { status: 200 });
    },
  });

  assert.equal(capturedUrl, '/api/deliveries/delivery%2Fone/pass');
  assert.equal(capturedBody, '{}');
  assert.deepEqual(result, {
    status: 'passed',
    deliveryId: 'delivery/one',
    replacementDeliveryId: undefined,
    replacementStatus: 'shortfall',
  });
});

test('pass API client maps error response', async () => {
  const result = await passDeliveryViaApi({
    user: user as never,
    deliveryId: 'd1',
    fetchImpl: async () => new Response(JSON.stringify({
      error: { code: 'delivery_not_active', message: 'conflict' },
    }), { status: 409 }),
  });

  assert.deepEqual(result, {
    status: 'failed',
    code: 'delivery_not_active',
    reason: 'conflict',
  });
});
