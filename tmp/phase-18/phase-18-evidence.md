# Phase 18 Evidence

Date: 2026-05-17

## Scope and Preconditions

- `docs/phase.md`: absent locally, so Phase 18 scope follows `docs/TODO.md` and `docs/PRD.md`.
- Phase 6, Phase 10, Phase 12, Phase 14 TODOs are checked in `docs/TODO.md`.
- Code boundary recheck:
  - `src/screens/writeForm/WriteWorryContainer.tsx` owns draft persistence, validation, `publishWorryViaApi`, moderation state, draft clearing, and `routeAfterWorryPublish` transition via policy result.
  - `src/screens/writeForm/WriteFormScreen.tsx` remains props/callback presentation and has no publication, Firebase, draft-service, validation-service, or route-policy imports.
  - `src/screens/myPage/MyWorriesContainer.tsx` owns `useMyWorries`, `useRepliesForWorry`, read-state marking, and route helpers.
  - `src/screens/myPage/MyWorriesScreen.tsx` remains props/callback presentation and has no service/Firebase/API imports.
  - `src/screens/shared/ui.tsx` provides bottom navigation, central action, card, textarea, CTA, modal, loading/error/empty primitives.

## Manual / Static HTML Evidence

| Route/state | Data condition | Viewport | Result | Evidence path |
| --- | --- | --- | --- | --- |
| `write_worry` empty | empty draft, maxLength 1000 from contract | 393px x 852px fixed evidence frame | disabled CTA, live character count, shared textarea, no fake status/home chrome | `tmp/phase-18/write-worry.html` |
| `write_worry` validation/moderation | invalid draft and rejected moderation copy from props | 393px x 852px fixed evidence frame | validation text and moderation rejection rendered without screen-side API logic | `tmp/phase-18/write-worry.html` |
| `write_worry` processing | moderation checking and disabled/processing state from props | 393px x 852px fixed evidence frame | sticky CTA stays above bottom nav/keyboard-safe area | `tmp/phase-18/write-worry.html` |
| publish success transition | `routeAfterWorryPublish({ worryId })` returns `{ route: 'my_worry_detail', worryId }` | browser-note equivalent | no standalone terminal success route; transient success styling not introduced | `src/services/appShell/prdNavigationPolicy.test.ts`, `src/screens/writeForm/containerPolicy.test.ts` |
| `my_worries` list | dynamic categoryLabel/contentPreview/replyCount/unread/selected props | 393px x 852px fixed evidence frame | dynamic cards, unread and selected states, accessible labels | `tmp/phase-18/my-worries-list.html` |
| `my_worry_detail` selected | selected worry with received replies | 393px x 852px fixed evidence frame | selected worry and received reply buttons preserve detail navigation intent | `tmp/phase-18/my-worry-detail.html` |
| my worries loading/empty/error | hook/container async states | 393px x 852px fixed evidence frame | shared LoadingState/EmptyState/ErrorState usage documented | `tmp/phase-18/my-worry-detail.html` |
| responsive review | 393px hierarchy, 360px, 430px, desktop | static/code/browser-note equivalent | production uses responsive width, max-width, safe-area and bottom-nav tokens; no fixed 393-only production layout | `src/screens/shared/ui.tsx`, `src/index.css`, `tmp/phase-18/*.html` |

## Verification Notes

- Affected targeted coverage is included in `npm test`:
  - `src/screens/writeForm/contract.test.ts`
  - `src/screens/writeForm/importBoundary.test.ts`
  - `src/screens/writeForm/containerPolicy.test.ts`
  - `src/screens/myPage/contract.test.ts`
  - `src/screens/myPage/mapping.test.ts`
  - `src/screens/myPage/importBoundary.test.ts`
  - `src/screens/shared/uiContract.test.ts`
  - `src/services/appShell/prdNavigationPolicy.test.ts`
  - `src/services/worryPublication/**.test.ts`
  - `src/services/myWorries/prdPolicy.test.ts`
- Firestore rules and Firestore rule behavior were not changed, so `npm run test:rules` was not required.
