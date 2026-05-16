export const PRD_APP_TABS = ['답변하기', '나의 고민', '마이페이지'] as const;

export type PrdAppTab = (typeof PRD_APP_TABS)[number];

export type AppRoute =
  | 'splash'
  | 'loading'
  | 'login'
  | 'onboarding'
  | 'onboarding_basic'
  | 'onboarding_duplicate_check'
  | 'onboarding_gender_age'
  | 'onboarding_interests'
  | PrdAppTab
  | 'received_worries'
  | 'write_worry'
  | 'write_reply'
  | 'received_answer_detail'
  | 'read_received_reply'
  | 'my_answer_detail'
  | 'read_my_reply'
  | 'answer_check'
  | 'my_worries'
  | 'my_worry_detail'
  | 'my_page'
  | 'edit_interests'
  | 'my_answers'
  | 'privacy_policy'
  | 'operation_policy'
  | 'logout_confirmation'
  | 'account_deletion_confirmation'
  | 'notification_settings'
  | 'app_install_guide';

export type AppRouteState =
  | { route: Exclude<AppRoute, 'write_reply' | 'received_answer_detail' | 'read_received_reply' | 'my_answer_detail' | 'read_my_reply' | 'my_worry_detail'> }
  | { route: 'write_reply'; deliveryId: string; worryId?: string }
  | { route: 'received_answer_detail' | 'read_received_reply'; worryId: string; replyId: string }
  | { route: 'my_answer_detail' | 'read_my_reply'; replyId: string; deliveryId?: string; worryId?: string }
  | { route: 'my_worry_detail'; worryId: string };

export type AppRouteViewState = AppRoute | AppRouteState;

export const DEFAULT_AUTHENTICATED_TAB: PrdAppTab = '답변하기';
export const DEFAULT_AUTHENTICATED_ROUTE: AppRoute = 'received_worries';
export const ANSWER_FEED_ROUTE_ALIASES = [DEFAULT_AUTHENTICATED_TAB, DEFAULT_AUTHENTICATED_ROUTE] as const;

export const MY_PAGE_MORE_ITEMS = [
  'notification_settings',
  'app_install_guide',
  'privacy_policy',
  'operation_policy',
  'logout',
  'delete_account',
] as const;

export const DEPRECATED_MY_PAGE_MORE_ITEMS = ['usage_guide', 'policy'] as const;

export type MyPageMoreItem = (typeof MY_PAGE_MORE_ITEMS)[number];
export type DeprecatedMyPageMoreItem = (typeof DEPRECATED_MY_PAGE_MORE_ITEMS)[number];

export const MY_PAGE_SUBROUTES = [
  'edit_interests',
  'my_answers',
  'privacy_policy',
  'operation_policy',
  'logout_confirmation',
  'account_deletion_confirmation',
  'notification_settings',
  'app_install_guide',
] as const satisfies readonly AppRoute[];

export const CENTRAL_BOTTOM_NAVIGATION_ACTION = {
  label: '고민 작성',
  accessibleLabel: '고민 작성',
  targetRoute: 'write_worry',
  ownerTab: '나의 고민',
} as const satisfies {
  label: string;
  accessibleLabel: string;
  targetRoute: AppRoute;
  ownerTab: PrdAppTab;
};

export const REQUIRED_PHASE_2_ROUTE_STATES = [
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
] as const satisfies readonly AppRoute[];

export function routeName(route: AppRouteViewState): AppRoute {
  return typeof route === 'string' ? route : route.route;
}

export function resolveAppRouteState(_previousRoute: AppRouteViewState, nextRoute: AppRouteViewState): AppRouteViewState {
  return nextRoute;
}

export function routeAfterAuthProfileLoad(previousRoute: AppRouteViewState): AppRoute {
  const previousRouteName = routeName(previousRoute);
  return previousRouteName === 'login'
    || previousRouteName === 'onboarding'
    || previousRouteName.startsWith('onboarding_')
    || previousRouteName === 'splash'
    || previousRouteName === 'loading'
    ? DEFAULT_AUTHENTICATED_TAB
    : previousRouteName;
}

export function routeAfterOnboardingComplete(): AppRoute {
  return DEFAULT_AUTHENTICATED_TAB;
}

export function routeAfterWorryPublish(params: { worryId: string }): AppRouteState {
  return { route: 'my_worry_detail', worryId: params.worryId };
}

export function routeAfterReplyPublish(params: {
  replyId: string;
  deliveryId?: string;
  worryId?: string;
}): AppRouteState {
  return {
    route: 'my_answer_detail',
    replyId: params.replyId,
    deliveryId: params.deliveryId,
    worryId: params.worryId,
  };
}

export function routeAfterPass(): AppRoute {
  return DEFAULT_AUTHENTICATED_TAB;
}

export function routeAfterFeedbackPublish(currentRoute: AppRouteViewState): AppRoute {
  return routeName(currentRoute);
}

export function routeToWriteWorry(): AppRoute {
  return CENTRAL_BOTTOM_NAVIGATION_ACTION.targetRoute;
}

export function routeToWriteReply(params: { deliveryId: string; worryId?: string }): AppRouteState {
  return { route: 'write_reply', deliveryId: params.deliveryId, worryId: params.worryId };
}

export function routeToReceivedReplyDetail(params: { worryId: string; replyId: string }): AppRouteState {
  return { route: 'received_answer_detail', worryId: params.worryId, replyId: params.replyId };
}

export function routeToMyReplyDetail(params: {
  replyId: string;
  deliveryId?: string;
  worryId?: string;
}): AppRouteState {
  return {
    route: 'my_answer_detail',
    replyId: params.replyId,
    deliveryId: params.deliveryId,
    worryId: params.worryId,
  };
}

export function routeToMyAnswers(): AppRoute {
  return 'my_answers';
}

export function routeToMyWorries(): AppRoute {
  return '나의 고민';
}

export function routeToMyWorryDetail(params: { worryId: string }): AppRouteState {
  return { route: 'my_worry_detail', worryId: params.worryId };
}

export function routeToEditInterests(): AppRoute {
  return 'edit_interests';
}

export function backRouteForRoute(route: AppRouteViewState): AppRoute {
  const currentRoute = routeName(route);
  if (currentRoute === 'write_worry' || currentRoute === 'my_worry_detail') return '나의 고민';
  if (currentRoute === 'write_reply') return DEFAULT_AUTHENTICATED_TAB;
  if (currentRoute === 'received_answer_detail' || currentRoute === 'read_received_reply') return '나의 고민';
  if (currentRoute === 'my_answer_detail' || currentRoute === 'read_my_reply') return 'my_answers';
  if (currentRoute === 'my_worries') return '나의 고민';
  if (MY_PAGE_SUBROUTES.includes(currentRoute as (typeof MY_PAGE_SUBROUTES)[number])) return '마이페이지';
  return DEFAULT_AUTHENTICATED_TAB;
}

export function backRouteFromWriteWorry(): AppRoute {
  return backRouteForRoute('write_worry');
}

export function backRouteFromWriteReply(): AppRoute {
  return backRouteForRoute('write_reply');
}

export function backRouteFromReceivedReplyDetail(): AppRoute {
  return backRouteForRoute('received_answer_detail');
}

export function backRouteFromMyReplyDetail(): AppRoute {
  return backRouteForRoute('my_answer_detail');
}

export function tabForRoute(route: AppRouteViewState): PrdAppTab | null {
  const currentRoute = routeName(route);
  if (PRD_APP_TABS.includes(currentRoute as PrdAppTab)) return currentRoute as PrdAppTab;
  if (currentRoute === 'received_worries' || currentRoute === 'write_reply') return '답변하기';
  if (
    currentRoute === 'my_worries'
    || currentRoute === 'write_worry'
    || currentRoute === 'received_answer_detail'
    || currentRoute === 'read_received_reply'
    || currentRoute === 'my_worry_detail'
  ) {
    return '나의 고민';
  }
  if (
    currentRoute === 'my_page'
    || currentRoute === 'my_answers'
    || currentRoute === 'my_answer_detail'
    || currentRoute === 'read_my_reply'
    || MY_PAGE_SUBROUTES.includes(currentRoute as (typeof MY_PAGE_SUBROUTES)[number])
  ) {
    return '마이페이지';
  }
  return null;
}
