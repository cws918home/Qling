# Qling Design Reference Package

`design/reference` is the canonical reference package for Qling production UI pixel-alignment work. It records design evidence, maps that evidence to production UI files, and defines safe edit boundaries for future Codex-driven visual alignment tasks.

This package is not production implementation. Production app source lives under `src/`, production screen modules live under `src/screens/*`, shared UI primitives live in `src/screens/shared/ui.tsx`, and global design tokens live in `src/index.css`.

## What Lives Here

- `screen-map.json`: machine-readable mapping from reference screen slugs to production files, shared dependencies, allowed edit scope, files that must not be edited for pixel work, states to check, and verification commands.
- `screenshots/`: normalized reference screenshots for mapped production screens. Existing PNG references were copied here where they clearly map to production screens.
- `css/`: advisory CSS export files. `reference-export.css` is intentionally kept as a mapped CSS export reference. CSS arrays in `screen-map.json` may be empty or point to placeholder/advisory exports until better exports are added.
- `notes/`: per-screen notes covering reference intent, production files to inspect, states to verify, risks, and recommended edit boundaries.
- `tokens.md`: guidance for translating exported design measurements into Qling tokens and shared UI primitives.
- `src/`, `pngs/`, `screen-registry.*`, `CODEX_USAGE.md`, and `validate-reference.mjs`: the existing static fixture preview package and registry. These are preserved as reference material, not production source.

## Reference Evidence vs Production Code

Reference PNGs and exported CSS are measurement evidence. They are not enough to safely edit production UI by themselves.

Future agents must inspect the mapped production files in `screen-map.json` before changing any UI. Figma/exported CSS must not be blindly copied into production screens because it may contain fixture-only absolute positioning, hard-coded values, non-production component structure, or measurements that need responsive translation.

Translate visual differences into existing `--qling-*` tokens in `src/index.css` and shared UI primitives in `src/screens/shared/ui.tsx` where possible. Add new hard-coded color, radius, spacing, or shadow values only when a token gap is explicitly documented.

## Using `screen-map.json`

For each screen entry:

- `reference.screenshots` points to screenshot evidence. Arrays may be empty when a screenshot is an explicit reference gap.
- `reference.css` points to advisory CSS export evidence. These files are not implementation code.
- `reference.notes` points to the human-readable per-screen note.
- `production` maps the reference slug to real production screen, container, contract, and mapping files. Omitted or `null` fields mean the current codebase does not have a direct file for that role.
- `sharedDependencies` lists shared primitives and tokens that may affect the screen.
- `allowedEditScope` defines the normal visual-edit boundary for future pixel work.
- `mustNotEditForPixelWork` lists files and patterns that should remain untouched during visual alignment.
- `statesToCheck` defines the production states that need visual verification.

If a production path is missing or represented differently from the reference package, document the mismatch instead of creating fake production files.

## Safe Pixel-Alignment Workflow

1. Open the relevant `screen-map.json` entry.
2. Read the matching note in `notes/`.
3. Inspect the listed production screen and shared dependencies.
4. Compare the reference screenshot/CSS evidence against the production states listed in `statesToCheck`.
5. Make the smallest visual-only edit inside `allowedEditScope`.
6. Avoid every path listed in `mustNotEditForPixelWork`.
7. Run validation and the listed project checks.

Production behavior must not change during visual alignment work. Do not change routing, containers, contracts, mappings, Firebase, Auth, API calls, Firestore rules, services, server code, or data behavior unless a separate task explicitly asks for behavior changes.

## Validation

Run:

```bash
npm run validate:design-reference
```

The validator parses `screen-map.json`, verifies referenced paths exist when present, checks every screen has `mustNotEditForPixelWork`, and ensures every screen has at least one state in `statesToCheck`.

## Current Gaps

This package does not yet provide a guaranteed automatic pixel-perfect diff. It also does not provide a full screenshot capture workflow unless separately added. Missing screenshots, such as generic loading-shell states, should be treated as explicit reference gaps rather than inferred as pixel-ready evidence.

The package gives future agents safer context for visual alignment. It does not grant permission to modify production behavior.
