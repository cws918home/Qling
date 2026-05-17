# Received Worries

## Reference Intent

Answer queue screen showing received worry cards, unread emphasis, category/date metadata, pass action affordance, and bottom navigation spacing.

## Production Files To Inspect

- `src/screens/receivedWorries/ReceivedWorriesScreen.tsx`
- `src/screens/receivedWorries/ReceivedWorriesContainer.tsx`
- `src/screens/receivedWorries/contract.ts`
- `src/screens/receivedWorries/mapping.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `default`
- `loading`
- `empty`
- `error`
- `pass-action`

## Risks

- Card layout changes may affect unread emphasis and scannability.
- Empty, loading, and error states need the same shell and bottom navigation spacing as the populated state.
- Pass action state must remain visually clear without changing service or container behavior.
- Bottom navigation spacing depends on shared shell tokens and safe-area handling.

## Recommended Edit Boundary

Limit visual edits to `ReceivedWorriesScreen.tsx`, shared UI primitives, and tokens. Do not edit container policy, contract, mapping, services, or pass behavior.
