# Qling Design Integration TODO

## Scope Statement

This document is the execution plan for aligning the production Qling app with the static `design/` delivery package. It is written for a developer who does not know the project context and must be able to execute the work phase by phase without guessing.

`design/` is a static design delivery package, not production code. It contains fixed 393px x 852px screen references, screen-local SVG/image assets, preview routing, hardcoded sample data, fake status bars/home indicators, and preview-only dependencies. Production routing, state, API integration, Firestore behavior, moderation behavior, matching behavior, read models, push/PWA behavior, account deletion, accessibility, and complete UX flows must be implemented in the production app.

Checkboxes may only be checked after implementation exists and verification evidence exists. Do not check a box based only on visual similarity when functional behavior is not wired. Do not copy `design/` static screens directly into production without replacing hardcoded text/data and reconnecting production behavior. Preserve the deep module structure: domain logic, Firestore/API details, moderation, matching, read-model logic, push/PWA logic, and account logic must remain in service/domain modules or route-level adapters, not presentational UI components.

Each phase is intended to be executed and reviewed independently before the next phase starts. Phase order and checkbox order are the execution order. Implementation phases may create minimal functional screen skeletons before final visual reskin so routes and behavior can be tested early, but full visual polishing, token work, and screen-by-screen visual alignment remain the visual phases.

## Non-Goals

- Replacing the production app with the design preview app.
- Importing all dependencies from `design/package.json` into production.
- Moving Firebase, Firestore/API, moderation, matching, read-model, push/PWA, or account deletion logic into presentational screen components.
- Adding speculative features beyond what is needed to make production match the approved `design/` interpretation.
- Refactoring unrelated services, tests, or documents.

## Completion Definition

Design integration is complete only when every checkbox in this document is checked with evidence. Completion means every `design/` screen has a matching production route/screen or a documented intentional product-level exclusion, all required product decisions are resolved before Phase 2 begins, functional gaps are implemented before visual reskin work, automated tests and required rules tests pass, manual/browser verification covers non-automatable responsive/PWA cases, and production remains aligned with `docs/PRD.md`.

## Phase List

1. Phase 0 - Design inventory and production-gap audit
2. Phase 1 - Product model and schema decisions before UI
3. Phase 2 - Route and app-shell functional expansion
4. Phase 3 - App shell responsibility and route rendering boundary
5. Phase 4 - Presentational screen contract definition
6. Phase 5 - Received-worries container boundary
7. Phase 6 - Write forms container boundary
8. Phase 7 - My-page/account/reply-detail container boundary
9. Phase 8 - Import-boundary and deep module guardrail verification
10. Phase 9 - Onboarding functional implementation
11. Phase 10 - My-page/account functional expansion
12. Phase 11 - Received worries and pass/reply functional alignment
13. Phase 12 - Worry writing and reply writing functional alignment
14. Phase 13 - Reply check, feedback, comment functional alignment
15. Phase 14 - Design token and global style foundation
16. Phase 15 - Loading/login visual reskin
17. Phase 16 - Onboarding visual reskin
18. Phase 17 - Received worries/write reply visual reskin
19. Phase 18 - Write worry/my worries visual reskin
20. Phase 19 - Reply check/feedback/my answers visual reskin
21. Phase 20 - My page/account/policy visual reskin
22. Phase 21 - Static hardcoded data removal and visual acceptance pass
23. Phase 22 - Bottom navigation and mobile shell polish
24. Phase 23 - Accessibility, responsive behavior, and production hardening
25. Phase 24 - Regression test and PRD/design release gate

## Evidence Rules

- Automated test evidence means the command and passing output are copied into the PR description or linked CI run.
- Manual screenshot evidence means screenshots are attached for the named route/state and viewport.
- Manual browser-note evidence means the PR checklist records browser, viewport/device, route/state, result, and date.
- Emulator/manual-equivalent evidence means either a passing emulator test output or a written manual-equivalent verification note when the emulator cannot cover the case.
- Product-decision evidence means a PRD update, ADR, issue comment, or PR checklist section that records the decision, owner, date, and chosen behavior.

## Detailed Phased TODO Checklist

### Phase 0 - Design Inventory And Production-Gap Audit

- [x] TODO-DESIGN-0.1 Inspect `design/README.md`, `design/package.json`, every `design/src/screens/**/Component.tsx`, all screen-local SVG/image assets, `design/src/styles/index.css`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/services/appShell/prdNavigationPolicy.ts`, `src/services/validation/content.ts`, `src/services/drafts/contentDrafts.ts`, the service folders named in this TODO, `packages/domain/src/index.ts`, `firestore.rules`, `src/firestore.rules.test.ts`, and existing related tests; evidence: PR checklist entry with inspected file list and date.
- [x] TODO-DESIGN-0.2 Create a single screen-to-route mapping table covering every design screen: `splash`, `loading`, `login`, `onboarding-basic`, `onboarding-duplicate`, `onboarding-interests`, `received-worries`, `question-write-a`, `question-write-b`, `answer-write-1`, `answer-write-2`, `answer-write-3`, `answer-check`, `my-page`, `edit-interests`, `my-answers`, `my-worries`, `privacy-policy`, `logout`, and `account-deletion`; evidence: table with columns `Design screen`, `Production route/state`, `Functional behavior required`, `Visual-only/variant/exclusion`, `Data source`, `Verification`.
- [x] TODO-DESIGN-0.3 Classify each design screen in the table as one of: required functional screen, confirmation/modal variant, visual variant of another screen, or intentional product-level exclusion.
- [x] TODO-DESIGN-0.4 Record production gaps discovered from the audit, including onboarding identity fields, onboarding duplicate check, explicit onboarding subroutes, edit interests, my answers, my worries, privacy policy, logout confirmation, account deletion confirmation, answer-check/detail mapping, bottom navigation, and static-design data replacement.
- [x] TODO-DESIGN-0.5 Record design tokens and motifs: SUIT font, orange `#ff8b3d`/`#ff8b0d`, cream `#fff1d1`/`#fff5eb`, dark text `#1a1a1a`/`#2a2a2a`, muted gray `#b8b8b8`, border gray `#dadce0`/`#f0f0f2`, pill/card/modal radii, card/modal shadows, orange header band, cream content sheet, bottom navigation, category chips, white cards, text areas, CTA styles, modal styles, and profile eye/avatar motif.
- [x] TODO-DESIGN-0.6 Record implementation warnings: fixed absolute positioning, fake status bars, fake home indicators, hardcoded sample names/dates/counts/content, lorem ipsum, preview-only routing, fixed 393px-only layout, and blind copying of `design/package.json` dependencies are not acceptable production implementation.
- [x] TODO-DESIGN-0.7 Verify this TODO states that `design/` is static and production routing/state/API/UX flows must be implemented in production modules.
- [x] TODO-DESIGN-0.V1 Verify Phase 0 with the completed mapping table, gap list, token list, and implementation-warning list attached as PR evidence before checking this item.

### Phase 1 - Product Model And Schema Decisions Before UI

Phase 2 must not begin until every Phase 1 decision item is explicitly resolved. If a decision cannot be resolved, document it as a blocker and stop design-integration implementation. Do not continue with an assumption.

- [ ] TODO-DESIGN-1.1 Decide nickname behavior; default decision: nickname is required because design onboarding/profile screens show a display identity that production does not currently model. If product owner rejects nickname, document the blocker-resolution and exact replacement UI before Phase 2.
- [ ] TODO-DESIGN-1.2 If nickname is kept, define profile fields exactly: display nickname field, normalized nickname field if stored, trim behavior, min/max length, allowed characters, blocked characters, error copy, and whether nickname can be changed after onboarding.
- [ ] TODO-DESIGN-1.3 If nickname is kept, define duplicate-check behavior exactly: route/state location, trigger, idle/checking/available/duplicate/invalid/network-failed/retry states, disabled submit rules, and display copy.
- [ ] TODO-DESIGN-1.4 If nickname is kept, define uniqueness persistence exactly; default decision: server/API transaction using normalized nickname reservation documents, not client-only Firestore checks.
- [ ] TODO-DESIGN-1.5 If nickname is rejected, define exact design adaptation for onboarding basic, duplicate-check screen exclusion, profile display name, and my-page profile summary; evidence must include the replacement copy/data source.
- [ ] TODO-DESIGN-1.6 Decide age behavior; default decision: age is not required unless `docs/PRD.md` is amended, because current matching/profile services use gender and interests only.
- [ ] TODO-DESIGN-1.7 If age is kept, define `users/{uid}.age` type, allowed range, empty-state behavior, validation copy, persistence path, rules behavior, and whether age affects matching.
- [ ] TODO-DESIGN-1.8 If age is rejected, define exact onboarding-basic adaptation that removes age while preserving the design hierarchy.
- [ ] TODO-DESIGN-1.9 Decide category display labels; default decision: keep stable internal values from `packages/domain/src/index.ts`, including `워라밸`, and add a display-label map only when approved copy intentionally differs from internal values such as `워라벨`.
- [ ] TODO-DESIGN-1.10 Decide received hearts behavior; default decision: `받은 하트` displays existing `helpedCount` because `docs/PRD.md` defines likes received by answerers as helpedCount.
- [ ] TODO-DESIGN-1.11 Decide profile avatar behavior; default decision: use the design eye/profile motif as a static production-safe avatar until uploaded avatars are explicitly added to the product model.
- [ ] TODO-DESIGN-1.12 Decide profile display-name fallback; default decision: use nickname if kept, otherwise use `큐링 사용자` unless a privacy-safe auth display name is explicitly approved.
- [ ] TODO-DESIGN-1.13 Decide privacy/terms behavior; requires product-owner decision if no current terms/policy source exists. Privacy policy must route to real product text; terms must either route to real terms text or be documented as an intentional exclusion.
- [ ] TODO-DESIGN-1.14 Write the Phase 1 decision record in `docs/PRD.md`, an ADR, or the implementation PR checklist; it must include nickname, age, duplicate check, helpedCount/received hearts, avatar, display name fallback, privacy/terms behavior, and category display labels.
- [ ] TODO-DESIGN-1.15 Add validation/schema test targets to the implementation plan: category label/value tests in `packages/domain/src/index.test.ts` if a domain display-label map is added; content validation remains in `src/services/validation/content.test.ts`; profile/nickname validation tests go in a new service test such as `src/services/userProfile/profileValidation.test.ts` or `src/services/authProfile/profileIdentity.test.ts` if that module owns the logic.
- [ ] TODO-DESIGN-1.16 If nickname is kept, add nickname uniqueness test targets: normalized nickname validation, duplicate check result mapping, reservation transaction conflict, concurrent/race conflict behavior, and Firestore rules preventing unsafe direct client writes.
- [ ] TODO-DESIGN-1.17 If nickname/age/reservation docs change Firestore shape, add Firestore rules test targets in `src/firestore.rules.test.ts` and note whether `npm run test:rules` is required in Phase 24.
- [ ] TODO-DESIGN-1.GATE Verify the hard decision gate: every Phase 1 decision is resolved with evidence, or unresolved decisions are documented as blockers and Phase 2 has not started.

### Phase 2 - Route And App-Shell Functional Expansion

- [ ] TODO-DESIGN-2.1 Update route types and helper functions in `src/services/appShell/prdNavigationPolicy.ts`; no route helper may live only inside a presentational component.
- [ ] TODO-DESIGN-2.2 Add route/state coverage for splash/loading, login, onboarding basic, onboarding duplicate check if kept, onboarding interests, received worries, write worry, write reply, answer/reply check, my page, edit interests, my answers, my worries, privacy policy, logout confirmation, and account deletion confirmation.
- [ ] TODO-DESIGN-2.3 Preserve existing PRD semantics unless Phase 1/PRD explicitly changed them: default authenticated route to received worries/answer feed, onboarding completion to received worries/answer feed after profile/examples are ready, worry publish success to my worries unless a confirmation route is inserted, reply publish success to received worries/answer feed unless a confirmation route is inserted, and pass success to received worries/answer feed.
- [ ] TODO-DESIGN-2.4 Define back routes for write worry, write reply, received-answer detail, my-answer detail, edit interests, my answers, my worries, privacy policy, logout confirmation, and account deletion confirmation.
- [ ] TODO-DESIGN-2.5 Define bottom-tab ownership for nested routes: received worries/write reply under answer tab, my worries/write worry/received-answer detail under my-worries tab, and my page/edit interests/my answers/my-answer detail/settings subroutes under my-page tab.
- [ ] TODO-DESIGN-2.6 Create minimal functional screen skeletons only where needed to exercise new routes before visual reskin; skeletons must use real route state and callbacks, not static design data.
- [ ] TODO-DESIGN-2.7 Add route-policy tests in `src/services/appShell/prdNavigationPolicy.test.ts` for default authenticated route, onboarding completion, publish success, reply success, pass success, every back route, my-page subroutes, logout/account deletion routes, and bottom-tab selection.
- [ ] TODO-DESIGN-2.V1 Verify Phase 2 with passing `src/services/appShell/prdNavigationPolicy.test.ts`, a route map diff, and evidence that route policy did not move into UI components.

### Phase 3 - App Shell Responsibility And Route Rendering Boundary

- [ ] TODO-DESIGN-3.1 Inventory current `src/App.tsx` responsibilities and classify each as app-shell orchestration, route rendering, feature container logic, or presentational screen rendering.
- [ ] TODO-DESIGN-3.2 Define the app-shell boundary: auth/profile loading, top-level route selection, global overlays, and shell-level providers may stay in app shell; feature data wiring must move to route containers.
- [ ] TODO-DESIGN-3.3 Extract or identify route rendering boundaries for authenticated shell, onboarding flow, received worries, write worry, write reply, reply details, my-page/account, and policy screens.
- [ ] TODO-DESIGN-3.4 Keep `src/App.tsx` from becoming a larger monolith; if route expansion increases responsibility, split route rendering into dedicated shell/container files before continuing.
- [ ] TODO-DESIGN-3.5 Verify no visual reskin work begins in this phase beyond minimal route skeletons needed to test routing.
- [ ] TODO-DESIGN-3.V1 Verify Phase 3 with a file/module map, App-shell responsibility notes, and evidence that route rendering boundaries exist before screen contract work starts.

### Phase 4 - Presentational Screen Contract Definition

- [ ] TODO-DESIGN-4.1 Define screen props contracts for login/loading/splash screens, including auth/loading/error/submit props and no Firebase imports.
- [ ] TODO-DESIGN-4.2 Define screen props contracts for onboarding basic, duplicate check, and interests, including field values, validation messages, submit/check callbacks, processing states, and no Firestore/API imports.
- [ ] TODO-DESIGN-4.3 Define screen props contracts for received-worries, including feed items, pass/open callbacks, loading/error/empty states, already-replied state, and no delivery API imports.
- [ ] TODO-DESIGN-4.4 Define screen props contracts for write-worry and write-reply forms, including draft value, validation result, character count, publish callback, processing/moderation/error states, and no publication API imports.
- [ ] TODO-DESIGN-4.5 Define screen props contracts for reply-check/detail screens, including original worry, reply, feedback, comment, submit callbacks, existing-feedback states, and no feedback API imports.
- [ ] TODO-DESIGN-4.6 Define screen props contracts for my-page/account screens, including profile summary, helpedCount, interests, settings items, logout/delete callbacks, push/PWA access props, and no Firebase/userAccount imports.
- [ ] TODO-DESIGN-4.7 Add pure props-contract tests in named targets near the screen contract modules, such as `src/screens/receivedWorries/contract.test.ts`, `src/screens/writeForm/contract.test.ts`, and `src/screens/myPage/contract.test.ts`; do not require React DOM rendering tests unless a React test harness is deliberately added.
- [ ] TODO-DESIGN-4.8 If a React DOM component test harness is added deliberately, document the dependency, setup file, and first test target; otherwise rely on pure props-contract tests, import-boundary tests, service tests, and manual browser evidence.
- [ ] TODO-DESIGN-4.V1 Verify Phase 4 with contract definitions and props-contract test output before container wiring begins.

### Phase 5 - Received-Worries Container Boundary

- [ ] TODO-DESIGN-5.1 Implement received-worries container wiring to `useHomeWorryFeed`, `filterSuppressedFeedWorries`, and route helpers.
- [ ] TODO-DESIGN-5.2 Keep pass behavior in the container/service path using `passDeliveryViaApi`, delivery suppression policy, loading-by-delivery-id state, and feed refresh behavior.
- [ ] TODO-DESIGN-5.3 Keep open-for-reply behavior in the container/service path using selected worry state, route helpers, and read-state marking.
- [ ] TODO-DESIGN-5.4 Ensure the received-worries presentational screen only receives props and emits events; it must not import delivery APIs, read-state APIs, Firebase, or service internals.
- [ ] TODO-DESIGN-5.5 Verify no visual reskin work begins in this phase beyond minimal functional UI needed to exercise the container.
- [ ] TODO-DESIGN-5.V1 Verify Phase 5 with container notes, props-contract tests, and manual browser-note evidence for a functional received-worries skeleton.

### Phase 6 - Write Forms Container Boundary

- [ ] TODO-DESIGN-6.1 Implement write-worry container wiring to `validateDraftContent`, `CONTENT_MAX_LENGTH`, worry draft state, `publishWorryViaApi`, moderation result display, draft clearing, and route helpers.
- [ ] TODO-DESIGN-6.2 Implement write-reply container wiring to selected delivery/worry data, reply draft keyed by delivery id, `publishReplyViaApi`, moderation result display, draft clearing, feed refresh, and route helpers.
- [ ] TODO-DESIGN-6.3 Ensure write form presentational components only receive props and emit events; they must not import publication APIs, Firebase, draft services, or validation service internals unless validation result is explicitly part of a shared pure UI contract.
- [ ] TODO-DESIGN-6.4 Verify no visual reskin work begins in this phase beyond minimal functional UI needed to exercise publication flows.
- [ ] TODO-DESIGN-6.V1 Verify Phase 6 with container notes, props-contract tests, and manual screenshot evidence for functional write-worry/write-reply skeletons.

### Phase 7 - My-Page/Account/Reply-Detail Container Boundary

- [ ] TODO-DESIGN-7.1 Implement my-page/account container wiring to profile data, helpedCount/received hearts, interests, settings items, push/PWA hooks, sign-out cleanup, and `deleteMyAccountViaApi`.
- [ ] TODO-DESIGN-7.2 Implement my-answers/my-worries container wiring to `useMyGivenReplies`, `useMyWorries`, `useRepliesForWorry`, selected item state, route helpers, and read-state behavior where applicable.
- [ ] TODO-DESIGN-7.3 Implement reply-detail container wiring to original worry data, reply data, feedback submit, publisher comment submit, moderation rejection display, draft clearing, and route helpers.
- [ ] TODO-DESIGN-7.4 Ensure my-page/account/reply-detail presentational screens only receive props and emit events; they must not import Firebase, userAccount APIs, push internals, feedback APIs, read-state APIs, or Firestore SDK.
- [ ] TODO-DESIGN-7.5 Verify no visual reskin work begins in this phase beyond minimal functional UI needed to exercise account/detail flows.
- [ ] TODO-DESIGN-7.V1 Verify Phase 7 with container notes, props-contract tests, and manual browser-note evidence for functional my-page/account/reply-detail skeletons.

### Phase 8 - Import-Boundary And Deep Module Guardrail Verification

- [ ] TODO-DESIGN-8.1 Add import-boundary tests in a named target such as `src/ui/importBoundaries.test.ts` or `src/screens/importBoundaries.test.ts`.
- [ ] TODO-DESIGN-8.2 Import-boundary tests must fail if presentational screen files import `src/firebase`, API clients, server modules, Firestore SDK, Firebase auth SDK, or service implementation internals.
- [ ] TODO-DESIGN-8.3 Verify route policy remains in `src/services/appShell/prdNavigationPolicy.ts` and route-policy tests remain in `src/services/appShell/prdNavigationPolicy.test.ts`.
- [ ] TODO-DESIGN-8.4 Verify domain/service logic remains in `src/services/**` and `packages/domain/**`, not presentational components.
- [ ] TODO-DESIGN-8.5 Verify `src/App.tsx` did not grow into a larger monolith after Phases 3-7.
- [ ] TODO-DESIGN-8.V1 Verify Phase 8 with import-boundary test output, route-policy test output, and a module-boundary review note before functional product phases continue.

### Phase 9 - Onboarding Functional Implementation

- [ ] TODO-DESIGN-9.1 Implement the finalized onboarding flow from Phase 1 using minimal functional skeletons first if the final visual reskin is not ready.
- [ ] TODO-DESIGN-9.2 If nickname is kept, implement nickname validation in the service location chosen in Phase 1 and add tests for trimming, normalization, min/max length, allowed characters, blocked characters, and error copy.
- [ ] TODO-DESIGN-9.3 If nickname is kept, implement duplicate-check behavior with idle/checking/available/duplicate/invalid/network-failed/retry states and disabled continue until availability is proven.
- [ ] TODO-DESIGN-9.4 If nickname is kept, implement server/API transaction or reservation logic and tests for duplicate reservation, normalized-name conflict, and concurrent/race conflict behavior.
- [ ] TODO-DESIGN-9.5 If nickname is kept, add Firestore rules coverage in `src/firestore.rules.test.ts` proving unsafe client writes to nickname reservation docs or server-owned nickname fields are denied.
- [ ] TODO-DESIGN-9.6 If age is kept, implement age validation/persistence/rules from Phase 1 and test valid, invalid, empty, and boundary ages.
- [ ] TODO-DESIGN-9.7 If age is rejected, implement the Phase 1 adaptation and verify no hardcoded age UI remains.
- [ ] TODO-DESIGN-9.8 Preserve gender persistence and rules behavior already covered by `src/firestore.rules.test.ts`.
- [ ] TODO-DESIGN-9.9 Preserve interests persistence using domain category values and any approved display-label map.
- [ ] TODO-DESIGN-9.10 Preserve server-owned example worry creation before entering the authenticated feed.
- [ ] TODO-DESIGN-9.11 Preserve onboarding completion route transition from Phase 2.
- [ ] TODO-DESIGN-9.12 Add or update onboarding service/container tests in the relevant new or existing service test files for valid onboarding, invalid required fields, duplicate nickname if kept, profile persistence, example worry creation, and route transition.
- [ ] TODO-DESIGN-9.13 Add manual browser-note evidence for first-time sign-in through onboarding at 393px before final reskin, proving the functional skeleton works end to end.
- [ ] TODO-DESIGN-9.V1 Verify Phase 9 with onboarding tests, nickname/rules tests if applicable, and the manual browser-note evidence.

### Phase 10 - My-Page/Account Functional Expansion

- [ ] TODO-DESIGN-10.1 Implement profile summary using dynamic display name, avatar motif decision, interests, and helpedCount/received hearts.
- [ ] TODO-DESIGN-10.2 Implement edit-interests route/state backed by existing profile update behavior and preserve gender unless Phase 1 changed that behavior.
- [ ] TODO-DESIGN-10.3 Implement my-answers route/state backed by `useMyGivenReplies`, with dynamic list items and detail navigation.
- [ ] TODO-DESIGN-10.4 Implement my-worries route/state backed by `useMyWorries` and `useRepliesForWorry`, with dynamic list items and received replies navigation.
- [ ] TODO-DESIGN-10.5 Implement privacy-policy route/state using real policy text or a documented product-owner exclusion for missing terms/policy content.
- [ ] TODO-DESIGN-10.6 Implement logout confirmation route/state before calling existing sign-out behavior.
- [ ] TODO-DESIGN-10.7 Implement account deletion confirmation route/state before calling `deleteMyAccountViaApi`.
- [ ] TODO-DESIGN-10.8 Preserve logout cleanup: local push registration state is cleared and Firebase auth signs out.
- [ ] TODO-DESIGN-10.9 Preserve account deletion cleanup: server deletion path runs, local push state is cleaned, and user is signed out.
- [ ] TODO-DESIGN-10.10 Preserve push notification settings access if retained; if hidden by design, document where PRD-required push settings remain reachable.
- [ ] TODO-DESIGN-10.11 Preserve PWA install/share access if retained; if hidden by design, document where PRD-required PWA install/share remains reachable.
- [ ] TODO-DESIGN-10.12 Add route-policy tests for my-page subroutes in `src/services/appShell/prdNavigationPolicy.test.ts`.
- [ ] TODO-DESIGN-10.13 Add account behavior tests in existing account/push locations, including `src/services/userAccount/deleteMyAccount.test.ts` and `src/services/pushRegistration/internalLifecycle.test.ts` when cleanup behavior changes.
- [ ] TODO-DESIGN-10.14 Add pure props-contract tests for helpedCount fallback, destructive-action confirmation props, and settings item routing in the my-page contract test target from Phase 4.
- [ ] TODO-DESIGN-10.15 Add manual screenshot evidence for my page, logout confirmation, and account deletion confirmation using dynamic data, proving hardcoded design values such as `라미` and `314` are gone.
- [ ] TODO-DESIGN-10.V1 Verify Phase 10 with route tests, account/push tests, props-contract tests, and manual screenshot evidence.

### Phase 11 - Received Worries And Pass/Reply Functional Alignment

- [ ] TODO-DESIGN-11.1 Wire received-worries data to `useHomeWorryFeed` and `filterSuppressedFeedWorries`.
- [ ] TODO-DESIGN-11.2 Render dynamic category, received-time/fallback copy, unread state, worry content, already-replied state, loading, error, and empty states.
- [ ] TODO-DESIGN-11.3 Ensure card body opens write reply through route helpers and marks delivery read where applicable.
- [ ] TODO-DESIGN-11.4 Ensure `건너뛰기` maps to existing `passDeliveryViaApi` behavior, not UI-only removal.
- [ ] TODO-DESIGN-11.5 Ensure pass click does not trigger card body open.
- [ ] TODO-DESIGN-11.6 Ensure pass loading/disabled state is keyed by delivery id and prevents duplicate mutation.
- [ ] TODO-DESIGN-11.7 Ensure pass success suppresses/hides the delivery and refreshes feed behavior correctly.
- [ ] TODO-DESIGN-11.8 Ensure pass failure preserves the card, clears loading, and displays the existing error path.
- [ ] TODO-DESIGN-11.9 Preserve unread/read-state behavior through existing read-state service/API modules.
- [ ] TODO-DESIGN-11.10 Add or update tests in existing delivery/feed/read-state locations: `src/services/deliveries/uiPolicy.test.ts`, `src/services/deliveries/passDelivery.test.ts`, `src/services/homeWorryFeed/prdPolicy.test.ts`, `src/services/homeWorryFeed/apiClient.test.ts`, and read-state tests as behavior changes require.
- [ ] TODO-DESIGN-11.11 Add pure props-contract tests for card open, pass click isolation, pass loading, already-replied display, empty state, and error state.
- [ ] TODO-DESIGN-11.12 Add manual browser-note evidence for one card open, one pass success, one pass failure or simulated failure, one already-replied display, and empty feed.
- [ ] TODO-DESIGN-11.V1 Verify Phase 11 with service tests, props-contract tests, and manual browser-note evidence.

### Phase 12 - Worry Writing And Reply Writing Functional Alignment

- [ ] TODO-DESIGN-12.1 Preserve `CONTENT_MAX_LENGTH` and `validateDraftContent` from `src/services/validation/content.ts` as the validation source for worry and reply.
- [ ] TODO-DESIGN-12.2 Preserve worry draft persistence and clearing through `src/services/drafts/contentDrafts.ts`.
- [ ] TODO-DESIGN-12.3 Preserve reply draft persistence and clearing keyed by delivery id.
- [ ] TODO-DESIGN-12.4 Preserve moderation rejected/failed/published handling for both worry and reply publication.
- [ ] TODO-DESIGN-12.5 Preserve publish success routing from Phase 2.
- [ ] TODO-DESIGN-12.6 Implement design-compatible input states: placeholder, live character count, disabled submit, processing submit, validation help/error text, moderation rejection display, and retry path where applicable.
- [ ] TODO-DESIGN-12.7 Add validation tests in `src/services/validation/content.test.ts` only if validation rules change.
- [ ] TODO-DESIGN-12.8 Add draft tests in `src/services/drafts/contentDrafts.test.ts` if draft keys or clearing behavior changes.
- [ ] TODO-DESIGN-12.9 Add or update publication/API tests in `src/services/worryPublication/apiClient.test.ts`, `src/services/replyPublication/apiClient.test.ts`, and server publication tests if behavior changes.
- [ ] TODO-DESIGN-12.10 Add pure props-contract tests for empty input, too-long input, valid input, rejected moderation display, failed publish display, successful publish callback, draft clearing callback, processing state, and route transition request.
- [ ] TODO-DESIGN-12.11 Add manual screenshot evidence for write worry and write reply at 393px before final visual polishing if using functional skeletons.
- [ ] TODO-DESIGN-12.V1 Verify Phase 12 with validation/draft/publication tests, props-contract tests, and manual screenshot evidence.

### Phase 13 - Reply Check, Feedback, Comment Functional Alignment

- [ ] TODO-DESIGN-13.1 Map answer-check to received-answer detail for replies to the user's worries.
- [ ] TODO-DESIGN-13.2 Map my-answer detail to replies written by the user, even if it shares the answer-check visual pattern.
- [ ] TODO-DESIGN-13.3 Preserve dynamic original worry content and dynamic reply content in both detail flows.
- [ ] TODO-DESIGN-13.4 Preserve helpful and not-helpful feedback submission through `submitReplyFeedbackWithProductionAdapters`.
- [ ] TODO-DESIGN-13.5 Preserve publisher comment submission where allowed after helpful feedback.
- [ ] TODO-DESIGN-13.6 Preserve feedback/comment moderation rejection handling and user/help copy.
- [ ] TODO-DESIGN-13.7 Preserve helpedCount behavior and do not mutate helpedCount from browser UI code.
- [ ] TODO-DESIGN-13.8 Preserve read-model assumptions for existing feedback and comments.
- [ ] TODO-DESIGN-13.9 Preserve feedback comment draft persistence and clearing.
- [ ] TODO-DESIGN-13.10 Add or update feedback tests in `src/services/replyFeedback/submitReplyFeedback.test.ts`, `src/services/replyFeedback/serverFeedback.test.ts`, and `src/services/replyFeedback/serverFirestore.test.ts` if behavior changes.
- [ ] TODO-DESIGN-13.11 Add or update mailbox/read-model tests in `src/services/replyMailbox/controller.test.ts`, `src/services/myWorries/prdPolicy.test.ts`, or read-state tests if detail/read behavior changes.
- [ ] TODO-DESIGN-13.12 Add pure props-contract tests for helpful feedback, not-helpful feedback, comment submission, rejected comment, existing feedback display, my-answer detail display, and received-answer detail display.
- [ ] TODO-DESIGN-13.13 Add manual browser-note evidence for received-answer detail, my-answer detail, feedback submission, existing feedback display, and comment submission/rejection state.
- [ ] TODO-DESIGN-13.V1 Verify Phase 13 with feedback/read-model tests, props-contract tests, and manual browser-note evidence.

### Phase 14 - Design Token And Global Style Foundation

- [ ] TODO-DESIGN-14.1 Add production design tokens in `src/index.css` or the production global CSS entry for SUIT font, primary/secondary orange, cream backgrounds, white surfaces, dark text, muted text, border gray, danger red, and success/positive accents.
- [ ] TODO-DESIGN-14.2 Add radius, shadow, and spacing tokens/conventions for cards, modals, input areas, small buttons, pill chips, app shell, content sheets, CTAs, and bottom safe-area padding.
- [ ] TODO-DESIGN-14.3 Import SUIT in production global CSS or document an approved local/font-loading alternative.
- [ ] TODO-DESIGN-14.4 Do not copy `design/package.json` dependencies blindly; document every new dependency and why existing production dependencies cannot cover it.
- [ ] TODO-DESIGN-14.5 Implement or adapt production primitives for app frame/shell, bottom navigation, primary CTA, secondary CTA, chip/category badge, card, text area, profile/avatar motif, modal/dialog, and empty state.
- [ ] TODO-DESIGN-14.6 Acceptance criteria: 393px width preserves the design hierarchy and main layout; 360px, 430px, and desktop widths remain usable and not clipped.
- [ ] TODO-DESIGN-14.7 Acceptance criteria: fake status bars and fake home indicators from `design/` are replaced by safe-area-aware production layout using viewport/safe-area handling.
- [ ] TODO-DESIGN-14.8 Acceptance criteria: dynamic content may expand layout; pixel-perfect copying is not required when it harms accessibility, readability, or production data.
- [ ] TODO-DESIGN-14.9 Acceptance criteria: color, font, CTA, card, chip, bottom-nav, modal, text-area, and profile motif alignment are visually recognizable against `design/`.
- [ ] TODO-DESIGN-14.10 Add pure props-contract tests for primitive state mappings where useful; do not require React DOM rendering tests unless a harness was deliberately added in Phase 4.
- [ ] TODO-DESIGN-14.11 Add manual screenshot evidence for primitives or first integrated screens at 393px, 360px, 430px, and desktop preview.
- [ ] TODO-DESIGN-14.V1 Verify Phase 14 with token inventory, dependency diff, props-contract test output if added, and manual screenshot evidence.

### Phase 15 - Loading/Login Visual Reskin

- [ ] TODO-DESIGN-15.1 Confirm Phase 2 route wiring, Phase 3 shell boundaries, Phase 4 screen contracts, and Phase 14 tokens/primitives are complete before visual work starts.
- [ ] TODO-DESIGN-15.2 Reskin loading/splash using production loading/error state, safe-area-aware layout, accessible loading text, and no fake status/home indicators.
- [ ] TODO-DESIGN-15.3 Reskin login using production Google login wiring, processing/disabled/auth-error states, privacy/terms behavior from Phase 1, and keyboard/focus behavior.
- [ ] TODO-DESIGN-15.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-15.5 Add manual screenshot evidence for loading/splash and login at 393px and at least one non-393px width.
- [ ] TODO-DESIGN-15.V1 Verify Phase 15 with screenshots/browser notes and any touched functional test output.

### Phase 16 - Onboarding Visual Reskin

- [ ] TODO-DESIGN-16.1 Confirm Phase 1 product decisions and Phase 9 onboarding functional implementation are complete before onboarding visual work starts.
- [ ] TODO-DESIGN-16.2 Reskin onboarding basic with dynamic fields, validation errors, nickname/age adaptations from Phase 1, disabled/processing states, and keyboard/focus behavior.
- [ ] TODO-DESIGN-16.3 Reskin onboarding duplicate-check screen/state if nickname duplicate check is kept; otherwise verify the Phase 1 exclusion/adaptation is reflected visually.
- [ ] TODO-DESIGN-16.4 Reskin onboarding interests with dynamic category data, selected/unselected states, invalid/no-selection state, disabled/processing state, and accessible selection controls.
- [ ] TODO-DESIGN-16.5 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-16.6 Add manual screenshot evidence for onboarding basic, duplicate/adapted step, and interests at 393px and at least one non-393px width.
- [ ] TODO-DESIGN-16.V1 Verify Phase 16 with screenshots/browser notes and onboarding test output.

### Phase 17 - Received Worries/Write Reply Visual Reskin

- [ ] TODO-DESIGN-17.1 Confirm Phase 5 received-worries container, Phase 11 pass/reply functional alignment, and Phase 12 write-reply behavior are complete before visual work starts.
- [ ] TODO-DESIGN-17.2 Reskin received worries with dynamic feed data, loading/error/empty states, pass disabled/processing state, already-replied state, bottom-nav overlap prevention, and card accessibility labels.
- [ ] TODO-DESIGN-17.3 Reskin write reply with selected worry data, empty input, processing, validation error, moderation error, safe-area/bottom-nav overlap prevention, and keyboard behavior.
- [ ] TODO-DESIGN-17.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-17.5 Add manual screenshot/browser-note evidence for received worries, empty/error/loading states where practical, pass state, already-replied state, and write reply.
- [ ] TODO-DESIGN-17.V1 Verify Phase 17 with screenshots/browser notes and affected pass/feed/write-reply test output.

### Phase 18 - Write Worry/My Worries Visual Reskin

- [ ] TODO-DESIGN-18.1 Confirm Phase 6 write forms container, Phase 10 my-worries functional expansion, and Phase 12 write-worry behavior are complete before visual work starts.
- [ ] TODO-DESIGN-18.2 Reskin write worry with draft data, empty input, processing, validation error, moderation error, safe-area/bottom-nav overlap prevention, and keyboard behavior.
- [ ] TODO-DESIGN-18.3 Reskin my worries with dynamic list, empty/loading/error states, received-replies navigation, bottom-nav overlap prevention, and card accessibility labels.
- [ ] TODO-DESIGN-18.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-18.5 Add manual screenshot/browser-note evidence for write worry and my worries list/detail states.
- [ ] TODO-DESIGN-18.V1 Verify Phase 18 with screenshots/browser notes and affected write-worry/my-worries test output.

### Phase 19 - Reply Check/Feedback/My Answers Visual Reskin

- [ ] TODO-DESIGN-19.1 Confirm Phase 7 reply-detail container, Phase 10 my-answers functional expansion, and Phase 13 feedback/comment functional alignment are complete before visual work starts.
- [ ] TODO-DESIGN-19.2 Reskin answer/reply check with original worry data, reply data, feedback states, comment states, loading/error fallbacks, bottom-nav overlap prevention, and accessible feedback buttons.
- [ ] TODO-DESIGN-19.3 Reskin my answers with dynamic list, empty/loading/error states, detail navigation, bottom-nav overlap prevention, and card accessibility labels.
- [ ] TODO-DESIGN-19.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-19.5 Add manual screenshot/browser-note evidence for received-answer detail, my-answer detail, feedback states, comment states, and my answers.
- [ ] TODO-DESIGN-19.V1 Verify Phase 19 with screenshots/browser notes and feedback/read-model test output.

### Phase 20 - My Page/Account/Policy Visual Reskin

- [ ] TODO-DESIGN-20.1 Confirm Phase 7 my-page/account container and Phase 10 my-page/account functional expansion are complete before visual work starts.
- [ ] TODO-DESIGN-20.2 Reskin my page with dynamic profile summary, helpedCount/received hearts, settings routes, loading/error state, bottom-nav overlap prevention, and accessible navigation buttons.
- [ ] TODO-DESIGN-20.3 Reskin edit interests with selected interests, save disabled/processing/error states, bottom-nav overlap prevention, and accessible selection controls.
- [ ] TODO-DESIGN-20.4 Reskin privacy policy with real content, loading/error state if applicable, readable long text, and no fake policy copy.
- [ ] TODO-DESIGN-20.5 Reskin logout confirmation with cancel/confirm wiring, processing disabled state, error state, focus trap/escape behavior if modal, and destructive-action copy.
- [ ] TODO-DESIGN-20.6 Reskin account deletion confirmation with cancel/confirm wiring, processing disabled state, error state, focus trap/escape behavior if modal, and destructive-action copy.
- [ ] TODO-DESIGN-20.7 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-20.8 Add manual screenshot/browser-note evidence for my page, edit interests, privacy policy, logout confirmation, and account deletion confirmation.
- [ ] TODO-DESIGN-20.V1 Verify Phase 20 with screenshots/browser notes and account/push/route test output.

### Phase 21 - Static Hardcoded Data Removal And Visual Acceptance Pass

- [ ] TODO-DESIGN-21.1 Remove static hardcoded design data from all production screens where dynamic data is required, including sample names, dates, counts, worry text, reply text, and lorem ipsum.
- [ ] TODO-DESIGN-21.2 Verify no production screen uses fake status bars or fake home indicators from `design/`; all mobile chrome spacing must be safe-area-aware production layout.
- [ ] TODO-DESIGN-21.3 Verify no production screen depends on fixed 393px-only absolute positioning for dynamic content.
- [ ] TODO-DESIGN-21.4 Verify color, font, CTA, card, chip, bottom-nav, modal, text-area, and profile motif alignment across reskinned screens.
- [ ] TODO-DESIGN-21.5 Verify 393px width preserves design hierarchy and main layout across all reskinned screens.
- [ ] TODO-DESIGN-21.6 Verify 360px, 430px, and desktop preview widths remain usable and not clipped across representative screens.
- [ ] TODO-DESIGN-21.7 Add final manual screenshot/browser-note evidence for the full visual acceptance pass.
- [ ] TODO-DESIGN-21.V1 Verify Phase 21 with the hardcoded-data audit, visual acceptance notes, and final screenshot set.

### Phase 22 - Bottom Navigation And Mobile Shell Polish

- [ ] TODO-DESIGN-22.1 Implement design-style bottom navigation without breaking existing PRD tab semantics.
- [ ] TODO-DESIGN-22.2 Ensure active tab highlighting works for top-level received worries/answer feed, my worries, and my page.
- [ ] TODO-DESIGN-22.3 Ensure active tab highlighting works for nested write reply, write worry, received-answer detail, my-answer detail, edit interests, my answers, privacy policy, logout confirmation, and account deletion confirmation.
- [ ] TODO-DESIGN-22.4 Resolve central action behavior before implementation; requires product-owner decision if the design's central orange action conflicts with existing PRD tab semantics.
- [ ] TODO-DESIGN-22.5 Ensure bottom navigation does not cover form CTAs, card lists, modals, or final scroll content.
- [ ] TODO-DESIGN-22.6 Ensure scroll containers include bottom padding based on nav height and `env(safe-area-inset-bottom)`.
- [ ] TODO-DESIGN-22.7 Add route-policy tests in `src/services/appShell/prdNavigationPolicy.test.ts` for every bottom-tab mapping changed in this phase.
- [ ] TODO-DESIGN-22.8 Add manual screenshot evidence for bottom nav at 393px, 360px, 430px, and desktop preview.
- [ ] TODO-DESIGN-22.9 Add manual-only PWA/browser notes for iOS safe-area behavior and Android Chrome/PWA bottom navigation behavior; do not treat these as automated tests.
- [ ] TODO-DESIGN-22.V1 Verify Phase 22 with route-policy test output, screenshots, and separate iOS/Android manual notes.

### Phase 23 - Accessibility, Responsive Behavior, And Production Hardening

- [ ] TODO-DESIGN-23.1 Replace fragile absolute positioning from design references with responsive production layouts wherever dynamic data can change size.
- [ ] TODO-DESIGN-23.2 Preserve visual similarity to `design/`, but prefer accessible responsive layout over pixel-perfect copying when they conflict.
- [ ] TODO-DESIGN-23.3 Verify long Korean worry, reply, feedback comment, nickname if kept, category chip wrapping, and privacy policy text remain readable without clipping.
- [ ] TODO-DESIGN-23.4 Verify all controls use semantic `button`, `a`, `input`, `textarea`, or appropriate ARIA roles.
- [ ] TODO-DESIGN-23.5 Verify destructive actions are clearly confirmed, visually differentiated, and disabled while processing.
- [ ] TODO-DESIGN-23.6 Verify color contrast for orange CTAs, cream backgrounds, muted gray text, disabled controls, danger buttons, and chip labels.
- [ ] TODO-DESIGN-23.7 Verify keyboard focus order for login, onboarding, write forms, feedback forms, settings list, logout confirmation, and account deletion confirmation.
- [ ] TODO-DESIGN-23.8 Verify screen-reader labels for icon-only or visually abstract controls, including bottom nav, back buttons, notification/settings icons, pass, feedback, close/cancel, and destructive actions.
- [ ] TODO-DESIGN-23.9 Add manual screenshot evidence for mobile widths 360px, 393px, 430px, and desktop preview across representative routes.
- [ ] TODO-DESIGN-23.10 Add manual-only PWA notes for iOS home-screen/safe-area behavior and Android PWA install/open behavior.
- [ ] TODO-DESIGN-23.11 Add browser-note evidence for loading, error, empty, disabled, and processing states on every production route.
- [ ] TODO-DESIGN-23.V1 Verify Phase 23 with accessibility notes, responsive screenshots, PWA manual-only notes, and any added hardening tests.

### Phase 24 - Regression Test And PRD/Design Release Gate

- [ ] TODO-DESIGN-24.1 Run `npm test` and save passing output.
- [ ] TODO-DESIGN-24.2 Run `npm run lint` and save passing output.
- [ ] TODO-DESIGN-24.3 Run `npm run build` and save passing output.
- [ ] TODO-DESIGN-24.4 Run `npm run test:rules` if Firestore rules or Firestore behavior changed, and save passing output.
- [ ] TODO-DESIGN-24.5 Add any missing focused tests discovered during implementation before release.
- [ ] TODO-DESIGN-24.6 Verify auth, onboarding, example worries, worry publication, reply publication, pass/replacement, read-state, feedback, comment moderation, push registration, account deletion, and PWA install/share still work.
- [ ] TODO-DESIGN-24.7 Verify every `design/` screen has a matching production route/screen or a documented intentional product-level exclusion in the Phase 0 table.
- [ ] TODO-DESIGN-24.8 Verify no static hardcoded design text remains where dynamic production data is required.
- [ ] TODO-DESIGN-24.9 Verify no unused copied design dependencies remain.
- [ ] TODO-DESIGN-24.10 Verify `src/App.tsx` did not become a larger monolith.
- [ ] TODO-DESIGN-24.11 Verify deep module boundaries remain intact using the Phase 8 import-boundary tests.
- [ ] TODO-DESIGN-24.12 Verify every checkbox in `docs/TODO.md` is either checked with evidence or remains unchecked with a clear blocker.
- [ ] TODO-DESIGN-24.V1 Verify Phase 24 by attaching automated test output, manual verification notes, design route map, and boundary review evidence.

## Final Release-Gate Checklist

- [ ] TODO-DESIGN-GATE.1 Confirm all Phase 0 through Phase 24 verification items are checked with evidence.
- [ ] TODO-DESIGN-GATE.2 Confirm Phase 1 product-decision gate was completed before Phase 2 work began.
- [ ] TODO-DESIGN-GATE.3 Confirm no unresolved product decision was bypassed; unresolved decisions are blockers, not implementation assumptions.
- [ ] TODO-DESIGN-GATE.4 Confirm no box was checked based only on visual similarity without functional wiring.
- [ ] TODO-DESIGN-GATE.5 Confirm no `design/` static screen was copied directly into production without replacing hardcoded text/data and reconnecting production behavior.
- [ ] TODO-DESIGN-GATE.6 Confirm required functional/product behavior was completed before presentational reskin work.
- [ ] TODO-DESIGN-GATE.7 Confirm tests cover schema, validation, route, publication, pass, feedback, account, push/PWA, and read-model changes introduced by the integration.
- [ ] TODO-DESIGN-GATE.8 Confirm manual/browser verification covers 393px design hierarchy, 360px/430px/desktop usability, iOS PWA, Android PWA, long Korean content, safe-area behavior, and bottom navigation overlap.
- [ ] TODO-DESIGN-GATE.9 Confirm `docs/PRD.md` remains the source of truth and any product decision that differs from design is documented as an intentional product-level exclusion.
- [ ] TODO-DESIGN-GATE.10 Confirm the deep module architecture remains preserved and presentational components do not own domain, Firebase, Firestore/API, moderation, matching, read-model, push/PWA, or account deletion logic.
- [ ] TODO-DESIGN-GATE.11 Confirm the production app fully matches the required `design/`-aligned state and no hidden design-integration work remains.
