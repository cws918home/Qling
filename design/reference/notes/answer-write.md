# Answer Write

## Reference Intent

Reply writing screen with original worry context, textarea/input spacing, helper copy, moderation feedback, and submit affordance.

## Production Files To Inspect

- `src/screens/writeForm/WriteFormScreen.tsx`
- `src/screens/writeForm/WriteReplyContainer.tsx`
- `src/screens/writeForm/contract.ts`
- `src/screens/writeForm/mapping.ts`
- `src/screens/shared/ui.tsx`
- `src/index.css`

## States To Verify

- `default`
- `input-error`
- `moderation-checking`
- `moderation-rejected`
- `submit-loading`
- `submit-disabled`

## Risks

- Textarea spacing and sticky submit placement are keyboard-sensitive.
- Moderation rejection and failed moderation states must remain readable and must not change moderation behavior.
- The same production screen also renders worry writing, so shared edits in `WriteFormScreen.tsx` can affect both flows.
- Submit disabled/loading state must stay tied to existing draft state.

## Recommended Edit Boundary

Limit changes to `WriteFormScreen.tsx`, shared textarea/CTA primitives, and tokens. Do not edit `WriteReplyContainer.tsx`, contracts, mappings, moderation logic, or publication services for pixel work.
