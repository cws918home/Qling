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

## Figma Loading Indicator Notes

The removed `design/reference/figma.txt` export included Figma guidance for a circular indeterminate progress indicator. Preserve the guidance as implementation direction, not as code:

- Indeterminate loading indicators are appropriate when wait time is unknown, progress cannot be detected, or exact duration is not useful to the user.
- Loading motion and configuration should be consistent across Qling loading states. Do not create one-off spinner timing, sizing, or color rules for only one loading screen unless a token or shared primitive gap is documented.
- Future pixel work should map loading visuals through shared UI primitives and `src/index.css` tokens where possible, rather than copying screen-specific Figma CSS or absolute positioning into `LoadingShellScreen.tsx`.
- Motion can help draw attention, but production behavior must not change merely to match animation text from an export. Do not add artificial delays, fake progress, route timing changes, or data-loading changes for visual alignment.
- A wave or more expressive active track can be considered only if the design system intentionally adopts it across Qling loading states.
- The generic `loading-shell` entry currently has no normalized screenshot in `screen-map.json`; treat that as an explicit reference gap. Use the splash screenshot, fixture loading component, and production behavior only as secondary evidence until a dedicated loading-shell screenshot is added.

## Recommended Edit Boundary

Limit changes to `LoadingShellScreen.tsx`, shared motif/shell primitives, and tokens. Do not change loading reason contract values for visual alignment.
