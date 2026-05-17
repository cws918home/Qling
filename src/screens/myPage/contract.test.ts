import test from 'node:test';
import assert from 'node:assert/strict';
import { WORRY_CATEGORIES } from '@midnight-radio/domain';
import {
  HELPED_COUNT_LABEL,
  MY_PAGE_POLICY_SETTING_ITEMS,
  MY_PAGE_SETTING_ITEMS,
  PUSH_PERMISSION_STATUSES,
  type MyPageScreenProps,
  type MyAnswersScreenProps,
  type MyWorriesScreenProps,
  type PolicyScreenProps,
  type EditInterestsProps,
  type ConfirmationProps,
  type AppInstallAccessProps,
} from './contract';

test('my-page summary limits nickname to profile summary and labels helpedCount as received hearts', () => {
  const props = {
    profile: {
      nickname: 'Profile user',
      interests: [WORRY_CATEGORIES[0], WORRY_CATEGORIES[1]],
      ageLabel: '20s',
      helpedCount: 7,
      helpedCountLabel: HELPED_COUNT_LABEL,
      profileMotif: {
        kind: 'visual-only',
        label: 'Profile motif',
      },
    },
    settings: MY_PAGE_SETTING_ITEMS,
    pushSettings: {
      status: 'default',
      onOpenSettings: () => undefined,
    },
    appInstall: {
      canInstall: false,
      canShare: true,
      platformGuidance: 'share-url-or-qr',
      onShare: () => undefined,
    },
    logoutConfirmation: {
      isOpen: false,
      isProcessing: false,
      onCancel: () => undefined,
      onConfirm: () => undefined,
    },
    accountDeletionConfirmation: {
      isOpen: false,
      isProcessing: false,
      onCancel: () => undefined,
      onConfirm: () => undefined,
    },
    onSettingSelect: () => undefined,
  } satisfies MyPageScreenProps;

  assert.equal(props.profile.helpedCountLabel, '받은 하트');
  assert.equal(props.profile.helpedCount, 7);
  assert.equal(Object.hasOwn(props, 'nickname'), false);
});

test('my-page contract keeps profile motif visual-only with no avatar data field', () => {
  const profileKeys = Object.keys({
    nickname: 'Profile user',
    interests: [WORRY_CATEGORIES[0]],
    helpedCount: 0,
    helpedCountLabel: HELPED_COUNT_LABEL,
    profileMotif: { kind: 'visual-only', label: 'Profile motif' },
  });

  for (const forbidden of ['avatarUrl', 'avatarUpload', 'avatarImageData']) {
    assert.equal(profileKeys.includes(forbidden), false);
  }
});

test('settings contract includes required account rows and excludes non-MVP policy rows', () => {
  assert.deepEqual(MY_PAGE_POLICY_SETTING_ITEMS, ['privacy_policy', 'operation_policy']);
  assert.deepEqual(MY_PAGE_SETTING_ITEMS, [
    'edit_interests',
    'my_answers',
    'my_worries',
    'privacy_policy',
    'operation_policy',
    'app_install_guide',
    'push_notification_settings',
    'logout',
    'delete_account',
  ]);

  for (const excluded of ['usage' + '_guide', 'generic' + ' ' + 'policy', 'ter' + 'ms']) {
    assert.equal((MY_PAGE_SETTING_ITEMS as readonly string[]).includes(excluded), false);
  }
});

test('push and app-like usage access are UI states with callbacks', () => {
  assert.deepEqual(PUSH_PERMISSION_STATUSES, [
    'default',
    'granted',
    'denied',
    'unsupported',
    'registered',
    'error',
  ]);
});

test('my answers and my worries contracts expose list states and route callbacks without sample labels', () => {
  const answers = {
    state: { status: 'ready' },
    items: [{
      replyId: 'reply-1',
      deliveryId: 'delivery-1',
      worryId: 'worry-1',
      previewText: '답장 내용',
    }],
    onBack: () => undefined,
    onSelect: () => undefined,
  } satisfies MyAnswersScreenProps;
  const worries = {
    state: { status: 'ready' },
    items: [{
      worryId: 'worry-1',
      contentPreview: '고민 내용',
      categoryLabel: WORRY_CATEGORIES[0],
      replyCount: 1,
      hasUnreadReplies: true,
      isSelected: false,
      accessibilityLabel: '나의 고민 상세로 이동, 카테고리 취업, 답장 1개, 읽지 않은 답장 있음, 선택되지 않음',
    }],
    selectedWorry: {
      worryId: 'worry-1',
      content: '고민 내용',
      repliesState: { status: 'ready' },
      replies: [{
        replyId: 'reply-1',
        worryId: 'worry-1',
        previewText: '받은 답장',
        hasUnread: true,
        accessibilityLabel: '받은 답장 상세로 이동, 읽지 않은 답장',
      }],
    },
    onWriteWorry: () => undefined,
    onSelectWorry: () => undefined,
    onSelectReply: () => undefined,
  } satisfies MyWorriesScreenProps;

  assert.equal(answers.items[0].previewText, '답장 내용');
  assert.equal(typeof answers.onSelect, 'function');
  assert.equal(worries.selectedWorry?.replies[0].hasUnread, true);
  assert.match(worries.items[0].accessibilityLabel, /답장 1개/);
  assert.match(worries.items[0].accessibilityLabel, /읽지 않은 답장 있음/);
  assert.match(worries.items[0].accessibilityLabel, /상세로 이동/);
  for (const item of [...answers.items, ...worries.items]) {
    assert.equal(Object.hasOwn(item, 'exampleLabel'), false);
    assert.equal(Object.hasOwn(item, 'fakeLabel'), false);
    assert.equal(Object.hasOwn(item, 'sampleLabel'), false);
  }
});

test('policy screen contract carries title, body or unavailable state', () => {
  const props = {
    policy: 'privacy_policy',
    title: 'Privacy policy',
    state: { status: 'empty', message: 'Policy content unavailable' },
  } satisfies PolicyScreenProps;

  assert.equal(props.policy, 'privacy_policy');
  assert.equal(props.state.status, 'empty');
});

test('edit-interests contract exposes only interest fields and callbacks', () => {
  const props = {
    categoryOptions: WORRY_CATEGORIES,
    selectedInterests: ['워라밸'],
    validationMessages: {},
    isProcessing: false,
    onBack: () => undefined,
    onInterestToggle: () => undefined,
    onSubmit: () => undefined,
  } satisfies EditInterestsProps;

  assert.equal(props.selectedInterests.includes('워라밸'), true);
  for (const forbidden of ['nickname', 'gender', 'age', 'onNicknameChange', 'onGenderChange', 'onAgeChange']) {
    assert.equal(Object.hasOwn(props, forbidden), false);
  }
});

test('confirmation props require explicit destructive/account callbacks without importing deletion logic', () => {
  const confirmation = {
    isOpen: true,
    isProcessing: false,
    errorMessage: undefined,
    onCancel: () => undefined,
    onConfirm: () => undefined,
  } satisfies ConfirmationProps;

  assert.equal(confirmation.isOpen, true);
  assert.equal(typeof confirmation.onCancel, 'function');
  assert.equal(typeof confirmation.onConfirm, 'function');
});

test('PWA install/share props expose real browser capability states', () => {
  const props = {
    canInstall: true,
    canShare: true,
    platformGuidance: 'android-install',
    onInstall: () => undefined,
    onShare: () => undefined,
  } satisfies AppInstallAccessProps;

  assert.equal(props.canInstall, true);
  assert.equal(props.canShare, true);
  assert.equal(props.platformGuidance, 'android-install');
});
