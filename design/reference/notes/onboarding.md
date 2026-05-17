# Onboarding

## Reference Intent

Production onboarding combines basic profile fields, duplicate nickname confirmation, and interest selection. The reference package has separate PNGs for basic, duplicate, and interests states; compare them against the single production screen flow.

## Production Files To Inspect

- `src/screens/onboarding/OnboardingScreen.tsx`
- `src/screens/onboarding/OnboardingContainer.tsx`
- `src/screens/onboarding/contract.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `default`
- `duplicate-checking`
- `duplicate-available`
- `validation-error`
- `submitting`

## Risks

- Production flow is represented differently from the reference screens, so do not assume a one-screen-to-one-file mapping.
- Nickname validation, duplicate-check messaging, and interest ordering are behavior-sensitive and should remain unchanged.
- Grid spacing and chip wrapping can break on narrow mobile widths.

## Recommended Edit Boundary

Limit changes to `OnboardingScreen.tsx`, shared UI primitives, and tokens. Treat `OnboardingContainer.tsx` and `contract.ts` as inspection-only for pixel work.
