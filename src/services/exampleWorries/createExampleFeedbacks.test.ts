import test from 'node:test';
import assert from 'node:assert/strict';
import { createDueExampleFeedbacks } from './createExampleFeedbacks';
import type { ExampleFeedbackJobResult, ExampleWorriesRepository } from './types';

function createRepo(results: ExampleFeedbackJobResult[]) {
  const processed: string[] = [];
  const repo: ExampleWorriesRepository = {
    readUserProfile: async () => null,
    listSelectableSeeds: async () => [],
    createExamplesOnce: async params => ({ status: 'created', uid: params.uid, worryIds: [], deliveryIds: [], seedIds: [] }),
    listDueFeedbackJobs: async () => results.map(result => ({ id: result.jobId, replyId: result.replyId })),
    processFeedbackJob: async ({ jobId }) => {
      processed.push(jobId);
      return results.find(result => result.jobId === jobId)!;
    },
  };
  return { repo, processed };
}

test('processes due jobs and reports completed skipped and failed status counts', async () => {
  const { repo, processed } = createRepo([
    { jobId: 'reply1', replyId: 'reply1', status: 'completed', feedbackId: 'reply1' },
    { jobId: 'reply2', replyId: 'reply2', status: 'idempotent', feedbackId: 'reply2' },
    { jobId: 'reply3', replyId: 'reply3', status: 'skipped', reason: 'feedback_conflict' },
    { jobId: 'reply4', replyId: 'reply4', status: 'failed', reason: 'boom' },
  ]);

  const result = await createDueExampleFeedbacks({
    repository: repo,
    now: new Date('2026-05-13T00:00:00.000Z'),
    limit: 10,
  });

  assert.equal(result.status, 'completed');
  assert.deepEqual(processed, ['reply1', 'reply2', 'reply3', 'reply4']);
  assert.equal(result.status === 'completed' ? result.completedCount : 0, 2);
  assert.equal(result.status === 'completed' ? result.skippedCount : 0, 1);
  assert.equal(result.status === 'completed' ? result.failedCount : 0, 1);
});

test('repeated deterministic job execution is surfaced as idempotent, not duplicate work', async () => {
  const { repo } = createRepo([
    { jobId: 'reply1', replyId: 'reply1', status: 'idempotent', feedbackId: 'reply1' },
  ]);

  const result = await createDueExampleFeedbacks({ repository: repo });

  assert.equal(result.status, 'completed');
  assert.equal(result.status === 'completed' ? result.completedCount : 0, 1);
  assert.equal(result.status === 'completed' ? result.results[0].status : '', 'idempotent');
});
