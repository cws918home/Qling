export const PRD_APP_TABS = ['답변하기', '나의 고민', '마이페이지'] as const;

export type PrdAppTab = (typeof PRD_APP_TABS)[number];

export type AppRoute =
  | 'login'
  | 'onboarding'
  | PrdAppTab
  | 'write_worry'
  | 'write_reply'
  | 'read_received_reply'
  | 'read_my_reply';

export const DEFAULT_AUTHENTICATED_TAB: PrdAppTab = '답변하기';

export const MY_PAGE_MORE_ITEMS = [
  'notification_guide',
  'notification_settings',
  'usage_guide',
  'policy',
  'privacy_policy',
  'operation_policy',
  'logout',
  'delete_account',
] as const;

export type MyPageMoreItem = (typeof MY_PAGE_MORE_ITEMS)[number];

export function routeAfterAuthProfileLoad(previousRoute: AppRoute): AppRoute {
  return previousRoute === 'login' || previousRoute === 'onboarding'
    ? DEFAULT_AUTHENTICATED_TAB
    : previousRoute;
}

export function routeAfterOnboardingComplete(): AppRoute {
  return DEFAULT_AUTHENTICATED_TAB;
}

export function routeAfterWorryPublish(): AppRoute {
  return '나의 고민';
}

export function routeAfterReplyPublish(): AppRoute {
  return DEFAULT_AUTHENTICATED_TAB;
}

export function routeAfterPass(): AppRoute {
  return DEFAULT_AUTHENTICATED_TAB;
}

export function routeAfterFeedbackPublish(currentRoute: AppRoute): AppRoute {
  return currentRoute;
}

export function routeToWriteWorry(): AppRoute {
  return 'write_worry';
}

export function routeToWriteReply(): AppRoute {
  return 'write_reply';
}

export function routeToReceivedReplyDetail(): AppRoute {
  return 'read_received_reply';
}

export function routeToMyReplyDetail(): AppRoute {
  return 'read_my_reply';
}

export function backRouteFromWriteWorry(): AppRoute {
  return '나의 고민';
}

export function backRouteFromWriteReply(): AppRoute {
  return DEFAULT_AUTHENTICATED_TAB;
}

export function backRouteFromReceivedReplyDetail(): AppRoute {
  return '나의 고민';
}

export function backRouteFromMyReplyDetail(): AppRoute {
  return '마이페이지';
}

export function tabForRoute(route: AppRoute): PrdAppTab | null {
  if (PRD_APP_TABS.includes(route as PrdAppTab)) return route as PrdAppTab;
  if (route === 'write_worry' || route === 'read_received_reply') return '나의 고민';
  if (route === 'read_my_reply') return '마이페이지';
  if (route === 'write_reply') return DEFAULT_AUTHENTICATED_TAB;
  return null;
}
