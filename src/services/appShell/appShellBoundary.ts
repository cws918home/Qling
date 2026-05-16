export const APP_SHELL_ALLOWED_RESPONSIBILITIES = [
  'auth/profile loading',
  'top-level AppRouteViewState',
  'route selection and route transition dispatch',
  'global shell layout',
  'global overlays',
  'shell-level providers',
  'bottom navigation mount/visibility decision',
  'route container selection',
] as const;

export const APP_SHELL_FORBIDDEN_RESPONSIBILITIES = [
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
] as const;

export const APP_TSX_MAX_RESPONSIBILITIES_BEFORE_PHASE_5 = {
  mayKeep: APP_SHELL_ALLOWED_RESPONSIBILITIES,
  mustNotAdd: [
    'new Firestore queries in App.tsx',
    'new feature mutation details in App.tsx',
    'new bulk presentational screen JSX in App.tsx',
    'new route policy helpers in App.tsx',
    'new design sample data in App.tsx',
    'new Firebase/API/service internals in presentational screen components',
  ],
  phase5ExitTarget: [
    'received-worries feed loading/pass/open/reply wiring moves behind a received-worries route container',
    'write-reply selected worry and publication wiring moves behind a write-reply route container',
    'App.tsx keeps route transition dispatch and container selection only for those routes',
  ],
} as const;

export type AppShellAllowedResponsibility = (typeof APP_SHELL_ALLOWED_RESPONSIBILITIES)[number];
export type AppShellForbiddenResponsibility = (typeof APP_SHELL_FORBIDDEN_RESPONSIBILITIES)[number];
