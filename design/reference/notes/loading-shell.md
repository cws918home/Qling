# Loading Shell

## Reference Intent

Generic production loading shell for app, session, profile, and route transitions. It is related to splash but has no dedicated normalized screenshot yet.

## Production Files To Inspect

- `src/screens/loadingShell/LoadingShellScreen.tsx`
- `src/screens/loadingShell/contract.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `app-loading`
- `session-loading`
- `profile-loading`
- `route-loading`

## Risks

- No dedicated PNG reference exists for generic loading states; use fixture loading component and production behavior as secondary evidence.
- Copy changes differ by loading reason, so text wrapping should be checked.
- Centering and safe-area padding must remain stable on compact mobile heights.

## Recommended Edit Boundary

Limit changes to `LoadingShellScreen.tsx`, shared motif/shell primitives, and tokens. Do not change loading reason contract values for visual alignment.
