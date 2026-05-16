import {
  MY_PAGE_SUBROUTES,
  routeName,
  tabForRoute,
  type AppRoute,
  type AppRouteViewState,
  type PrdAppTab,
} from './prdNavigationPolicy';

export type RouteRenderingGroup =
  | 'authenticated shell'
  | 'onboarding flow'
  | 'received worries'
  | 'write worry'
  | 'write reply'
  | 'reply details'
  | 'my-page/account'
  | 'policy screens';

export const REQUIRED_ROUTE_RENDERING_GROUPS = [
  'authenticated shell',
  'onboarding flow',
  'received worries',
  'write worry',
  'write reply',
  'reply details',
  'my-page/account',
  'policy screens',
] as const satisfies readonly RouteRenderingGroup[];

export const ROUTE_RENDERING_BOUNDARY = {
  'authenticated shell': {
    routes: [
      '답변하기',
      'received_worries',
      '나의 고민',
      'my_worries',
      'write_worry',
      'write_reply',
      'received_answer_detail',
      'read_received_reply',
      'my_worry_detail',
      '마이페이지',
      'edit_interests',
      'my_answers',
      'my_answer_detail',
      'read_my_reply',
      'privacy_policy',
      'operation_policy',
      'logout_confirmation',
      'account_deletion_confirmation',
      'notification_settings',
      'app_install_guide',
    ],
    appBoundary: 'App shell may mount header, main content frame, global overlays, and bottom navigation visibility for these routes.',
    nextContainerBoundary: 'Route-specific data loading, mutations, and presentational JSX move to feature containers in Phases 5-7.',
  },
  'onboarding flow': {
    routes: [
      'onboarding',
      'onboarding_basic',
      'onboarding_duplicate_check',
      'onboarding_gender_age',
      'onboarding_interests',
    ],
    appBoundary: 'App shell may select onboarding route rendering and submit transition dispatch.',
    nextContainerBoundary: 'Nickname, age, duplicate-check, and interests form contracts are Phase 4/9 work.',
  },
  'received worries': {
    routes: ['답변하기', 'received_worries'],
    appBoundary: 'App shell may select the received-worries route container.',
    nextContainerBoundary: 'Feed loading, pass/open/read-state, reply entry, loading/empty/error presentation move in Phase 5.',
  },
  'write worry': {
    routes: ['write_worry'],
    appBoundary: 'App shell may select the write-worry route container and dispatch publish-success routes.',
    nextContainerBoundary: 'Draft, validation, moderation/publication wiring, and form presentation move in Phase 6.',
  },
  'write reply': {
    routes: ['write_reply'],
    appBoundary: 'App shell may select the write-reply route container and preserve delivery/worry route ids.',
    nextContainerBoundary: 'Selected worry lookup, reply draft, moderation/publication wiring, and form presentation move in Phase 6.',
  },
  'reply details': {
    routes: ['received_answer_detail', 'read_received_reply', 'my_answer_detail', 'read_my_reply', 'my_worry_detail'],
    appBoundary: 'App shell may select the reply/worry detail route container and preserve detail ids.',
    nextContainerBoundary: 'Reply detail read models, feedback/comment mutations, and detail presentation move in Phase 7.',
  },
  'my-page/account': {
    routes: [
      '마이페이지',
      'my_page',
      'edit_interests',
      'my_answers',
      'logout_confirmation',
      'account_deletion_confirmation',
      'notification_settings',
      'app_install_guide',
    ],
    appBoundary: 'App shell may select my-page/account route containers and modal routes.',
    nextContainerBoundary: 'Profile, account, push, PWA, my-answers, and edit-interests wiring move in Phase 7.',
  },
  'policy screens': {
    routes: ['privacy_policy', 'operation_policy'],
    appBoundary: 'App shell may select the policy route container.',
    nextContainerBoundary: 'Policy body loading and empty-state presentation move in Phase 7/10.',
  },
} as const satisfies Record<RouteRenderingGroup, {
  readonly routes: readonly AppRoute[];
  readonly appBoundary: string;
  readonly nextContainerBoundary: string;
}>;

export type RouteRenderingBoundary = {
  readonly currentRoute: AppRoute;
  readonly routeGroup: RouteRenderingGroup | 'login/splash/loading';
  readonly authenticatedTab: PrdAppTab | null;
  readonly mountsAuthenticatedShell: boolean;
  readonly mountsBottomNavigation: boolean;
};

export function routeRenderingBoundaryForRoute(view: AppRouteViewState): RouteRenderingBoundary {
  const currentRoute = routeName(view);
  const authenticatedTab = tabForRoute(view);
  const routeGroup = routeRenderingGroupForRoute(currentRoute);

  return {
    currentRoute,
    routeGroup,
    authenticatedTab,
    mountsAuthenticatedShell: routeGroup !== 'login/splash/loading' && routeGroup !== 'onboarding flow',
    mountsBottomNavigation: authenticatedTab !== null,
  };
}

export function routeRenderingGroupForRoute(route: AppRoute): RouteRenderingBoundary['routeGroup'] {
  if (route === 'login' || route === 'loading' || route === 'splash') return 'login/splash/loading';
  if (isRouteInGroup(route, 'onboarding flow')) return 'onboarding flow';
  if (isRouteInGroup(route, 'policy screens')) return 'policy screens';
  if (isRouteInGroup(route, 'write reply')) return 'write reply';
  if (isRouteInGroup(route, 'write worry')) return 'write worry';
  if (isRouteInGroup(route, 'reply details')) return 'reply details';
  if (isRouteInGroup(route, 'received worries')) return 'received worries';
  if (isRouteInGroup(route, 'my-page/account')) return 'my-page/account';
  if (MY_PAGE_SUBROUTES.includes(route as (typeof MY_PAGE_SUBROUTES)[number])) return 'my-page/account';
  if (isRouteInGroup(route, 'authenticated shell')) return 'authenticated shell';
  return 'login/splash/loading';
}

export function isRouteInGroup(route: AppRoute, group: RouteRenderingGroup): boolean {
  return (ROUTE_RENDERING_BOUNDARY[group].routes as readonly AppRoute[]).includes(route);
}
