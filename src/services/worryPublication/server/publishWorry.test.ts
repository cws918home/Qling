import test from 'node:test';
import assert from 'node:assert/strict';
import { publishWorryOnServer } from './publishWorry';
import type {
  InitialWorryPublicationRepository,
  ModerationLogWriteModel,
  Phase1HumanCandidate,
} from './types';

function createFakeDb() {
  const pushLogs: unknown[] = [];
  return {
    pushLogs,
    collection(name: string) {
      if (name === 'pushLogs') {
        return { add: async (data: unknown) => pushLogs.push(data) };
      }
      return {
        doc() {
          return {
            collection() {
              return { get: async () => ({ empty: true, docs: [] }) };
            },
          };
        },
      };
    },
  };
}

function candidate(uid: string, interests = ['취업']): Phase1HumanCandidate {
  return {
    uid,
    gender: 'female',
    interests,
    helpedCount: 0,
    activeDeliveryCount: 0,
  };
}

function createFakeRepository(candidates: Phase1HumanCandidate[]): InitialWorryPublicationRepository & {
  moderationLogs: ModerationLogWriteModel[];
  commits: number;
} {
  return {
    moderationLogs: [],
    commits: 0,
    createIds: () => ({
      worryId: 'worry1',
      batchId: 'batch1',
      moderationLogId: 'mod1',
    }),
    fetchRecipientCandidates: async () => candidates,
    commitRejectedWorryModeration: async ({ moderationLog }) => {
      (repo.moderationLogs as ModerationLogWriteModel[]).push(moderationLog);
      return { moderationLogId: moderationLog.id, targetId: moderationLog.targetId };
    },
    commitInitialWorryPublication: async params => {
      repo.commits += 1;
      assert.equal(params.worry.id, 'worry1');
      assert.equal(params.batch.batchRound, 0);
      assert.equal(params.deliveries.length, 5);
      assert.deepEqual(params.deliveries.map(d => d.id), params.deliveries.map(d => `worry1_${d.recipientUid}`));
      assert.ok(params.deliveries.every(d => d.authorGenderSnapshot === 'female'));
      return {
        worryId: params.worry.id,
        deliveryIds: params.deliveries.map(d => d.id),
        moderationLogId: params.moderationLog.id,
      };
    },
  } as InitialWorryPublicationRepository & {
    moderationLogs: ModerationLogWriteModel[];
    commits: number;
  };
}

let repo: ReturnType<typeof createFakeRepository>;

test('happy path creates canonical worry batch deliveries and moderation log', async () => {
  repo = createFakeRepository(['a', 'b', 'c', 'd', 'e', 'f'].map(uid => candidate(uid)));
  const result = await publishWorryOnServer({
    db: createFakeDb() as never,
    messaging: null,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: '  고민  ',
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    repository: repo,
    random: () => 0.1,
  });

  assert.equal(result.status, 'published');
  if (result.status !== 'published') return;
  assert.equal(result.deliveryIds.length, 5);
  assert.equal(repo.commits, 1);
});

test('rejected moderation creates moderation log only with generated target id', async () => {
  repo = createFakeRepository(['a', 'b', 'c', 'd', 'e'].map(uid => candidate(uid)));
  const result = await publishWorryOnServer({
    db: createFakeDb() as never,
    messaging: null,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: 'reject me',
    moderationProvider: async () => ({ status: 'rejected', reason: 'spam' }),
    repository: repo,
  });

  assert.equal(result.status, 'rejected');
  assert.equal(repo.commits, 0);
  assert.equal(repo.moderationLogs.length, 1);
  assert.equal(repo.moderationLogs[0].targetId, 'worry1');
});

test('invalid provider output after retry creates no core publication state', async () => {
  repo = createFakeRepository(['a', 'b', 'c', 'd', 'e'].map(uid => candidate(uid)));
  const result = await publishWorryOnServer({
    db: createFakeDb() as never,
    messaging: null,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: 'content',
    moderationProvider: async () => ({ nope: true }),
    repository: repo,
  });

  assert.equal(result.status, 'provider_error');
  assert.equal(repo.commits, 0);
  assert.equal(repo.moderationLogs.length, 0);
});

test('fewer than 5 eligible humans fails before writes', async () => {
  repo = createFakeRepository(['a', 'b', 'c', 'd'].map(uid => candidate(uid)));
  const result = await publishWorryOnServer({
    db: createFakeDb() as never,
    messaging: null,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: 'content',
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    repository: repo,
  });

  assert.equal(result.status, 'server_error');
  assert.equal(repo.commits, 0);
});
