# Token Alignment Notes

Production token source: `src/index.css`.

Shared UI source: `src/screens/shared/ui.tsx`.

Shared UI contracts: `src/screens/shared/uiContract.ts`.

Reference CSS from `design/reference/css/` or `design/reference/src/styles/index.css` must be translated into existing `--qling-*` custom properties where possible. Use exported CSS as measurement evidence for color, radius, spacing, shadow, and typography, not as implementation code.

Do not introduce new hard-coded color, radius, spacing, or shadow values in production screens unless a token gap is explicitly documented in the screen note or follow-up task. If a value is shared across screens, prefer adding or adjusting a token in `src/index.css` and then consuming it through shared UI primitives.

Absolute positioning in exported reference components should not be copied into production screens unless the production component is intentionally absolute-positioned. Prefer the production app's responsive layout, safe-area handling, and shared shell primitives.

Before changing a token, inspect all screens listed in `screen-map.json` that depend on `src/index.css` and `src/screens/shared/ui.tsx`. Token changes have cross-screen impact and require broader visual verification than a single screen edit.
