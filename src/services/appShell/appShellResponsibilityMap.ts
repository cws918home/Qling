export type AppResponsibilityCategory =
  | 'app-shell orchestration'
  | 'route rendering'
  | 'feature container logic'
  | 'presentational screen rendering';

export type AppResponsibilityInventoryItem = {
  readonly id: string;
  readonly category: AppResponsibilityCategory;
  readonly responsibility: string;
  readonly appEvidence: readonly string[];
  readonly phase3Boundary: 'may remain in App shell' | 'route rendering boundary' | 'future route container' | 'future presentational screen';
};

export const APP_RESPONSIBILITY_CATEGORIES = [
  'app-shell orchestration',
  'route rendering',
  'feature container logic',
  'presentational screen rendering',
] as const satisfies readonly AppResponsibilityCategory[];

export const APP_TSX_RESPONSIBILITY_INVENTORY = [
  {
    id: 'auth-profile-loading',
    category: 'app-shell orchestration',
    responsibility: 'Firebase auth listener, profile document load, initial route dispatch, and example-worry creation trigger',
    appEvidence: [
      'onAuthStateChanged(auth, async currentUser => ...)',
      "getDoc(doc(db, 'users', currentUser.uid))",
      'setView(prev => routeAfterAuthProfileLoad(prev))',
      'createExampleWorriesForCurrentUser(currentUser)',
    ],
    phase3Boundary: 'may remain in App shell',
  },
  {
    id: 'top-level-route-state',
    category: 'app-shell orchestration',
    responsibility: 'Own top-level AppRouteViewState and preserve id-bearing route state through route helpers',
    appEvidence: [
      "useState<AppRouteViewState>('login')",
      'routeName(view)',
      'resolveAppRouteState(prev, routeAfterWorryPublish(...))',
      'resolveAppRouteState(prev, routeAfterReplyPublish(...))',
    ],
    phase3Boundary: 'may remain in App shell',
  },
  {
    id: 'global-shell-effects',
    category: 'app-shell orchestration',
    responsibility: 'Own global PWA install prompt, foreground notification listener, presence update, and global filter/error overlays',
    appEvidence: [
      "window.addEventListener('beforeinstallprompt', handler)",
      'onMessage(messaging, payload => ...)',
      'updateDoc(doc(db, ...), { lastActive: serverTimestamp() })',
      'filterAlert overlay JSX',
    ],
    phase3Boundary: 'may remain in App shell',
  },
  {
    id: 'route-branch-selection',
    category: 'route rendering',
    responsibility: 'Select which authenticated, onboarding, policy, account, write, detail, and feed branch renders for currentRoute',
    appEvidence: [
      "currentRoute === 'login'",
      "currentRoute === 'onboarding'",
      "currentRoute === 'write_worry'",
      "currentRoute === 'privacy_policy' || currentRoute === 'operation_policy'",
      'tabForRoute(view)',
    ],
    phase3Boundary: 'route rendering boundary',
  },
  {
    id: 'feature-feed-pass-reply',
    category: 'feature container logic',
    responsibility: 'Wire received-worries feed, delivery read state, pass mutation, selected worry state, and reply publication',
    appEvidence: [
      'useHomeWorryFeed({ profile, user, refreshKey })',
      'markDeliveryReadWithServer(...)',
      'passDeliveryViaApi(...)',
      'publishReplyViaApi(...)',
      'filterSuppressedFeedWorries(...)',
    ],
    phase3Boundary: 'future route container',
  },
  {
    id: 'feature-worry-publication',
    category: 'feature container logic',
    responsibility: 'Wire worry draft validation state to worry publication API and publish-success route dispatch',
    appEvidence: [
      'publishWorryViaApi({ user, content })',
      "setWorryDraft('')",
      'routeAfterWorryPublish({ worryId: result.worryId })',
    ],
    phase3Boundary: 'future route container',
  },
  {
    id: 'feature-my-page-account-push',
    category: 'feature container logic',
    responsibility: 'Wire my-page read models, push registration, PWA install/share, logout, and account deletion',
    appEvidence: [
      'useMyWorries({ user })',
      'useMyGivenReplies({ user })',
      'usePushRegistration({ user, loading })',
      'deleteMyAccountViaApi({ user })',
      'signOut(auth)',
    ],
    phase3Boundary: 'future route container',
  },
  {
    id: 'feature-reply-feedback',
    category: 'feature container logic',
    responsibility: 'Wire reply detail feedback/comment drafts and feedback mutation internals',
    appEvidence: [
      'submitReplyFeedbackWithProductionAdapters(...)',
      'feedbackCommentDrafts',
      'setSelectedReply(prev => ...)',
    ],
    phase3Boundary: 'future route container',
  },
  {
    id: 'inline-screen-jsx',
    category: 'presentational screen rendering',
    responsibility: 'Render route-local layouts, cards, forms, copy, empty states, skeleton text, and visual button arrangements inline',
    appEvidence: [
      '<WriteForm ... />',
      '<OnboardingForm ... />',
      'visibleFeedWorries.map(worry => ...)',
      'myGivenReplies.map(reply => ...)',
      '정책 본문 준비 중입니다.',
    ],
    phase3Boundary: 'future presentational screen',
  },
] as const satisfies readonly AppResponsibilityInventoryItem[];
