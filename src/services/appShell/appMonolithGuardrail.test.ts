import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const appSource = fs.readFileSync('src/App.tsx', 'utf8');

function importedSources(source: string): string[] {
  const imports = source.matchAll(/import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g);
  return Array.from(imports, match => match[1] ?? '');
}

const appImports = importedSources(appSource);

test('App.tsx imports route policy and route rendering only through appShell boundaries', () => {
  assert.ok(appImports.includes('./services/appShell/prdNavigationPolicy'));
  assert.ok(appImports.includes('./services/appShell/routeRenderingBoundary'));

  for (const forbidden of [
    './services/appShell/appShellBoundary',
    './services/appShell/appShellResponsibilityMap',
  ]) {
    assert.equal(appImports.includes(forbidden), false, `App.tsx must not import review-only boundary module ${forbidden}`);
  }
});

test('App.tsx does not import Phase 5-7 feature service clients, adapters, or mutation internals directly', () => {
  for (const forbidden of [
    './services/deliveries/apiClient',
    './services/readState/apiClient',
    './services/worryPublication/apiClient',
    './services/replyPublication/apiClient',
    './services/replyFeedback/production',
    './services/userAccount/client',
    './services/myWorries',
    './services/homeWorryFeed',
    './services/drafts/contentDrafts',
    './services/validation/content',
    'passDeliveryViaApi',
    'publishWorryViaApi',
    'publishReplyViaApi',
    'submitReplyFeedbackWithProductionAdapters',
    'deleteMyAccountViaApi',
  ]) {
    assert.equal(
      appSource.includes(forbidden),
      false,
      `App.tsx contains forbidden Phase 5-7 feature wiring ${forbidden}`,
    );
  }
});

test('App.tsx delegates Phase 5-7 route data wiring to containers', () => {
  for (const container of [
    'ReceivedWorriesContainer',
    'WriteWorryContainer',
    'WriteReplyContainer',
    'MyPageContainer',
    'MyAnswersContainer',
    'MyWorriesContainer',
    'ReplyDetailContainer',
  ]) {
    assert.match(appSource, new RegExp(`<${container}\\b`), `App.tsx should mount ${container}`);
  }

  assert.doesNotMatch(appSource, /const publishWorry = async|const sendReply = async|function WriteForm\(/);
  assert.doesNotMatch(appSource, /useHomeWorryFeed|filterSuppressedFeedWorries|useMyWorries|useMyGivenReplies|useRepliesForWorry/);
});

test('App.tsx keeps push registration as a narrow shell-level exception', () => {
  assert.deepEqual(
    appImports.filter(source => source.includes('services/pushRegistration')),
    ['./services/pushRegistration'],
  );
  assert.match(appSource, /usePushRegistration\(\{ user, loading \}\)/);
  assert.match(appSource, /resetPushRegistrationOnSignOut/);

  for (const forbiddenPushInternal of [
    'services/pushRegistration/internalLifecycle',
    'services/pushRegistration/adapters',
    'services/pushRegistration/serviceWorker',
    'savePushRegistration',
    'deletePushRegistration',
    'writePushRegistration',
  ]) {
    assert.equal(
      appSource.includes(forbiddenPushInternal),
      false,
      `App.tsx must not import or mutate push internals through ${forbiddenPushInternal}`,
    );
  }
});

test('App.tsx remaining Firebase ownership is limited to shell auth/profile, presence, onboarding, and foreground messaging debt', () => {
  assert.ok(appImports.includes('firebase/auth'));
  assert.ok(appImports.includes('firebase/firestore'));
  assert.ok(appImports.includes('firebase/messaging'));
  assert.match(appSource, /onAuthStateChanged\(auth/);
  assert.match(appSource, /signInWithPopup\(auth, googleProvider\)/);
  assert.match(appSource, /onMessage\(messaging/);
  assert.match(appSource, /updateDoc\(doc\(db, 'users', profile\.uid\)/);
  assert.match(appSource, /createExampleWorriesForCurrentUser/);

  assert.doesNotMatch(appSource, /collection\(db, 'deliveries'|collection\(db, 'worries'|collection\(db, 'replies'/);
});

test('App.tsx owns account deletion finalization without importing deletion clients', () => {
  assert.match(appSource, /const handleAccountDeleted = \(\) => \{/);
  assert.match(appSource, /setUser\(null\)/);
  assert.match(appSource, /setProfile\(null\)/);
  assert.match(appSource, /setSelectedWorry\(null\)/);
  assert.match(appSource, /setSelectedMyWorry\(null\)/);
  assert.match(appSource, /setSelectedReply\(null\)/);
  assert.match(appSource, /setView\(routeAfterAccountDeletion\(\)\)/);
  assert.match(appSource, /onAccountDeleted=\{handleAccountDeleted\}/);
  assert.equal(appSource.includes('deleteMyAccountViaApi'), false);
});
