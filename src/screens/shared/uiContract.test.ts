import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BottomNavigation } from './ui';
import {
  SHARED_UI_PRIMITIVE_OWNERSHIP,
  type BottomNavigationProps,
  type CategoryChipProps,
  type QlingDialogProps,
  type PolicyTextContainerProps,
  type ProfileMotifProps,
  type QlingTextAreaProps,
  type SettingsRowProps,
} from './uiContract';

test('shared primitive inventory covers every Phase 14 ownership item', () => {
  assert.deepEqual(
    SHARED_UI_PRIMITIVE_OWNERSHIP.map(item => item.id),
    [
      'appShellMobileFrame',
      'bottomNavigation',
      'centralWriteWorryAction',
      'contentSheet',
      'orangeHeaderBand',
      'primaryCta',
      'secondaryDestructiveCta',
      'card',
      'categoryChip',
      'textArea',
      'modalDialog',
      'emptyLoadingErrorState',
      'profileMotif',
      'policyTextContainer',
      'settingsRow',
    ],
  );
});

test('bottom navigation contract preserves PRD tabs and central write-worry action', () => {
  const props = {
    tabs: [
      { tab: '답변하기', label: '답변하기' },
      { tab: '나의 고민', label: '나의 고민' },
      { tab: '마이페이지', label: '마이페이지' },
    ],
    activeTab: '답변하기',
    centralAction: {
      label: '고민 작성',
      accessibleLabel: '고민 작성',
      targetRoute: 'write_worry',
      ownerTab: '나의 고민',
    },
    onSelectTab: () => undefined,
    onCentralAction: () => undefined,
  } satisfies BottomNavigationProps;

  assert.deepEqual(props.tabs.map(tab => tab.label), ['답변하기', '나의 고민', '마이페이지']);
  assert.equal(props.activeTab, '답변하기');
  assert.equal(props.centralAction.label, '고민 작성');
  assert.equal(props.centralAction.targetRoute, 'write_worry');
  assert.equal(props.centralAction.ownerTab, '나의 고민');
});

test('bottom navigation default variant keeps fixed grid production presentation', () => {
  const props = {
    tabs: [
      { tab: '답변하기', label: '답변하기' },
      { tab: '나의 고민', label: '나의 고민' },
      { tab: '마이페이지', label: '마이페이지' },
    ],
    activeTab: '답변하기',
    centralAction: {
      label: '고민 작성',
      accessibleLabel: '고민 작성',
      targetRoute: 'write_worry',
      ownerTab: '나의 고민',
    },
    onSelectTab: () => undefined,
    onCentralAction: () => undefined,
  } satisfies BottomNavigationProps;
  const html = renderToStaticMarkup(createElement(BottomNavigation, props));

  assert.match(html, /fixed inset-x-0 bottom-0/);
  assert.match(html, /grid h-\[var\(--qling-space-nav-height\)\]/);
  assert.match(html, />고민 작성</);
  assert.match(html, /aria-current="page"/);
});

test('bottom navigation pixel-aligned variant keeps functional actions with reference geometry', () => {
  const props = {
    tabs: [
      { tab: '답변하기', label: '답변하기' },
      { tab: '나의 고민', label: '나의 고민' },
      { tab: '마이페이지', label: '마이페이지' },
    ],
    activeTab: '나의 고민',
    centralAction: {
      label: '고민 작성',
      accessibleLabel: '고민 작성',
      targetRoute: 'write_worry',
      ownerTab: '나의 고민',
    },
    onSelectTab: () => undefined,
    onCentralAction: () => undefined,
    variant: 'pixel-aligned',
  } satisfies BottomNavigationProps;
  const html = renderToStaticMarkup(createElement(BottomNavigation, props));

  assert.match(html, /absolute left-0 bottom-\[-7px\]/);
  assert.match(html, /bottom-\[-7px\]/);
  assert.match(html, /h-\[104px\] w-\[393px\]/);
  assert.match(html, /viewBox="0 0 417 104"/);
  assert.match(html, /left-\[140px\] top-0 z-10 h-\[88px\] w-\[114px\]/);
  assert.match(html, /left-\[149px\] top-\[9px\].*h-\[59px\] w-\[95px\]/);
  assert.match(html, /aria-label="고민 작성"/);
  assert.match(html, /aria-current="page"/);
  assert.doesNotMatch(html, /fixed inset-x-0 bottom-0/);
});

test('bottom navigation pixel-aligned source preserves tab and central callbacks', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'screens', 'shared', 'ui.tsx'), 'utf8');

  assert.match(source, /variant === 'pixel-aligned'/);
  assert.match(source, /onClick=\{onCentralAction\}/);
  assert.match(source, /onClick=\{\(\) => onSelectTab\(ownerTab\.tab\)\}/);
  assert.match(source, /onClick=\{\(\) => onSelectTab\(leftTab\.tab\)\}/);
  assert.match(source, /onClick=\{\(\) => onSelectTab\(rightTab\.tab\)\}/);
  assert.match(source, /aria-current=\{activeTab === ownerTab\.tab \? 'page' : undefined\}/);
  assert.match(source, /aria-current=\{isLeftActive \? 'page' : undefined\}/);
  assert.match(source, /aria-current=\{isRightActive \? 'page' : undefined\}/);
  assert.match(source, /p29c4a2f0/);
  assert.match(source, /p37614900/);
  assert.match(source, /p3dc36300/);
});

test('profile motif remains visual-only without avatar data requirements', () => {
  const props = {
    label: 'Profile motif',
  } satisfies ProfileMotifProps;

  assert.equal(props.label, 'Profile motif');
  for (const forbidden of ['avatarUrl', 'avatarUpload', 'avatarImageData', 'photoURL']) {
    assert.equal(Object.hasOwn(props, forbidden), false);
  }
});

test('policy text container accepts empty, error, and real body states without fake body', () => {
  const empty = {
    state: 'empty',
    title: '개인정보처리방침',
    message: '정책 본문을 준비 중입니다.',
  } satisfies PolicyTextContainerProps;
  const error = {
    state: 'error',
    title: '운영정책',
    message: '정책 본문을 불러오지 못했습니다.',
    onRetry: () => undefined,
  } satisfies PolicyTextContainerProps;
  const body = {
    state: 'body',
    title: '운영정책',
    body: '실제 정책 본문',
  } satisfies PolicyTextContainerProps;

  assert.equal(empty.state, 'empty');
  assert.equal(error.state, 'error');
  assert.equal(body.state, 'body');
  assert.equal(Object.hasOwn(empty, 'body'), false);
});

test('text area and settings row contracts expose required state mapping props', () => {
  const textArea = {
    value: '고민 내용',
    onChange: () => undefined,
    maxLength: 1000,
    errorMessage: '너무 길어요.',
    disabled: false,
    processing: false,
  } satisfies QlingTextAreaProps;
  const settingsRow = {
    label: '탈퇴',
    description: '계정을 삭제합니다.',
    danger: true,
    disabled: false,
    accessibilityLabel: '계정 탈퇴',
    onSelect: () => undefined,
  } satisfies SettingsRowProps;

  assert.equal(textArea.value.length, 5);
  assert.equal(textArea.maxLength, 1000);
  assert.equal(textArea.errorMessage, '너무 길어요.');
  assert.equal(textArea.disabled, false);
  assert.equal(textArea.processing, false);
  assert.equal(settingsRow.danger, true);
  assert.equal(settingsRow.disabled, false);
  assert.equal(settingsRow.accessibilityLabel, '계정 탈퇴');
});

test('category chip contract allows layout classes without changing selection behavior', () => {
  const chip = {
    label: '워라밸',
    selected: true,
    disabled: false,
    className: 'h-[44px] w-full max-w-[103px]',
    onSelect: () => undefined,
  } satisfies CategoryChipProps;

  assert.equal(chip.label, '워라밸');
  assert.equal(chip.selected, true);
  assert.equal(chip.className?.includes('max-w-[103px]'), true);
  assert.equal(Object.hasOwn(chip, 'apiClient'), false);
});

test('modal dialog contract preserves aria-capable confirmation and processing/error states', () => {
  const dialog = {
    isOpen: true,
    title: '계정을 삭제할까요?',
    description: '계정 삭제는 되돌릴 수 없습니다.',
    cancelLabel: '취소',
    confirmLabel: '계정 삭제',
    destructive: true,
    processing: true,
    errorMessage: '계정 삭제 처리 중 문제가 발생했습니다.',
    onCancel: () => undefined,
    onConfirm: () => undefined,
  } satisfies QlingDialogProps;
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'screens', 'shared', 'ui.tsx'), 'utf8');

  assert.equal(dialog.destructive, true);
  assert.equal(dialog.processing, true);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /aria-describedby=\{describedBy\}/);
  assert.match(source, /useId/);
});

test('shared primitive module does not import Firebase, API, server, or service mutation boundaries', () => {
  const uiSource = fs.readFileSync(path.join(process.cwd(), 'src', 'screens', 'shared', 'ui.tsx'), 'utf8');
  const forbidden = [
    'firebase',
    'firestore',
    'src/services/',
    '../../services/',
    'apiClient',
    'server.ts',
    'deleteMyAccountViaApi',
    'submitReplyFeedbackWithProductionAdapters',
    'passDeliveryViaApi',
    'routeToWriteWorry',
    'tabForRoute',
  ];

  for (const pattern of forbidden) {
    assert.equal(uiSource.includes(pattern), false, `shared primitive module includes forbidden boundary ${pattern}`);
  }
});
