# My Answers

## Reference Intent

List of answers written by the current user with readable card content, metadata spacing, empty state, and consistent bottom navigation.

## Production Files To Inspect

- `src/screens/myPage/MyAnswersScreen.tsx`
- `src/screens/myPage/MyAnswersContainer.tsx`
- `src/screens/myPage/contract.ts`
- `src/screens/myPage/mapping.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `default`
- `loading`
- `empty`
- `error`

## Risks

- Answer body excerpts need robust wrapping and spacing for long text.
- Shared my-page contract and mapping also serve other my-page screens.
- Bottom navigation and list padding should match `my-worries` and `received-worries`.

## Recommended Edit Boundary

Limit changes to `MyAnswersScreen.tsx`, shared card/list primitives, and tokens. Do not edit mapping or data services for pixel work.
