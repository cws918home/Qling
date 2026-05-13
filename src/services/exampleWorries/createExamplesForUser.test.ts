import test from 'node:test';
import assert from 'node:assert/strict';
import { createExamplesForUser } from './createExamplesForUser';
import type { ExampleWorriesRepository, SelectedExampleSeed } from './types';

function createRepo(options: {
  stateExists?: boolean;
  interests?: string[];
  throwOnCommit?: boolean;
} = {}) {
  const commits: Array<{ uid: string; seeds: SelectedExampleSeed[] }> = [];
  const repo: ExampleWorriesRepository = {
    readUserProfile: async uid => ({
      uid,
      interests: options.interests ?? ['career'],
      exampleWorriesCreatedAt: options.stateExists ? new Date() : undefined,
      exampleWorrySeedIds: options.stateExists ? ['seed1'] : undefined,
      exampleDeliveryIds: options.stateExists ? ['delivery1'] : undefined,
    }),
    listSelectableSeeds: async () => [
      { id: 'seed1', content: 'one', categories: ['career'], status: 'active' },
      { id: 'seed2', content: 'two', categories: ['career'], status: 'active' },
      { id: 'seed3', content: 'three', categories: ['career'], status: 'active' },
      { id: 'seed4', content: 'four', categories: ['career'], status: 'active' },
      { id: 'seed5', content: 'five', categories: ['career'], status: 'active' },
      { id: 'seed6', content: 'six', categories: ['career'], status: 'active' },
      { id: 'inactive', content: 'off', categories: ['career'], status: 'inactive' },
    ],
    createExamplesOnce: async params => {
      commits.push({ uid: params.uid, seeds: params.seeds });
      if (options.throwOnCommit) throw new Error('boom');
      return {
        status: 'created',
        uid: params.uid,
        worryIds: params.seeds.map(seed => `example_${params.uid}_${seed.id}`),
        deliveryIds: params.seeds.map(seed => `example_${params.uid}_${seed.id}_${params.uid}`),
        seedIds: params.seeds.map(seed => seed.id),
      };
    },
    listDueFeedbackJobs: async () => [],
    processFeedbackJob: async () => ({ jobId: 'job', replyId: 'reply', status: 'skipped' }),
  };
  return { repo, commits };
}

test('creates examples once with max five matching active seeds', async () => {
  const { repo, commits } = createRepo();
  const result = await createExamplesForUser({ uid: 'user1', repository: repo });

  assert.equal(result.status, 'created');
  assert.deepEqual(result.status === 'created' ? result.seedIds : [], ['seed1', 'seed2', 'seed3', 'seed4', 'seed5']);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].seeds.length, 5);
});

test('repeated call and interest edits after creation are idempotent', async () => {
  const { repo, commits } = createRepo({ stateExists: true, interests: ['career', 'health'] });
  const result = await createExamplesForUser({ uid: 'user1', repository: repo });

  assert.equal(result.status, 'idempotent');
  assert.deepEqual(result.status === 'idempotent' ? result.seedIds : [], ['seed1']);
  assert.equal(commits.length, 0);
});

test('empty matching seeds writes completed empty state through repository', async () => {
  const { repo, commits } = createRepo({ interests: ['health'] });
  const result = await createExamplesForUser({ uid: 'user1', repository: repo });

  assert.equal(result.status, 'created');
  assert.deepEqual(result.status === 'created' ? result.seedIds : ['not-created'], []);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].seeds.length, 0);
});

test('commit failure returns error without pretending partial creation succeeded', async () => {
  const { repo } = createRepo({ throwOnCommit: true });
  const result = await createExamplesForUser({ uid: 'user1', repository: repo });

  assert.equal(result.status, 'server_error');
  assert.equal(result.status === 'server_error' ? result.code : '', 'transaction_aborted');
});
