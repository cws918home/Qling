import { createExampleWorriesFirestoreRepository } from './firestoreRepository';
import type { CreateDueExampleFeedbacksParams, CreateDueExampleFeedbacksResult } from './types';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function createDueExampleFeedbacks(
  params: CreateDueExampleFeedbacksParams = {}
): Promise<CreateDueExampleFeedbacksResult> {
  if (!params.repository && !params.db) {
    return {
      status: 'server_error',
      code: 'firebase_unavailable',
      message: 'Firebase Admin is not initialized.',
    };
  }

  const now = params.now ?? new Date();
  const limit = Math.max(1, Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
  const repository = params.repository ?? createExampleWorriesFirestoreRepository({ db: params.db! });

  try {
    const jobs = await repository.listDueFeedbackJobs({ now, limit });
    const results = [];
    for (const job of jobs) {
      results.push(await repository.processFeedbackJob({ jobId: job.id, now }));
    }
    return {
      status: 'completed',
      checkedCount: jobs.length,
      completedCount: results.filter(result => result.status === 'completed' || result.status === 'idempotent').length,
      skippedCount: results.filter(result => result.status === 'skipped').length,
      failedCount: results.filter(result => result.status === 'failed').length,
      results,
    };
  } catch (error) {
    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: 'Example feedback job failed.',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
