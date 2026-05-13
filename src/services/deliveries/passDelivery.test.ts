import test from 'node:test';
import assert from 'node:assert/strict';
import { passDelivery, validatePassBody } from './passDelivery';
import type { DeliveryPassRepository } from './types';

function pushDbWithToken() {
  const logs: Record<string, unknown>[] = [];
  return {
    logs,
    collection(name: string) {
      if (name === 'pushLogs') {
        return {
          async add(data: Record<string, unknown>) {
            logs.push(data);
            return { id: `log${logs.length}` };
          },
        };
      }
      return {
        doc() {
          return {
            collection() {
              return {
                async get() {
                  return {
                    empty: false,
                    docs: [{
                      id: 'token1',
                      data: () => ({ token: 'token1' }),
                    }],
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test('passDelivery returns success and records push warning when replacement push fails', async () => {
  const db = pushDbWithToken();
  let markParams: unknown = null;
  const repository: DeliveryPassRepository = {
    fetchReplacementScan: async () => ({
      candidates: [{ uid: 'replacement', interests: ['career'], activeDeliveryCount: 0 }],
      excludedUids: new Set(['author', 'passer']),
      existingHumanDeliveryCount: 1,
      replierUids: new Set(),
      author: { uid: 'author', gender: 'female' },
      matchingCategories: ['career'],
    }),
    commitPassDelivery: async ({ selectedRecipient }) => {
      assert.equal(selectedRecipient?.uid, 'replacement');
      return {
        status: 'passed',
        deliveryId: 'delivery1',
        replacementDeliveryId: 'worry1_replacement',
        replacementStatus: 'created',
        attemptId: 'delivery1',
        warnings: [],
      };
    },
    markReplacementPushResult: async params => {
      markParams = params;
    },
  };

  const result = await passDelivery({
    db: db as never,
    messaging: {
      send: async () => {
        throw new Error('push down');
      },
    } as never,
    uid: 'passer',
    deliveryId: 'delivery1',
    repository,
    random: () => 0,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.replacementStatus, 'created');
  assert.equal(db.logs[0]?.status, 'failed');
  assert.deepEqual(markParams, {
    attemptId: 'delivery1',
    status: 'failed',
    logIds: ['log1'],
    warnings: ['replacement_push_failed'],
  });
});

test('passDelivery tries ranked candidates until one commits or writes shortfall', async () => {
  const attempted: Array<string | null> = [];
  const repository: DeliveryPassRepository = {
    fetchReplacementScan: async () => ({
      candidates: [
        { uid: 'first', interests: ['career'], activeDeliveryCount: 0 },
        { uid: 'second', interests: ['career'], activeDeliveryCount: 0 },
      ],
      excludedUids: new Set(['author', 'passer']),
      existingHumanDeliveryCount: 1,
      replierUids: new Set(),
      author: { uid: 'author', gender: 'female' },
      matchingCategories: ['career'],
    }),
    commitPassDelivery: async ({ selectedRecipient }) => {
      attempted.push(selectedRecipient?.uid ?? null);
      if (selectedRecipient?.uid === 'first') return { status: 'candidate_unavailable' };
      return {
        status: 'passed',
        deliveryId: 'delivery1',
        replacementDeliveryId: 'worry1_second',
        replacementStatus: 'created',
        attemptId: 'delivery1',
        warnings: [],
      };
    },
    markReplacementPushResult: async () => undefined,
  };

  const result = await passDelivery({
    db: {
      collection: (name: string) => ({
        doc: () => ({
          collection: () => ({ get: async () => ({ empty: true, docs: [] }) }),
        }),
        add: async () => ({ id: `${name}-log` }),
      }),
    } as never,
    messaging: null,
    uid: 'passer',
    deliveryId: 'delivery1',
    repository,
    random: () => 0,
  });

  assert.equal(result.status, 'passed');
  assert.deepEqual(attempted, ['first', 'second']);
});

test('validatePassBody accepts absent or empty object and rejects non-empty non-object values', () => {
  assert.deepEqual(validatePassBody(undefined), { status: 'ok' });
  assert.deepEqual(validatePassBody({}), { status: 'ok' });

  for (const body of [{ uid: 'x' }, null, [], 'x', 1, false]) {
    assert.equal(validatePassBody(body).status, 'invalid');
  }
});
