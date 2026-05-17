# Reply Detail

## Reference Intent

Reply detail view with content sheet/card spacing, reply body typography, feedback/action area, and modal/dialog consistency.

## Production Files To Inspect

- `src/screens/replyDetail/ReplyDetailScreen.tsx`
- `src/screens/replyDetail/ReplyDetailContainer.tsx`
- `src/screens/replyDetail/contract.ts`
- `src/screens/replyDetail/mapping.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `default`
- `loading`
- `error`
- `feedback-submitting`
- `dialog-open`

## Risks

- Reply body typography should preserve readability for long text and line breaks.
- Feedback/action area spacing can interact with modal/dialog states.
- Dialog visual changes should stay consistent with shared `QlingDialog` behavior.
- The reference is mapped from the existing answer-check PNG, so confirm whether future design work needs a dedicated reply-detail capture.

## Recommended Edit Boundary

Limit changes to `ReplyDetailScreen.tsx`, shared dialog/card primitives, and tokens. Do not edit container, contract, mapping, or feedback services for visual alignment.
