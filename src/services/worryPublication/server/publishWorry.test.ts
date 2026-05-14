import test from 'node:test';
import assert from 'node:assert/strict';
import { publishWorryOnServer } from './publishWorry';
import type {
  InitialWorryPublicationRepository,
  CommittedInitialWorryPublication,
  DeliveryBatchWriteModel,
  DeliveryWriteModel,
  ModerationLogWriteModel,
  Phase1HumanCandidate,
  WorryWriteModel,
} from './types';

function createFakeDb(options: {
  tokenDocsByUid?: Record<string, Array<{ id: string; token: string }>>;
  onPushLog?: (data: unknown) => void;
} = {}) {
  const pushLogs: unknown[] = [];
  return {
    pushLogs,
    collection(name: string) {
      if (name === 'pushLogs') {
        return { add: async (data: unknown) => {
          options.onPushLog?.(data);
          pushLogs.push(data);
        } };
      }
      return {
        doc(uid?: string) {
          return {
            get: async () => ({ exists: true, data: () => ({}) }),
            collection(collectionName: string) {
              assert.equal(collectionName, 'fcmTokens');
              const tokenDocs = uid ? (options.tokenDocsByUid?.[uid] ?? []) : [];
              return {
                get: async () => ({
                  empty: tokenDocs.length === 0,
                  docs: tokenDocs.map(tokenDoc => ({
                    id: tokenDoc.id,
                    data: () => ({ token: tokenDoc.token }),
                    ref: { delete: async () => undefined },
                  })),
                }),
              };
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
  lastCommit?: {
    worry: WorryWriteModel;
    batch: DeliveryBatchWriteModel;
    deliveries: DeliveryWriteModel[];
    selectedRecipientUids: string[];
  };
} {
  return {
    moderationLogs: [],
    commits: 0,
    createIds: () => ({
      worryId: 'worry1',
      batchId: 'batch1',
      moderationLogId: 'mod1',
    }),
    fetchRecipientCandidates: async params => {
      assert.equal(params.authorUid, 'author');
      assert.equal(params.minimumCandidateCount, 5);
      return candidates;
    },
    commitRejectedWorryModeration: async ({ moderationLog }) => {
      (repo.moderationLogs as ModerationLogWriteModel[]).push(moderationLog);
      return { moderationLogId: moderationLog.id, targetId: moderationLog.targetId };
    },
    commitInitialWorryPublication: async params => {
      repo.commits += 1;
      repo.lastCommit = {
        worry: params.worry,
        batch: params.batch,
        deliveries: params.deliveries,
        selectedRecipientUids: params.selectedRecipientUids,
      };
      assert.equal(params.worry.id, 'worry1');
      assert.equal(params.batch.batchRound, 0);
      assert.equal(params.worry.initialDeliveryTargetCount, 5);
      assert.equal(params.worry.humanDeliveryLimit, 15);
      assert.equal(params.worry.humanDeliveryCount, params.deliveries.length);
      assert.equal(params.batch.targetCount, 5);
      assert.equal(params.batch.createdCount, params.deliveries.length);
      assert.equal(params.batch.matchedCount, params.deliveries.filter(delivery => delivery.selectionType === 'matched').length);
      assert.equal(params.batch.randomCount, params.deliveries.filter(delivery => delivery.selectionType === 'random').length);
      assert.deepEqual(params.deliveries.map(d => d.id), params.deliveries.map(d => `worry1_${d.recipientUid}`));
      assert.ok(params.deliveries.every(d => d.authorGenderSnapshot === 'female'));
      return {
        worryId: params.worry.id,
        deliveryIds: params.deliveries.map(d => d.id),
        moderationLogId: params.moderationLog.id,
      } satisfies CommittedInitialWorryPublication;
    },
  } as InitialWorryPublicationRepository & {
    moderationLogs: ModerationLogWriteModel[];
    commits: number;
    lastCommit?: {
      worry: WorryWriteModel;
      batch: DeliveryBatchWriteModel;
      deliveries: DeliveryWriteModel[];
      selectedRecipientUids: string[];
    };
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
  assert.equal(repo.lastCommit?.batch.matchedCount, 4);
  assert.equal(repo.lastCommit?.batch.randomCount, 1);
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

test('0 eligible humans still publishes worry batch and no deliveries or push work', async () => {
  repo = createFakeRepository([]);
  const db = createFakeDb();
  const result = await publishWorryOnServer({
    db: db as never,
    messaging: null,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: 'content',
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    repository: repo,
  });

  assert.equal(result.status, 'published');
  assert.deepEqual(result.status === 'published' ? result.deliveryIds : [], []);
  assert.equal(repo.commits, 1);
  assert.equal(repo.lastCommit?.worry.humanDeliveryCount, 0);
  assert.equal(repo.lastCommit?.worry.lastDeliveryCreatedAt, repo.lastCommit?.worry.createdAt);
  assert.equal(repo.lastCommit?.batch.createdCount, 0);
  assert.equal(repo.lastCommit?.batch.matchedCount, 0);
  assert.equal(repo.lastCommit?.batch.randomCount, 0);
  assert.deepEqual(repo.lastCommit?.selectedRecipientUids, []);
  assert.equal(db.pushLogs.length, 0);
});

test('1 and 4 eligible humans publish actual matched delivery counts', async () => {
  for (const count of [1, 4]) {
    repo = createFakeRepository(['a', 'b', 'c', 'd'].slice(0, count).map(uid => candidate(uid)));
    const result = await publishWorryOnServer({
      db: createFakeDb() as never,
      messaging: null,
      author: { uid: 'author', gender: 'female', interests: ['취업'] },
      content: 'content',
      moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
      repository: repo,
    });

    assert.equal(result.status, 'published');
    assert.equal(result.status === 'published' ? result.deliveryIds.length : 0, count);
    assert.equal(repo.lastCommit?.worry.humanDeliveryCount, count);
    assert.equal(repo.lastCommit?.batch.createdCount, count);
    assert.equal(repo.lastCommit?.batch.matchedCount, count);
    assert.equal(repo.lastCommit?.batch.randomCount, 0);
  }
});

test('push logs run only after core transaction commit', async () => {
  repo = createFakeRepository(['a', 'b', 'c', 'd', 'e', 'f'].map(uid => candidate(uid)));
  const db = createFakeDb({
    onPushLog: () => {
      assert.equal(repo.commits, 1);
    },
  });

  const result = await publishWorryOnServer({
    db: db as never,
    messaging: null,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: 'content',
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    repository: repo,
    random: () => 0.1,
  });

  assert.equal(result.status, 'published');
  assert.equal(db.pushLogs.length, 5);
});

test('push logs run only for actual partial deliveries', async () => {
  repo = createFakeRepository(['a', 'b', 'c', 'd'].map(uid => candidate(uid)));
  const db = createFakeDb();

  const result = await publishWorryOnServer({
    db: db as never,
    messaging: null,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: 'content',
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    repository: repo,
  });

  assert.equal(result.status, 'published');
  assert.equal(db.pushLogs.length, 4);
});

test('push failure does not roll back core publication result', async () => {
  repo = createFakeRepository(['a', 'b', 'c', 'd', 'e', 'f'].map(uid => candidate(uid)));
  const db = createFakeDb({
    tokenDocsByUid: {
      a: [{ id: 'token-a', token: 'token-a' }],
      b: [{ id: 'token-b', token: 'token-b' }],
      c: [{ id: 'token-c', token: 'token-c' }],
      d: [{ id: 'token-d', token: 'token-d' }],
      e: [{ id: 'token-e', token: 'token-e' }],
    },
  });

  const result = await publishWorryOnServer({
    db: db as never,
    messaging: {
      send: async () => {
        throw new Error('push down');
      },
    } as never,
    author: { uid: 'author', gender: 'female', interests: ['취업'] },
    content: 'content',
    moderationProvider: async () => ({ status: 'approved', categories: ['취업'] }),
    repository: repo,
    random: () => 0.1,
  });

  assert.equal(result.status, 'published');
  assert.equal(repo.commits, 1);
  assert.equal(db.pushLogs.every(log => (log as { status: string }).status === 'failed'), true);
});
