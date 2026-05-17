import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANSWER_FEED_ROUTE_ALIASES,
  CENTRAL_BOTTOM_NAVIGATION_ACTION,
  DEFAULT_AUTHENTICATED_ROUTE,
  DEFAULT_AUTHENTICATED_TAB,
  DEPRECATED_MY_PAGE_MORE_ITEMS,
  MY_PAGE_MORE_ITEMS,
  MY_PAGE_SUBROUTES,
  PRD_APP_TABS,
  REQUIRED_PHASE_2_ROUTE_STATES,
  backRouteForRoute,
  backRouteFromMyReplyDetail,
  backRouteFromReceivedReplyDetail,
  backRouteFromWriteReply,
  backRouteFromWriteWorry,
  resolveAppRouteState,
  routeAfterAuthProfileLoad,
  routeAfterAccountDeletion,
  routeAfterProfileReadDenied,
  routeAfterFeedbackPublish,
  routeAfterOnboardingComplete,
  routeAfterPass,
  routeAfterReplyPublish,
  routeAfterWorryPublish,
  routeName,
  routeToEditInterests,
  routeToMyAnswers,
  routeToMyReplyDetail,
  routeToMyWorries,
  routeToReceivedReplyDetail,
  routeToWriteReply,
  routeToWriteWorry,
  tabForRoute,
} from './prdNavigationPolicy';

test('defines the canonical PRD app tabs and default authenticated tab', () => {
  assert.deepEqual(PRD_APP_TABS, ['답변하기', '나의 고민', '마이페이지']);
  assert.equal(DEFAULT_AUTHENTICATED_TAB, '답변하기');
  assert.equal(DEFAULT_AUTHENTICATED_ROUTE, 'received_worries');
  assert.deepEqual(ANSWER_FEED_ROUTE_ALIASES, ['답변하기', 'received_worries']);
});

test('defines the My Page More items required by the PRD shell without excluded MVP routes', () => {
  assert.deepEqual(MY_PAGE_MORE_ITEMS, [
    'notification_settings',
    'app_install_guide',
    'privacy_policy',
    'operation_policy',
    'logout',
    'delete_account',
  ]);
  assert.deepEqual(DEPRECATED_MY_PAGE_MORE_ITEMS, ['usage_guide', 'policy']);
  assert.equal(MY_PAGE_MORE_ITEMS.includes('privacy_policy'), true);
  assert.equal(MY_PAGE_MORE_ITEMS.includes('operation_policy'), true);
  assert.equal((MY_PAGE_MORE_ITEMS as readonly string[]).includes('usage_guide'), false);
  assert.equal((MY_PAGE_MORE_ITEMS as readonly string[]).includes('policy'), false);
});

test('covers every Phase 2 canonical route/state in the service policy', () => {
  assert.deepEqual(REQUIRED_PHASE_2_ROUTE_STATES, [
    'splash',
    'loading',
    'login',
    'onboarding_basic',
    'onboarding_duplicate_check',
    'onboarding_gender_age',
    'onboarding_interests',
    'received_worries',
    'write_worry',
    'write_reply',
    'received_answer_detail',
    'my_answer_detail',
    'answer_check',
    'my_page',
    'edit_interests',
    'my_answers',
    'my_worries',
    'privacy_policy',
    'operation_policy',
    'logout_confirmation',
    'account_deletion_confirmation',
  ]);
});

test('routes auth/profile load and onboarding completion to answer feed', () => {
  assert.equal(routeAfterAuthProfileLoad('login'), '답변하기');
  assert.equal(routeAfterAuthProfileLoad('onboarding'), '답변하기');
  assert.equal(routeAfterAuthProfileLoad('onboarding_duplicate_check'), '답변하기');
  assert.equal(routeAfterAuthProfileLoad('splash'), '답변하기');
  assert.equal(routeAfterAuthProfileLoad('나의 고민'), '나의 고민');
  assert.equal(routeAfterOnboardingComplete(), '답변하기');
  assert.equal(tabForRoute(DEFAULT_AUTHENTICATED_ROUTE), DEFAULT_AUTHENTICATED_TAB);
});

test('routes account deletion completion to login without using my-page back route', () => {
  assert.equal(routeAfterAccountDeletion(), 'login');
  assert.equal(backRouteForRoute('account_deletion_confirmation'), '마이페이지');
});

test('routes profile read denial to safe onboarding recovery instead of login failure', () => {
  assert.equal(routeAfterProfileReadDenied(), 'onboarding');
});

test('routes publish success with created ids and has no standalone write success routes', () => {
  assert.deepEqual(routeAfterWorryPublish({ worryId: 'worry-created-1' }), {
    route: 'my_worry_detail',
    worryId: 'worry-created-1',
  });
  assert.deepEqual(routeAfterReplyPublish({
    replyId: 'reply-created-1',
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
  }), {
    route: 'my_answer_detail',
    replyId: 'reply-created-1',
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
  });
  assert.equal((REQUIRED_PHASE_2_ROUTE_STATES as readonly string[]).includes('write_worry_success'), false);
  assert.equal((REQUIRED_PHASE_2_ROUTE_STATES as readonly string[]).includes('write_reply_success'), false);
});

test('preserves id-bearing route state when applying routes to App view state', () => {
  const worryPublishRoute = routeAfterWorryPublish({ worryId: 'worry-created-1' });
  const replyPublishRoute = routeAfterReplyPublish({
    replyId: 'reply-created-1',
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
  });

  assert.deepEqual(resolveAppRouteState('write_worry', worryPublishRoute), {
    route: 'my_worry_detail',
    worryId: 'worry-created-1',
  });
  assert.deepEqual(resolveAppRouteState({ route: 'write_reply', deliveryId: 'delivery-1' }, replyPublishRoute), {
    route: 'my_answer_detail',
    replyId: 'reply-created-1',
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
  });
  assert.notEqual(resolveAppRouteState('write_worry', worryPublishRoute), worryPublishRoute.route);
  assert.notEqual(resolveAppRouteState('write_reply', replyPublishRoute), replyPublishRoute.route);
});

test('routes pass, feedback, write, detail, and my-page subroute targets', () => {
  assert.equal(routeAfterPass(), '답변하기');
  assert.equal(routeAfterFeedbackPublish('received_answer_detail'), 'received_answer_detail');
  assert.deepEqual(routeAfterFeedbackPublish({
    route: 'received_answer_detail',
    worryId: 'worry-1',
    replyId: 'reply-1',
  }), {
    route: 'received_answer_detail',
    worryId: 'worry-1',
    replyId: 'reply-1',
  });
  assert.deepEqual(routeAfterFeedbackPublish({ route: 'my_answer_detail', replyId: 'reply-1' }), {
    route: 'my_answer_detail',
    replyId: 'reply-1',
  });
  assert.equal(routeToWriteWorry(), 'write_worry');
  assert.deepEqual(routeToWriteReply({ deliveryId: 'delivery-1', worryId: 'worry-1' }), {
    route: 'write_reply',
    deliveryId: 'delivery-1',
    worryId: 'worry-1',
  });
  assert.deepEqual(routeToReceivedReplyDetail({ worryId: 'worry-1', replyId: 'reply-1' }), {
    route: 'received_answer_detail',
    worryId: 'worry-1',
    replyId: 'reply-1',
  });
  assert.deepEqual(routeToMyReplyDetail({ replyId: 'reply-1', deliveryId: 'delivery-1' }), {
    route: 'my_answer_detail',
    replyId: 'reply-1',
    deliveryId: 'delivery-1',
    worryId: undefined,
  });
  assert.equal(routeToMyAnswers(), 'my_answers');
  assert.equal(routeToMyWorries(), 'my_worries');
  assert.equal(routeToEditInterests(), 'edit_interests');
});

test('defines every required back route in the service policy', () => {
  assert.equal(backRouteFromWriteWorry(), '나의 고민');
  assert.equal(backRouteFromWriteReply(), '답변하기');
  assert.equal(backRouteFromReceivedReplyDetail(), '나의 고민');
  assert.equal(backRouteFromMyReplyDetail(), 'my_answers');
  assert.equal(backRouteForRoute('write_worry'), '나의 고민');
  assert.equal(backRouteForRoute({ route: 'my_worry_detail', worryId: 'worry-1' }), '나의 고민');
  assert.equal(backRouteForRoute({ route: 'write_reply', deliveryId: 'delivery-1' }), '답변하기');
  assert.equal(backRouteForRoute({ route: 'received_answer_detail', worryId: 'worry-1', replyId: 'reply-1' }), '나의 고민');
  assert.equal(backRouteForRoute('answer_check'), '나의 고민');
  assert.equal(backRouteForRoute({ route: 'my_answer_detail', replyId: 'reply-1' }), 'my_answers');
  assert.equal(backRouteForRoute('edit_interests'), '마이페이지');
  assert.equal(backRouteForRoute('my_answers'), '마이페이지');
  assert.equal(backRouteForRoute('my_worries'), '나의 고민');
  assert.equal(backRouteForRoute('privacy_policy'), '마이페이지');
  assert.equal(backRouteForRoute('operation_policy'), '마이페이지');
  assert.equal(backRouteForRoute('logout_confirmation'), '마이페이지');
  assert.equal(backRouteForRoute('account_deletion_confirmation'), '마이페이지');
});

test('defines my-page subroutes including confirmations and policy routes', () => {
  assert.deepEqual(MY_PAGE_SUBROUTES, [
    'edit_interests',
    'my_answers',
    'my_worries',
    'privacy_policy',
    'operation_policy',
    'logout_confirmation',
    'account_deletion_confirmation',
    'notification_settings',
    'app_install_guide',
  ]);
});

test('maps detail, write, policy, and confirmation routes to their owning PRD tab', () => {
  assert.equal(tabForRoute('답변하기'), '답변하기');
  assert.equal(tabForRoute('나의 고민'), '나의 고민');
  assert.equal(tabForRoute('마이페이지'), '마이페이지');
  assert.equal(tabForRoute('received_worries'), '답변하기');
  assert.equal(tabForRoute('write_reply'), '답변하기');
  assert.equal(tabForRoute('write_worry'), '나의 고민');
  assert.equal(tabForRoute('my_worries'), '나의 고민');
  assert.equal(tabForRoute({ route: 'received_answer_detail', worryId: 'worry-1', replyId: 'reply-1' }), '나의 고민');
  assert.equal(tabForRoute('answer_check'), '나의 고민');
  assert.equal(tabForRoute({ route: 'my_worry_detail', worryId: 'worry-1' }), '나의 고민');
  assert.equal(tabForRoute('edit_interests'), '마이페이지');
  assert.equal(tabForRoute('my_answers'), '마이페이지');
  assert.equal(tabForRoute({ route: 'my_answer_detail', replyId: 'reply-1' }), '마이페이지');
  assert.equal(tabForRoute('privacy_policy'), '마이페이지');
  assert.equal(tabForRoute('operation_policy'), '마이페이지');
  assert.equal(tabForRoute('logout_confirmation'), '마이페이지');
  assert.equal(tabForRoute('account_deletion_confirmation'), '마이페이지');
  assert.equal(tabForRoute('notification_settings'), '마이페이지');
  assert.equal(tabForRoute('app_install_guide'), '마이페이지');
  assert.equal(tabForRoute('login'), null);
  assert.equal(tabForRoute('loading'), null);
  assert.equal(tabForRoute('onboarding_interests'), null);
});

test('Phase 22 maps top-level bottom-tab routes to the expected active tab', () => {
  assert.equal(tabForRoute('답변하기'), '답변하기');
  assert.equal(tabForRoute('received_worries'), '답변하기');
  assert.equal(tabForRoute('나의 고민'), '나의 고민');
  assert.equal(tabForRoute('my_worries'), '나의 고민');
  assert.equal(tabForRoute('마이페이지'), '마이페이지');
  assert.equal(tabForRoute('my_page'), '마이페이지');
});

test('Phase 22 maps nested bottom-tab routes to the expected active tab', () => {
  assert.equal(tabForRoute({ route: 'write_reply', deliveryId: 'delivery-1', worryId: 'worry-1' }), '답변하기');
  assert.equal(tabForRoute('write_worry'), '나의 고민');
  assert.equal(tabForRoute({ route: 'received_answer_detail', worryId: 'worry-1', replyId: 'reply-1' }), '나의 고민');
  assert.equal(tabForRoute({ route: 'read_received_reply', worryId: 'worry-1', replyId: 'reply-1' }), '나의 고민');
  assert.equal(tabForRoute('answer_check'), '나의 고민');
  assert.equal(tabForRoute({ route: 'my_worry_detail', worryId: 'worry-1' }), '나의 고민');
  assert.equal(tabForRoute({ route: 'my_answer_detail', replyId: 'reply-1' }), '마이페이지');
  assert.equal(tabForRoute({ route: 'read_my_reply', replyId: 'reply-1' }), '마이페이지');
  assert.equal(tabForRoute('edit_interests'), '마이페이지');
  assert.equal(tabForRoute('my_answers'), '마이페이지');
  assert.equal(tabForRoute('privacy_policy'), '마이페이지');
  assert.equal(tabForRoute('operation_policy'), '마이페이지');
  assert.equal(tabForRoute('logout_confirmation'), '마이페이지');
  assert.equal(tabForRoute('account_deletion_confirmation'), '마이페이지');
  assert.equal(tabForRoute('notification_settings'), '마이페이지');
  assert.equal(tabForRoute('app_install_guide'), '마이페이지');
});

test('Phase 10 my-page account routes include policy/settings/confirmation routes and exclude login policy links', () => {
  for (const route of [
    '마이페이지',
    'edit_interests',
    'my_answers',
    'my_worries',
    'privacy_policy',
    'operation_policy',
    'logout_confirmation',
    'account_deletion_confirmation',
    'notification_settings',
    'app_install_guide',
  ] as const) {
    assert.equal(tabForRoute(route), route === 'my_worries' ? '나의 고민' : '마이페이지');
  }

  assert.equal((MY_PAGE_SUBROUTES as readonly string[]).includes('terms'), false);
  assert.equal((MY_PAGE_SUBROUTES as readonly string[]).includes('usage_guide'), false);
  assert.equal(tabForRoute('login'), null);
});

test('defines the central bottom-navigation write-worry action contract', () => {
  assert.deepEqual(CENTRAL_BOTTOM_NAVIGATION_ACTION, {
    label: '고민 작성',
    accessibleLabel: '고민 작성',
    targetRoute: 'write_worry',
    ownerTab: '나의 고민',
  });
  assert.equal(routeToWriteWorry(), CENTRAL_BOTTOM_NAVIGATION_ACTION.targetRoute);
  assert.equal(tabForRoute(routeToWriteWorry()), CENTRAL_BOTTOM_NAVIGATION_ACTION.ownerTab);
});

test('normalizes route states without moving policy into UI components', () => {
  assert.equal(routeName('privacy_policy'), 'privacy_policy');
  assert.equal(routeName({ route: 'my_answer_detail', replyId: 'reply-1' }), 'my_answer_detail');
});
