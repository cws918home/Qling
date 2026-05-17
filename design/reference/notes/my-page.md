# My Page

## Reference Intent

Profile and action list screen with clear account affordances, profile spacing, settings row rhythm, and bottom navigation consistency.

## Production Files To Inspect

- `src/screens/myPage/MyPageScreen.tsx`
- `src/screens/myPage/MyPageContainer.tsx`
- `src/screens/myPage/contract.ts`
- `src/screens/myPage/mapping.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `default`
- `loading`
- `error`
- `account-action-dialog`

## Risks

- Profile/action list spacing should remain consistent with `SettingsRow` and shared cards.
- Bottom navigation spacing is shared with received worries and content lists.
- Account action dialogs are behavior-sensitive; do not alter logout or deletion flow for visual work.

## Recommended Edit Boundary

Limit changes to `MyPageScreen.tsx`, shared settings/dialog primitives, and tokens. Treat container, contract, and mapping as inspection-only.
