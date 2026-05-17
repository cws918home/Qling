# Design

This directory contains design support material with two different purposes:

- `design/reference/src/`, `design/reference/pngs/`, and `design/reference/screen-registry.*` preserve the existing static fixture preview package.
- `design/reference/README.md`, `design/reference/screen-map.json`, `design/reference/tokens.md`, `design/reference/screenshots/`, `design/reference/css/`, and `design/reference/notes/` are the production pixel-alignment reference package.

Use the production reference package before making Codex-driven UI alignment changes. It maps design assets to actual `src/screens/*` files and documents edit boundaries so fixture CSS is not copied blindly into production code.
