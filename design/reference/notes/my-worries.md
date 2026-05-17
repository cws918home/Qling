# My Worries

## Reference Intent

List of worries written by the current user, including card rhythm, reply access affordances, empty state, and bottom navigation spacing.

## Production Files To Inspect

- `src/screens/myPage/MyWorriesScreen.tsx`
- `src/screens/myPage/MyWorriesContainer.tsx`
- `src/screens/myPage/contract.ts`
- `src/screens/myPage/mapping.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `default`
- `loading`
- `empty`
- `error`
- `reply-list-open`

## Risks

- Long worry text and reply counts can change card height.
- Empty/loading/error states should not shift bottom navigation spacing.
- Reply access state may share visuals with reply detail and list rows.

## Recommended Edit Boundary

Limit changes to `MyWorriesScreen.tsx`, shared card/list primitives, and tokens. Do not change data mapping or reply-fetching behavior.
