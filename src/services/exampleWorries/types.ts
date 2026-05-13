import type { Firestore } from 'firebase-admin/firestore';

export type ServerTimestampValue = unknown;

export interface ExampleWorrySeed {
  id: string;
  content: string;
  categories: string[];
  status: 'active' | 'inactive';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SelectedExampleSeed extends ExampleWorrySeed {
  selectionIndex: number;
}

export interface ExampleWorryWriteModel {
  id: string;
  authorUid: 'example_author';
  content: string;
  refinedContent: string;
  categories: string[];
  rawCategories: string[];
  validCategories: string[];
  invalidCategories: string[];
  matchingCategories: string[];
  status: 'active';
  isExample: true;
  exampleSeedId: string;
  exampleOwnerUid: string;
  sourceSeedId: string;
  humanDeliveryLimit: 0;
  humanDeliveryCount: 0;
  humanReplyCount: 0;
  hasHumanReply: false;
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
}

export interface ExampleDeliveryWriteModel {
  id: string;
  worryId: string;
  recipientUid: string;
  authorUid: 'example_author';
  status: 'active';
  answeredAt: null;
  passedAt: null;
  answerableUntil: null;
  isExample: true;
  exampleSeedId: string;
  sourceSeedId: string;
  selectionType: 'example';
  batchId: string;
  batchRound: 0;
  slotIndex: number;
  matchOverlapCount: number;
  matchCategoriesSnapshot: string[];
  recipientInterestsSnapshot: string[];
  recipientGenderSnapshot: string | null;
  recipientHelpedCountSnapshot: number;
  authorGenderSnapshot: 'example';
  isAiRecipient: false;
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
}

export interface ExampleFeedbackJobWriteModel {
  id: string;
  kind: 'example_like';
  runAfter: ServerTimestampValue;
  status: 'scheduled' | 'completed' | 'failed' | 'skipped';
  replyId: string;
  targetUid: string;
  attempts: number;
  createdAt: ServerTimestampValue;
  updatedAt: ServerTimestampValue;
  completedAt?: ServerTimestampValue;
  error?: string | null;
  feedbackId?: string;
}

export type CreateExamplesForUserResult =
  | {
      status: 'created';
      uid: string;
      worryIds: string[];
      deliveryIds: string[];
      seedIds: string[];
    }
  | {
      status: 'idempotent';
      uid: string;
      worryIds: string[];
      deliveryIds: string[];
      seedIds: string[];
    }
  | {
      status: 'server_error';
      code: 'firebase_unavailable' | 'profile_missing' | 'transaction_aborted';
      message: string;
      details?: unknown;
    };

export interface ExampleFeedbackJobResult {
  jobId: string;
  replyId: string;
  status: 'completed' | 'idempotent' | 'skipped' | 'failed';
  feedbackId?: string;
  reason?: string;
}

export type CreateDueExampleFeedbacksResult =
  | {
      status: 'completed';
      checkedCount: number;
      completedCount: number;
      skippedCount: number;
      failedCount: number;
      results: ExampleFeedbackJobResult[];
    }
  | {
      status: 'server_error';
      code: 'firebase_unavailable' | 'transaction_aborted';
      message: string;
      details?: unknown;
    };

export interface ExampleUserProfile {
  uid: string;
  interests: string[];
  gender?: string | null;
  helpedCount?: number;
}

export interface ExampleCreationState {
  exampleWorriesCreatedAt?: unknown;
  exampleWorrySeedIds?: string[];
  exampleDeliveryIds?: string[];
}

export interface ExampleWorriesRepository {
  readUserProfile(uid: string): Promise<(ExampleUserProfile & ExampleCreationState) | null>;
  listSelectableSeeds(): Promise<ExampleWorrySeed[]>;
  createExamplesOnce(params: {
    uid: string;
    seeds: SelectedExampleSeed[];
    now: Date;
  }): Promise<Extract<CreateExamplesForUserResult, { status: 'created' | 'idempotent' }>>;
  listDueFeedbackJobs(params: {
    now: Date;
    limit: number;
  }): Promise<Array<{ id: string; replyId: string }>>;
  processFeedbackJob(params: {
    jobId: string;
    now: Date;
  }): Promise<ExampleFeedbackJobResult>;
}

export interface CreateExamplesForUserParams {
  uid: string;
  db?: Firestore | null;
  repository?: ExampleWorriesRepository;
  now?: Date;
}

export interface CreateDueExampleFeedbacksParams {
  now?: Date;
  limit?: number;
  db?: Firestore | null;
  repository?: ExampleWorriesRepository;
}
