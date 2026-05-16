import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  APP_SHELL_ALLOWED_RESPONSIBILITIES,
  APP_SHELL_FORBIDDEN_RESPONSIBILITIES,
  APP_TSX_MAX_RESPONSIBILITIES_BEFORE_PHASE_5,
} from './appShellBoundary';
import {
  APP_RESPONSIBILITY_CATEGORIES,
  APP_TSX_RESPONSIBILITY_INVENTORY,
} from './appShellResponsibilityMap';

test('defines the Phase 3 App shell allowed responsibility boundary', () => {
  assert.deepEqual(APP_SHELL_ALLOWED_RESPONSIBILITIES, [
    'auth/profile loading',
    'top-level AppRouteViewState',
    'route selection and route transition dispatch',
    'global shell layout',
    'global overlays',
    'shell-level providers',
    'bottom navigation mount/visibility decision',
    'route container selection',
  ]);
});

test('keeps feature-container responsibilities out of the App shell allowed list', () => {
  const allowed = APP_SHELL_ALLOWED_RESPONSIBILITIES as readonly string[];

  for (const forbidden of [
    'Firestore query shape',
    'API client call details',
    'moderation result normalization',
    'matching/pass transaction details',
    'publication service internals',
    'reply feedback mutation internals',
    'push registration internals',
    'account deletion internals',
    'policy body loading internals',
    'presentational screen hardcoded design data',
  ]) {
    assert.equal(allowed.includes(forbidden), false, `${forbidden} must not be allowed in App shell`);
    assert.equal((APP_SHELL_FORBIDDEN_RESPONSIBILITIES as readonly string[]).includes(forbidden), true);
  }
});

test('records the current App responsibility inventory in all required categories', () => {
  assert.deepEqual(APP_RESPONSIBILITY_CATEGORIES, [
    'app-shell orchestration',
    'route rendering',
    'feature container logic',
    'presentational screen rendering',
  ]);

  for (const category of APP_RESPONSIBILITY_CATEGORIES) {
    assert.ok(
      APP_TSX_RESPONSIBILITY_INVENTORY.some(item => item.category === category),
      `${category} must have at least one App.tsx responsibility inventory item`,
    );
  }

  assert.ok(
    APP_TSX_RESPONSIBILITY_INVENTORY.some(item => item.phase3Boundary === 'route rendering boundary'),
    'route rendering must be identified as a boundary responsibility',
  );
  assert.ok(
    APP_TSX_RESPONSIBILITY_INVENTORY.some(item => item.phase3Boundary === 'future route container'),
    'feature behavior must be identified as future route-container responsibility',
  );
  assert.ok(
    APP_TSX_RESPONSIBILITY_INVENTORY.some(item => item.phase3Boundary === 'future presentational screen'),
    'presentational rendering must not be classified as App shell responsibility',
  );
});

test('records maximum App.tsx responsibilities and forbidden Phase 5+ additions', () => {
  assert.equal(
    APP_TSX_MAX_RESPONSIBILITIES_BEFORE_PHASE_5.mayKeep,
    APP_SHELL_ALLOWED_RESPONSIBILITIES,
  );
  assert.deepEqual(APP_TSX_MAX_RESPONSIBILITIES_BEFORE_PHASE_5.mustNotAdd, [
    'new Firestore queries in App.tsx',
    'new feature mutation details in App.tsx',
    'new bulk presentational screen JSX in App.tsx',
    'new route policy helpers in App.tsx',
    'new design sample data in App.tsx',
    'new Firebase/API/service internals in presentational screen components',
  ]);
});

test('App.tsx uses the route rendering boundary and preserves id-bearing route state', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(source, /routeRenderingBoundaryForRoute\(view\)/);
  assert.doesNotMatch(source, /setView\([^)]*\.route/);
  assert.doesNotMatch(source, /routeAfterWorryPublish\([^)]*\)\.route/);
  assert.doesNotMatch(source, /routeAfterReplyPublish\([^)]*\)\.route/);
});
