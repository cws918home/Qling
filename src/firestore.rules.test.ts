import test, { after, before, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

let testEnv: RulesTestEnvironment;

const projectId = 'demo-qling-rules';
const rules = fs.readFileSync('firestore.rules', 'utf8');

const safeProfile = (uid: string) => ({
  uid,
  gender: 'female',
  interests: ['career'],
  createdAt: new Date(),
  lastActive: new Date(),
});

const tokenDoc = {
  token: 'token-1',
  platform: 'web',
  userAgent: 'rules-test',
  instanceId: 'instance-1',
  notificationPermission: 'granted',
  isInstalledPWA: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const replyLetter = {
  senderId: 'recipient',
  receiverId: 'author',
  originalContent: 'reply',
  refinedContent: 'reply',
  type: 'reply',
  replyTo: 'legacy-worry',
  replyToContent: 'worry',
  createdAt: new Date(),
  isRead: false,
  feedback: null,
};

const prdReply = {
  deliveryId: 'worry1_recipient',
  worryId: 'worry1',
  authorUid: 'author',
  replierUid: 'recipient',
  content: 'reply',
  status: 'active',
  moderationLogId: 'mod1',
  createdAt: new Date(),
  updatedAt: new Date(),
  isAiGenerated: false,
  isExampleReply: false,
};

const likeFeedback = {
  replyId: 'worry1_recipient',
  worryId: 'worry1',
  deliveryId: 'worry1_recipient',
  publisherUid: 'author',
  replierUid: 'recipient',
  type: 'like',
  comment: 'thanks',
  commentVisibility: 'replier',
  commentModerationLogId: 'mod-feedback-1',
  helpedCountApplied: true,
  isForAiReply: false,
  isForExampleReply: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const dislikeFeedback = {
  ...likeFeedback,
  type: 'dislike',
  comment: 'private',
  commentVisibility: 'admin_only',
};

const deliveryReadState = {
  deliveryId: 'worry1_recipient',
  worryId: 'worry1',
  recipientUid: 'recipient',
  readAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const replyReadState = {
  replyId: 'worry1_recipient',
  worryId: 'worry1',
  authorUid: 'author',
  readByAuthorAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const rulesTestsEnabled = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

function dbFor(uid?: string) {
  return uid
    ? testEnv.authenticatedContext(uid).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await context.firestore().doc(path).set(data);
  });
}

async function seedBaseUsers() {
  await seed('users/author', safeProfile('author'));
  await seed('users/recipient', safeProfile('recipient'));
  await seed('users/other', safeProfile('other'));
}

if (!rulesTestsEnabled) {
  test('Firestore rules tests require firebase emulators:exec', { skip: true }, () => {});
}

if (rulesTestsEnabled) {
before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe('profile and token transition', () => {
  test('first-time own profile create succeeds with safe fields', async () => {
    await assertSucceeds(dbFor('author').doc('users/author').set(safeProfile('author')));
  });

  test('own profile create fails when helpedCount is included', async () => {
    await assertFails(dbFor('author').doc('users/author').set({
      ...safeProfile('author'),
      helpedCount: 0,
    }));
  });

  test('own profile create fails when activeDeliveryCount is included', async () => {
    await assertFails(dbFor('author').doc('users/author').set({
      ...safeProfile('author'),
      activeDeliveryCount: 0,
    }));
  });

  test('own profile create fails when deleted or example state is included', async () => {
    await assertFails(dbFor('author').doc('users/author').set({
      ...safeProfile('author'),
      deleted: false,
    }));
    await assertFails(dbFor('author').doc('users/author').set({
      ...safeProfile('author'),
      exampleWorrySeedIds: [],
    }));
  });

  test('own profile update succeeds for allowed fields', async () => {
    await seed('users/author', safeProfile('author'));
    await assertSucceeds(dbFor('author').doc('users/author').update({
      interests: ['career', 'family'],
      lastActive: new Date(),
      lastTokenRefresh: new Date(),
    }));
  });

  test('safe update succeeds when existing activeDeliveryCount is preserved', async () => {
    await seed('users/recipient', {
      ...safeProfile('recipient'),
      activeDeliveryCount: 3,
    });

    await assertSucceeds(dbFor('recipient').doc('users/recipient').update({
      lastActive: new Date(),
    }));
  });

  test('safe update succeeds when existing helpedCount is preserved but changing it fails', async () => {
    await seed('users/author', {
      ...safeProfile('author'),
      helpedCount: 2,
    });

    await assertSucceeds(dbFor('author').doc('users/author').update({
      lastActive: new Date(),
    }));
    await assertFails(dbFor('author').doc('users/author').update({ helpedCount: 3 }));
  });

  test('own profile update fails for forbidden fields', async () => {
    await seed('users/author', safeProfile('author'));
    await assertFails(dbFor('author').doc('users/author').update({ helpedCount: 1 }));
    await assertFails(dbFor('author').doc('users/author').update({ activeDeliveryCount: 1 }));
    await assertFails(dbFor('author').doc('users/author').update({ deletedAt: new Date() }));
  });

  test('server-owned field protection rejects create update merge remove and delete', async () => {
    await assertFails(dbFor('author').doc('users/author').set({
      ...safeProfile('author'),
      activeDeliveryCount: 1,
    }));
    await assertFails(dbFor('author').doc('users/author').set({
      ...safeProfile('author'),
      helpedCount: 1,
    }));

    await seed('users/author', {
      ...safeProfile('author'),
      activeDeliveryCount: 1,
      helpedCount: 2,
    });
    await assertFails(dbFor('author').doc('users/author').update({ activeDeliveryCount: 2 }));
    await assertFails(dbFor('author').doc('users/author').update({ helpedCount: 3 }));
    await assertFails(dbFor('author').doc('users/author').set({ activeDeliveryCount: 2 }, { merge: true }));
    await assertFails(dbFor('author').doc('users/author').set({ helpedCount: 3 }, { merge: true }));
    await seed('users/recipient', safeProfile('recipient'));
    await assertFails(dbFor('recipient').doc('users/recipient').set({ activeDeliveryCount: 1 }, { merge: true }));
    await assertFails(dbFor('recipient').doc('users/recipient').set({ helpedCount: 1 }, { merge: true }));
    await assertFails(dbFor('author').doc('users/author').set({
      uid: 'author',
      gender: 'female',
      interests: ['career'],
      createdAt: new Date(),
      lastActive: new Date(),
      helpedCount: 2,
    }));
    await assertFails(dbFor('author').doc('users/author').set({
      uid: 'author',
      gender: 'female',
      interests: ['career'],
      createdAt: new Date(),
      lastActive: new Date(),
      activeDeliveryCount: 1,
    }));
    await assertFails(dbFor('author').doc('users/author').delete());
  });

  test('other-user and unauthenticated profile access fails', async () => {
    await seed('users/author', safeProfile('author'));
    await assertFails(dbFor('other').doc('users/author').get());
    await assertFails(dbFor('other').doc('users/author').update({ lastActive: new Date() }));
    await assertFails(dbFor().doc('users/author').get());
    await assertFails(dbFor().doc('users/author').set(safeProfile('author')));
  });

  test('owner can create read update delete own token', async () => {
    await seed('users/author', safeProfile('author'));
    const tokenRef = dbFor('author').doc('users/author/fcmTokens/token-1');
    await assertSucceeds(tokenRef.set(tokenDoc));
    await assertSucceeds(tokenRef.get());
    await assertSucceeds(tokenRef.update({ updatedAt: new Date() }));
    await assertSucceeds(tokenRef.delete());
  });

  test('other and unauthenticated users cannot use token surface', async () => {
    await seed('users/author', safeProfile('author'));
    await seed('users/author/fcmTokens/token-1', tokenDoc);
    await assertFails(dbFor('other').doc('users/author/fcmTokens/token-1').get());
    await assertFails(dbFor('other').doc('users/author/fcmTokens/token-2').set(tokenDoc));
    await assertFails(dbFor().doc('users/author/fcmTokens/token-1').get());
    await assertFails(dbFor().doc('users/author/fcmTokens/token-1').delete());
  });
});

describe('deleted transition', () => {
  test('deleted true user cannot update allowed surfaces', async () => {
    await seed('users/deletedUser', { ...safeProfile('deletedUser'), deleted: true });
    await assertFails(dbFor('deletedUser').doc('users/deletedUser').get());
    await assertFails(dbFor('deletedUser').doc('users/deletedUser').update({ lastActive: new Date() }));
    await assertFails(dbFor('deletedUser').doc('users/deletedUser/fcmTokens/token-1').set(tokenDoc));
  });

  test('missing deleted does not block transition user', async () => {
    await seed('users/missingDeletedUser', safeProfile('missingDeletedUser'));
    await assertSucceeds(dbFor('missingDeletedUser').doc('users/missingDeletedUser').get());
    await assertSucceeds(dbFor('missingDeletedUser').doc('users/missingDeletedUser').update({
      lastActive: new Date(),
    }));
    await assertSucceeds(dbFor('missingDeletedUser').doc('users/missingDeletedUser/fcmTokens/token-1').set(tokenDoc));
  });
});

describe('PRD source-of-truth rules', () => {
  test('worries create update delete denied', async () => {
    await seed('worries/worry1', { authorUid: 'author', content: 'worry' });
    await assertFails(dbFor('author').doc('worries/new').set({ authorUid: 'author' }));
    await assertFails(dbFor('author').doc('worries/worry1').update({ content: 'edited' }));
    await assertFails(dbFor('author').doc('worries/worry1').delete());
  });

  test('deliveries create update delete denied', async () => {
    await seed('deliveries/worry1_recipient', {
      worryId: 'worry1',
      recipientUid: 'recipient',
      authorUid: 'author',
      status: 'active',
    });
    await assertFails(dbFor('author').doc('deliveries/new').set({ recipientUid: 'recipient' }));
    await assertFails(dbFor('recipient').doc('deliveries/worry1_recipient').update({ status: 'answered' }));
    await assertFails(dbFor('recipient').doc('deliveries/worry1_recipient').update({ status: 'passed' }));
    await assertFails(dbFor('recipient').doc('deliveries/worry1_recipient').update({ passedAt: new Date() }));
    await assertFails(dbFor('recipient').doc('deliveries/worry1_recipient').update({ readAt: new Date() }));
    await assertFails(dbFor('recipient').doc('deliveries/worry1_recipient').delete());
  });

  test('deliveryBatches are denied for reads and writes', async () => {
    await seed('deliveryBatches/batch1', { worryId: 'worry1' });
    await assertFails(dbFor('author').doc('deliveryBatches/batch1').get());
    await assertFails(dbFor().doc('deliveryBatches/batch1').get());
    await assertFails(dbFor('author').doc('deliveryBatches/batch2').set({ worryId: 'worry1' }));
    await assertFails(dbFor('author').doc('deliveryBatches/batch1').update({ targetCount: 5 }));
    await assertFails(dbFor('author').doc('deliveryBatches/batch1').delete());
  });

  test('rematch operational collections are denied for reads and writes', async () => {
    await seed('jobLocks/rematchDueDeliveries', { ownerId: 'run1' });
    await seed('rematchRuns/run1', { status: 'completed' });
    await assertFails(dbFor('author').doc('jobLocks/rematchDueDeliveries').get());
    await assertFails(dbFor().doc('jobLocks/rematchDueDeliveries').get());
    await assertFails(dbFor('author').doc('jobLocks/rematchDueDeliveries').set({ ownerId: 'run2' }));
    await assertFails(dbFor('author').doc('jobLocks/rematchDueDeliveries').update({ ownerId: 'run2' }));
    await assertFails(dbFor('author').doc('jobLocks/rematchDueDeliveries').delete());
    await assertFails(dbFor('author').doc('rematchRuns/run1').get());
    await assertFails(dbFor().doc('rematchRuns/run1').get());
    await assertFails(dbFor('author').doc('rematchRuns/run2').set({ status: 'running' }));
    await assertFails(dbFor('author').doc('rematchRuns/run1').update({ status: 'failed' }));
    await assertFails(dbFor('author').doc('rematchRuns/run1').delete());
  });

  test('moderationLogs are denied for reads and writes', async () => {
    await seed('moderationLogs/log1', { targetType: 'worry' });
    await assertFails(dbFor('author').doc('moderationLogs/log1').get());
    await assertFails(dbFor().doc('moderationLogs/log1').get());
    await assertFails(dbFor('author').doc('moderationLogs/log2').set({ targetType: 'worry' }));
    await assertFails(dbFor('author').doc('moderationLogs/log1').update({ status: 'approved' }));
    await assertFails(dbFor('author').doc('moderationLogs/log1').delete());
  });

  test('pushLogs are denied for reads and writes', async () => {
    await seed('pushLogs/log1', { kind: 'new_worry' });
    await assertFails(dbFor('author').doc('pushLogs/log1').get());
    await assertFails(dbFor().doc('pushLogs/log1').get());
    await assertFails(dbFor('author').doc('pushLogs/log2').set({ kind: 'new_worry' }));
    await assertFails(dbFor('author').doc('pushLogs/log1').update({ status: 'sent' }));
    await assertFails(dbFor('author').doc('pushLogs/log1').delete());
  });

  test('passReplacementAttempts are denied for reads and writes', async () => {
    await seed('passReplacementAttempts/worry1_recipient', { passedDeliveryId: 'worry1_recipient' });
    await assertFails(dbFor('recipient').doc('passReplacementAttempts/worry1_recipient').get());
    await assertFails(dbFor().doc('passReplacementAttempts/worry1_recipient').get());
    await assertFails(dbFor('recipient').doc('passReplacementAttempts/new').set({ passedDeliveryId: 'new' }));
    await assertFails(dbFor('recipient').doc('passReplacementAttempts/worry1_recipient').update({ status: 'created' }));
    await assertFails(dbFor('recipient').doc('passReplacementAttempts/worry1_recipient').delete());
  });
});

describe('recipient and author reads', () => {
  beforeEach(async () => {
    await seedBaseUsers();
    await seed('worries/worry1', { authorUid: 'author', content: 'worry' });
    await seed('deliveries/worry1_recipient', {
      worryId: 'worry1',
      recipientUid: 'recipient',
      authorUid: 'author',
      status: 'active',
    });
  });

  test('recipient can read own delivery and worry through deterministic delivery', async () => {
    await assertSucceeds(dbFor('recipient').doc('deliveries/worry1_recipient').get());
    await assertSucceeds(dbFor('recipient').doc('worries/worry1').get());
  });

  test('author can read own worry', async () => {
    await assertSucceeds(dbFor('author').doc('worries/worry1').get());
  });

  test('non-recipient denial rejects delivery and worry', async () => {
    await assertFails(dbFor('other').doc('deliveries/worry1_recipient').get());
    await assertFails(dbFor('other').doc('worries/worry1').get());
  });

  test('unauthenticated cannot read delivery or worry', async () => {
    await assertFails(dbFor().doc('deliveries/worry1_recipient').get());
    await assertFails(dbFor().doc('worries/worry1').get());
  });

  test('deleted true recipient cannot read allowed surfaces', async () => {
    await seed('users/recipient', { ...safeProfile('recipient'), deleted: true });
    await assertFails(dbFor('recipient').doc('deliveries/worry1_recipient').get());
    await assertFails(dbFor('recipient').doc('worries/worry1').get());
  });
});

describe('server-owned replies rules', () => {
  beforeEach(async () => {
    await seedBaseUsers();
    await seed('users/deletedUser', { ...safeProfile('deletedUser'), deleted: true });
    await seed('users/missingDeletedUser', safeProfile('missingDeletedUser'));
    await seed('replies/worry1_recipient', prdReply);
    await seed('replies/worry1_missingDeletedUser', {
      ...prdReply,
      deliveryId: 'worry1_missingDeletedUser',
      replierUid: 'missingDeletedUser',
    });
    await seed('replies/worry1_deletedUser', {
      ...prdReply,
      deliveryId: 'worry1_deletedUser',
      replierUid: 'deletedUser',
    });
  });

  test('replier and worry author can read PRD reply', async () => {
    await assertSucceeds(dbFor('recipient').doc('replies/worry1_recipient').get());
    await assertSucceeds(dbFor('author').doc('replies/worry1_recipient').get());
  });

  test('other unauthenticated and deleted users cannot read PRD reply', async () => {
    await assertFails(dbFor('other').doc('replies/worry1_recipient').get());
    await assertFails(dbFor().doc('replies/worry1_recipient').get());
    await assertFails(dbFor('deletedUser').doc('replies/worry1_deletedUser').get());
  });

  test('missing deleted field does not block PRD reply read', async () => {
    await assertSucceeds(dbFor('missingDeletedUser').doc('replies/worry1_missingDeletedUser').get());
  });

  test('direct PRD reply create update and delete are denied', async () => {
    await assertFails(dbFor('recipient').doc('replies/new').set(prdReply));
    await assertFails(dbFor('recipient').doc('replies/worry1_recipient').update({ content: 'edited' }));
    await assertFails(dbFor('author').doc('replies/worry1_recipient').update({ readByAuthorAt: new Date() }));
    await assertFails(dbFor('recipient').doc('replies/worry1_recipient').delete());
    await assertFails(dbFor('author').doc('replies/worry1_recipient').update({ status: 'hidden' }));
  });
});

describe('private read-state rules', () => {
  beforeEach(async () => {
    await seedBaseUsers();
    await seed('users/recipient/deliveryReadStates/worry1_recipient', deliveryReadState);
    await seed('users/author/replyReadStates/worry1_recipient', replyReadState);
    await seed('deliveries/worry1_recipient', {
      worryId: 'worry1',
      recipientUid: 'recipient',
      authorUid: 'author',
      status: 'active',
    });
    await seed('replies/worry1_recipient', prdReply);
  });

  test('owner can read own private read-state docs', async () => {
    await assertSucceeds(dbFor('recipient').doc('users/recipient/deliveryReadStates/worry1_recipient').get());
    await assertSucceeds(dbFor('author').doc('users/author/replyReadStates/worry1_recipient').get());
  });

  test('opposite party and unauthenticated users cannot read private read-state docs', async () => {
    await assertFails(dbFor('author').doc('users/recipient/deliveryReadStates/worry1_recipient').get());
    await assertFails(dbFor('recipient').doc('users/author/replyReadStates/worry1_recipient').get());
    await assertFails(dbFor().doc('users/recipient/deliveryReadStates/worry1_recipient').get());
    await assertFails(dbFor().doc('users/author/replyReadStates/worry1_recipient').get());
  });

  test('owners cannot create update or delete private read-state docs from clients', async () => {
    await assertFails(dbFor('recipient').doc('users/recipient/deliveryReadStates/new').set(deliveryReadState));
    await assertFails(dbFor('recipient').doc('users/recipient/deliveryReadStates/worry1_recipient').update({ updatedAt: new Date() }));
    await assertFails(dbFor('recipient').doc('users/recipient/deliveryReadStates/worry1_recipient').delete());
    await assertFails(dbFor('author').doc('users/author/replyReadStates/new').set(replyReadState));
    await assertFails(dbFor('author').doc('users/author/replyReadStates/worry1_recipient').update({ updatedAt: new Date() }));
    await assertFails(dbFor('author').doc('users/author/replyReadStates/worry1_recipient').delete());
  });

  test('existing permitted delivery and reply reads still work', async () => {
    await assertSucceeds(dbFor('recipient').doc('deliveries/worry1_recipient').get());
    await assertSucceeds(dbFor('recipient').doc('replies/worry1_recipient').get());
    await assertSucceeds(dbFor('author').doc('replies/worry1_recipient').get());
  });
});

describe('Phase 4 mailbox manual-equivalent read paths', () => {
  beforeEach(async () => {
    await seedBaseUsers();
    await seed('worries/manual_worry', {
      authorUid: 'author',
      content: 'manual-equivalent worry',
      matchingCategories: ['career'],
      createdAt: new Date(),
      status: 'active',
      humanReplyCount: 1,
    });
    await seed('deliveries/manual_delivery', {
      worryId: 'manual_worry',
      recipientUid: 'recipient',
      authorUid: 'author',
      status: 'answered',
    });
    await seed('replies/manual_delivery', {
      deliveryId: 'manual_delivery',
      worryId: 'manual_worry',
      authorUid: 'author',
      replierUid: 'recipient',
      content: 'manual-equivalent reply',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      isAiGenerated: false,
      isExampleReply: false,
    });
  });

  test('author query sees newly published PRD worry in my-worries path', async () => {
    const snapshot = await assertSucceeds(
      dbFor('author')
        .collection('worries')
        .where('authorUid', '==', 'author')
        .get()
    );

    assert.deepEqual(snapshot.docs.map(doc => doc.id), ['manual_worry']);
  });

  test('author query sees PRD reply under selected authored worry', async () => {
    const snapshot = await assertSucceeds(
      dbFor('author')
        .collection('replies')
        .where('worryId', '==', 'manual_worry')
        .where('authorUid', '==', 'author')
        .get()
    );

    assert.deepEqual(snapshot.docs.map(doc => doc.id), ['manual_delivery']);
  });

  test('replier query sees own PRD written reply in given-replies path', async () => {
    const snapshot = await assertSucceeds(
      dbFor('recipient')
        .collection('replies')
        .where('replierUid', '==', 'recipient')
        .get()
    );

    assert.deepEqual(snapshot.docs.map(doc => doc.id), ['manual_delivery']);
  });
});

// Removing only the legacy letters allow block should fail only this suite, not
// the PRD source-of-truth suite above. The app runtime uses a named Firestore
// database, but this SDK version validates the same rules text against the
// default emulator database.
describe('legacy letters transition', () => {
  test('legacy worry create and legacy delete denied', async () => {
    await seedBaseUsers();
    await seed('letters/legacy-worry', {
      senderId: 'author',
      receiverId: 'recipient',
      type: 'worry',
      originalContent: 'worry',
      refinedContent: 'worry',
    });
    await assertFails(dbFor('author').doc('letters/new-worry').set({
      senderId: 'author',
      receiverId: 'recipient',
      type: 'worry',
      originalContent: 'worry',
      refinedContent: 'worry',
    }));
    await assertFails(dbFor('author').doc('letters/legacy-worry').delete());
  });

  test('legacy reply create allowed only for sender with expected fields', async () => {
    await seedBaseUsers();
    await assertSucceeds(dbFor('recipient').collection('letters').add(replyLetter));
    await assertFails(dbFor('other').collection('letters').add(replyLetter));
    await assertFails(dbFor('recipient').collection('letters').add({
      ...replyLetter,
      arbitrary: true,
    }));
  });

  test('legacy worry reads allow own sent own received and public fallback', async () => {
    await seedBaseUsers();
    await seed('letters/sent-worry', {
      senderId: 'author',
      receiverId: 'recipient',
      type: 'worry',
      originalContent: 'sent',
      refinedContent: 'sent',
    });
    await seed('letters/public-worry', {
      senderId: 'other',
      receiverId: 'public',
      type: 'worry',
      originalContent: 'public',
      refinedContent: 'public',
    });
    await assertSucceeds(dbFor('author').doc('letters/sent-worry').get());
    await assertSucceeds(dbFor('recipient').doc('letters/sent-worry').get());
    await assertSucceeds(dbFor('author').doc('letters/public-worry').get());
    await assertFails(dbFor('other').doc('letters/sent-worry').get());
  });

  test('legacy runtime query shapes are allowed without broad letters reads', async () => {
    await seedBaseUsers();
    await seed('letters/received-worry', {
      senderId: 'author',
      receiverId: 'recipient',
      type: 'worry',
      originalContent: 'received',
      refinedContent: 'received',
      createdAt: new Date(),
    });
    await seed('letters/public-worry', {
      senderId: 'other',
      receiverId: 'public',
      type: 'worry',
      originalContent: 'public',
      refinedContent: 'public',
      createdAt: new Date(),
    });
    await seed('letters/reply1', replyLetter);

    const recipientLetters = dbFor('recipient').collection('letters');
    await assertSucceeds(recipientLetters.where('type', '==', 'worry').where('receiverId', '==', 'recipient').get());
    await assertSucceeds(recipientLetters.where('type', '==', 'worry').where('receiverId', '==', 'public').get());
    await assertSucceeds(recipientLetters.where('type', '==', 'reply').where('senderId', '==', 'recipient').get());
    await assertSucceeds(dbFor('author').collection('letters').where('type', '==', 'reply').where('receiverId', '==', 'author').get());
    await assertSucceeds(dbFor('author').collection('letters').where('type', '==', 'worry').where('senderId', '==', 'author').get());
    await assertFails(recipientLetters.where('type', '==', 'worry').get());
  });

  test('own sent and received legacy reply reads allowed', async () => {
    await seedBaseUsers();
    await seed('letters/reply1', replyLetter);
    await assertSucceeds(dbFor('recipient').doc('letters/reply1').get());
    await assertSucceeds(dbFor('author').doc('letters/reply1').get());
    await assertFails(dbFor('other').doc('letters/reply1').get());
  });

  test('isRead update allowed only for recipient and exact changed key', async () => {
    await seedBaseUsers();
    await seed('letters/reply1', replyLetter);
    await assertSucceeds(dbFor('author').doc('letters/reply1').update({ isRead: true }));
    await assertFails(dbFor('recipient').doc('letters/reply1').update({ isRead: true }));
    await assertFails(dbFor('author').doc('letters/reply1').update({
      isRead: true,
      refinedContent: 'edited',
    }));
  });

  test('publisherComment update allowed only for receiver and exact changed key', async () => {
    await seedBaseUsers();
    await seed('letters/reply1', replyLetter);
    await assertSucceeds(dbFor('author').doc('letters/reply1').update({ publisherComment: 'thanks' }));
    await assertFails(dbFor('recipient').doc('letters/reply1').update({ publisherComment: 'thanks' }));
    await assertFails(dbFor('author').doc('letters/reply1').update({
      publisherComment: 'thanks',
      refinedContent: 'edited',
    }));
  });

  test('feedback update allowed only as legacy compatibility and exact changed key', async () => {
    await seedBaseUsers();
    await seed('letters/reply1', replyLetter);
    await assertSucceeds(dbFor('author').doc('letters/reply1').update({ feedback: 'helpful' }));
    await assertFails(dbFor('recipient').doc('letters/reply1').update({ feedback: 'helpful' }));
    await assertFails(dbFor('author').doc('letters/reply1').update({
      feedback: 'helpful',
      helpedCount: 1,
    }));
  });

  test('arbitrary legacy update denied', async () => {
    await seedBaseUsers();
    await seed('letters/reply1', replyLetter);
    await assertFails(dbFor('author').doc('letters/reply1').update({ refinedContent: 'edited' }));
  });
});

describe('reply feedback transition', () => {
  test('publisher feedback query allowed and hides dislike by read model contract', async () => {
    await seedBaseUsers();
    await seed('feedbacks/worry1_recipient', dislikeFeedback);

    await assertSucceeds(
      dbFor('author')
        .collection('feedbacks')
        .where('worryId', '==', 'worry1')
        .where('publisherUid', '==', 'author')
        .get()
    );
    await assertFails(
      dbFor('other')
        .collection('feedbacks')
        .where('worryId', '==', 'worry1')
        .where('publisherUid', '==', 'author')
        .get()
    );
  });

  test('replier like query allowed and dislike query denied', async () => {
    await seedBaseUsers();
    await seed('feedbacks/like-reply', likeFeedback);
    await seed('feedbacks/dislike-reply', dislikeFeedback);

    await assertSucceeds(
      dbFor('recipient')
        .collection('feedbacks')
        .where('replierUid', '==', 'recipient')
        .where('type', '==', 'like')
        .get()
    );
    await assertFails(
      dbFor('recipient')
        .collection('feedbacks')
        .where('replierUid', '==', 'recipient')
        .where('type', '==', 'dislike')
        .get()
    );
  });

  test('direct replier dislike doc read denied', async () => {
    await seedBaseUsers();
    await seed('feedbacks/worry1_recipient', dislikeFeedback);

    await assertFails(dbFor('recipient').doc('feedbacks/worry1_recipient').get());
    await assertSucceeds(dbFor('author').doc('feedbacks/worry1_recipient').get());
  });

  test('browser cannot mutate feedbacks or helpedCount', async () => {
    await seedBaseUsers();
    await assertFails(dbFor('author').doc('feedbacks/worry1_recipient').set(likeFeedback));
    await seed('feedbacks/worry1_recipient', likeFeedback);
    await assertFails(dbFor('author').doc('feedbacks/worry1_recipient').update({ type: 'dislike' }));
    await assertFails(dbFor('recipient').doc('users/recipient').update({ helpedCount: 1 }));
  });

  test('does not leak dislike summary through replier-readable reply document', async () => {
    await seedBaseUsers();
    await seed('replies/like-reply', {
      ...prdReply,
      feedbackType: 'like',
      likedAt: new Date(),
    });
    await seed('replies/dislike-reply', {
      ...prdReply,
      feedbackType: 'dislike',
      dislikedAt: new Date(),
      publisherHiddenBecauseDisliked: true,
    });

    await assertSucceeds(dbFor('recipient').doc('replies/like-reply').get());
    await assertFails(dbFor('recipient').doc('replies/dislike-reply').get());
  });
});
}
