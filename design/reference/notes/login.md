# Login

## Reference Intent

Login entry screen with brand motif, large headline, Google sign-in control, and clear error/processing feedback.

## Production Files To Inspect

- `src/screens/loadingShell/LoginScreen.tsx`
- `src/screens/loadingShell/contract.ts`
- `src/screens/shared/ui.tsx`
- `src/screens/shared/uiContract.ts`
- `src/index.css`

## States To Verify

- `default`
- `checking`
- `signing-in`
- `error`

## Risks

- Button loading and disabled states must remain accessible and must not change Auth behavior.
- The inline Google mark is production-owned; do not replace it with fixture-only assets without a separate asset decision.
- Error sheet spacing should stay consistent with `ContentSheet` and shared CTA primitives.

## Recommended Edit Boundary

Limit changes to `LoginScreen.tsx`, shared UI primitives, and tokens. Do not edit Auth/session logic for visual alignment.
