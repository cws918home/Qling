import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_AUTHENTICATED_TAB,
  MY_PAGE_MORE_ITEMS,
  PRD_APP_TABS,
  backRouteFromMyReplyDetail,
  backRouteFromReceivedReplyDetail,
  backRouteFromWriteReply,
  backRouteFromWriteWorry,
  routeAfterAuthProfileLoad,
  routeAfterFeedbackPublish,
  routeAfterOnboardingComplete,
  routeAfterPass,
  routeAfterReplyPublish,
  routeAfterWorryPublish,
  routeToMyReplyDetail,
  routeToReceivedReplyDetail,
  routeToWriteReply,
  routeToWriteWorry,
  tabForRoute,
} from './prdNavigationPolicy';

test('defines the canonical PRD app tabs and default authenticated tab', () => {
  assert.deepEqual(PRD_APP_TABS, ['답변하기', '나의 고민', '마이페이지']);
  assert.equal(DEFAULT_AUTHENTICATED_TAB, '답변하기');
});

test('defines the My Page More items required by the PRD shell', () => {
  assert.deepEqual(MY_PAGE_MORE_ITEMS, [
    'notification_guide',
    'notification_settings',
    'usage_guide',
    'policy',
    'privacy_policy',
    'operation_policy',
    'logout',
    'delete_account',
  ]);
});

test('routes auth/profile load and onboarding completion to answer tab', () => {
  assert.equal(routeAfterAuthProfileLoad('login'), '답변하기');
  assert.equal(routeAfterAuthProfileLoad('onboarding'), '답변하기');
  assert.equal(routeAfterAuthProfileLoad('나의 고민'), '나의 고민');
  assert.equal(routeAfterOnboardingComplete(), '답변하기');
});

test('routes publish, reply, pass, feedback, detail, and back targets', () => {
  assert.equal(routeAfterWorryPublish(), '나의 고민');
  assert.equal(routeAfterReplyPublish(), '답변하기');
  assert.equal(routeAfterPass(), '답변하기');
  assert.equal(routeAfterFeedbackPublish('read_received_reply'), 'read_received_reply');
  assert.equal(routeToWriteWorry(), 'write_worry');
  assert.equal(routeToWriteReply(), 'write_reply');
  assert.equal(routeToReceivedReplyDetail(), 'read_received_reply');
  assert.equal(routeToMyReplyDetail(), 'read_my_reply');
  assert.equal(backRouteFromWriteWorry(), '나의 고민');
  assert.equal(backRouteFromWriteReply(), '답변하기');
  assert.equal(backRouteFromReceivedReplyDetail(), '나의 고민');
  assert.equal(backRouteFromMyReplyDetail(), '마이페이지');
});

test('maps detail and write routes to their owning PRD tab', () => {
  assert.equal(tabForRoute('답변하기'), '답변하기');
  assert.equal(tabForRoute('나의 고민'), '나의 고민');
  assert.equal(tabForRoute('마이페이지'), '마이페이지');
  assert.equal(tabForRoute('write_worry'), '나의 고민');
  assert.equal(tabForRoute('read_received_reply'), '나의 고민');
  assert.equal(tabForRoute('read_my_reply'), '마이페이지');
  assert.equal(tabForRoute('write_reply'), '답변하기');
  assert.equal(tabForRoute('login'), null);
});
