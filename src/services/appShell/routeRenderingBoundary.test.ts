import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  REQUIRED_ROUTE_RENDERING_GROUPS,
  ROUTE_RENDERING_BOUNDARY,
  isRouteInGroup,
  routeRenderingBoundaryForRoute,
  routeRenderingGroupForRoute,
} from './routeRenderingBoundary';

test('covers every Phase 3 required route rendering group', () => {
  assert.deepEqual(REQUIRED_ROUTE_RENDERING_GROUPS, [
    'authenticated shell',
    'onboarding flow',
    'received worries',
    'write worry',
    'write reply',
    'reply details',
    'my-page/account',
    'policy screens',
  ]);

  for (const group of REQUIRED_ROUTE_RENDERING_GROUPS) {
    assert.ok(ROUTE_RENDERING_BOUNDARY[group].routes.length > 0, `${group} needs route coverage`);
    assert.ok(ROUTE_RENDERING_BOUNDARY[group].appBoundary.length > 0, `${group} needs App boundary notes`);
    assert.ok(ROUTE_RENDERING_BOUNDARY[group].nextContainerBoundary.length > 0, `${group} needs next-container notes`);
  }
});

test('maps canonical route states to their Phase 3 route rendering boundaries', () => {
  assert.equal(routeRenderingGroupForRoute('onboarding'), 'onboarding flow');
  assert.equal(routeRenderingGroupForRoute('onboarding_duplicate_check'), 'onboarding flow');
  assert.equal(routeRenderingGroupForRoute('답변하기'), 'received worries');
  assert.equal(routeRenderingGroupForRoute('received_worries'), 'received worries');
  assert.equal(routeRenderingGroupForRoute('write_worry'), 'write worry');
  assert.equal(routeRenderingGroupForRoute('write_reply'), 'write reply');
  assert.equal(routeRenderingGroupForRoute('나의 고민'), 'authenticated shell');
  assert.equal(routeRenderingGroupForRoute('received_answer_detail'), 'reply details');
  assert.equal(routeRenderingGroupForRoute('my_answer_detail'), 'reply details');
  assert.equal(routeRenderingGroupForRoute('my_worry_detail'), 'reply details');
  assert.equal(routeRenderingGroupForRoute('마이페이지'), 'my-page/account');
  assert.equal(routeRenderingGroupForRoute('my_answers'), 'my-page/account');
  assert.equal(routeRenderingGroupForRoute('account_deletion_confirmation'), 'my-page/account');
  assert.equal(routeRenderingGroupForRoute('privacy_policy'), 'policy screens');
  assert.equal(routeRenderingGroupForRoute('operation_policy'), 'policy screens');
});

test('identifies authenticated shell membership separately from route-specific groups', () => {
  assert.equal(isRouteInGroup('write_reply', 'authenticated shell'), true);
  assert.equal(isRouteInGroup('privacy_policy', 'authenticated shell'), true);
  assert.equal(isRouteInGroup('onboarding', 'authenticated shell'), false);
  assert.equal(isRouteInGroup('login', 'authenticated shell'), false);

  assert.deepEqual(routeRenderingBoundaryForRoute({ route: 'write_reply', deliveryId: 'delivery-1', worryId: 'worry-1' }), {
    currentRoute: 'write_reply',
    routeGroup: 'write reply',
    authenticatedTab: '답변하기',
    mountsAuthenticatedShell: true,
    mountsBottomNavigation: true,
  });
  assert.deepEqual(routeRenderingBoundaryForRoute('onboarding_interests'), {
    currentRoute: 'onboarding_interests',
    routeGroup: 'onboarding flow',
    authenticatedTab: null,
    mountsAuthenticatedShell: false,
    mountsBottomNavigation: false,
  });
});

test('keeps route rendering policy outside App.tsx branch helpers', () => {
  const source = fs.readFileSync('src/App.tsx', 'utf8');

  assert.match(source, /routeRenderingBoundaryForRoute/);
  assert.doesNotMatch(source, /function routeRenderingGroupForRoute/);
  assert.doesNotMatch(source, /const routeRenderingGroupForRoute/);
  assert.doesNotMatch(source, /usage_guide/);
  assert.doesNotMatch(source, /generic policy/);
});

test('records visual reskin non-start evidence for copied static design markers', () => {
  const checkedSources = [
    fs.readFileSync('src/App.tsx', 'utf8'),
    fs.readFileSync('src/services/appShell/routeRenderingBoundary.ts', 'utf8'),
  ].join('\n');

  assert.doesNotMatch(checkedSources, /라미|fake status|status bar|home indicator|Lorem|lorem|sample data/);
  assert.doesNotMatch(checkedSources, /314/);
});
