# Splash

## Reference Intent

Entry loading experience with strong brand recognition, centered motif, and stable vertical rhythm on a 393px-wide mobile canvas.

## Production Files To Inspect

- `src/screens/loadingShell/LoadingShellScreen.tsx`
- `src/screens/loadingShell/contract.ts`
- `src/screens/shared/ui.tsx`
- `src/screens/shared/uiContract.ts`
- `src/index.css`

## States To Verify

- `splash`
- `app-loading`
- `session-loading`
- `profile-loading`
- `route-loading`

## Risks

- The production loading shell is shared by multiple loading reasons, so a splash-only visual tweak can affect app/session/profile/route loading states.
- Safe-area bottom spacing and the brand label position should be checked on small mobile heights.
- Reference splash PNG exists, but the production component has dynamic loading copy.

## Recommended Edit Boundary

Limit changes to `src/screens/loadingShell/LoadingShellScreen.tsx`, shared primitives, and tokens. Do not change loading reasons or contract shape for pixel work.
