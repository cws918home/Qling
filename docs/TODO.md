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
22. Phase 21 - Static hardcoded data audit and visual acceptance pass
23. Phase 22 - Bottom navigation and mobile shell final polish
24. Phase 23 - Accessibility, responsive behavior, and production hardening
25. Phase 24 - Regression test and PRD/design release gate

## Evidence Rules

- Automated test evidence means the command and passing output are copied into the PR description or linked CI run.
- Manual screenshot evidence means screenshots are attached for the named route/state and viewport.
- Manual browser-note evidence means the PR checklist records browser, viewport/device, route/state, result, and date.
- Emulator/manual-equivalent evidence means either a passing emulator test output or a written manual-equivalent verification note when the emulator cannot cover the case.
- Product-decision evidence means a PRD update, ADR, issue comment, or PR checklist section that records the decision, owner, date, and chosen behavior.
- No hidden external evidence: any checked TODO whose evidence is required for future developers must either embed the canonical decision/evidence in this TODO or point to a stable repository file path. PR comments, chat messages, and local notes may be additional evidence, but they must not be the only source of execution-critical knowledge.

## How to execute a phase

Before starting any phase:

1. Read `Canonical PRD Product Decisions For This Integration`, `Canonical Design Screen To Production Route Mapping`, and `Canonical Production Route/State Inventory`.
2. Expand every TODO ID in the phase and identify the code, test, and manual evidence required by each checkbox.
3. For each checkbox, record concrete implementation evidence, automated test evidence, and manual/browser evidence where requested.
4. Check a box only after the implementation exists and the requested verification evidence exists.
5. Complete every checkbox in the current phase before moving to the next phase.
6. Stop and update this TODO first if `docs/PRD.md` and this TODO conflict; `docs/PRD.md` remains the source of truth.
7. After each phase, report checked TODO IDs, unchecked TODO IDs, and the reason for every unchecked item.
8. Produce the `Phase Output Contract` report before starting the next phase.

## Phase Output Contract

Every phase completion report must include this exact information:

1. Final HEAD SHA.
2. Files changed.
3. Exact TODO IDs checked in that phase.
4. Exact TODO IDs left unchecked in that phase.
5. Evidence table:

| TODO ID | Checked? | Evidence | Verification command/manual note | Remaining risk |
| --- | --- | --- | --- | --- |
| `TODO-DESIGN-x.y` | Yes/No | File paths, test names, screenshots, or canonical section references | Command output summary or browser note | None or explicit residual risk |

6. Commands run and pass/fail result: `npm test`, `npm run lint`, `npm run build`, `npm run test:rules` when Firestore rules or Firestore behavior changed, and targeted test commands when applicable.
7. Manual evidence: browser/device/viewport, route/state, data condition, result, and screenshot path or PR attachment reference when applicable.
8. Boundary evidence: whether `src/App.tsx` grew or shrank in responsibility, whether presentational components imported forbidden service/Firebase/API modules, and whether route policy stayed in `src/services/appShell/prdNavigationPolicy.ts`.
9. Explicit statement on whether the next phase may start.

If a phase is documentation-only, still provide the same report shape and state which runtime commands were not necessary.

## Phase 1 Decision Artifact Contract

Phase 1 must produce a PRD reflection record before Phase 2 starts. The record may live in this TODO if canonical behavior changes, or in a stable repository file path referenced by the Phase 1 output report. PR comments are acceptable only as supplemental evidence.

The PRD reflection record must use these fields:

| Decision area | PRD source section | Chosen behavior | Implementation phase | Test target | Manual evidence target | TODO.md needed modification? | PRD.md needed modification? | Owner/date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Phase 1 Decision Record

Policy source-file inspection for this record:

- `git ls-files docs/privacy_policy.md docs/operation_policy.md`: no tracked policy source files returned.
- `test -f docs/privacy_policy.md`: nonzero exit; `docs/privacy_policy.md` absent.
- `test -f docs/operation_policy.md`: nonzero exit; `docs/operation_policy.md` absent.

Deep module guardrails for downstream phases:

- Keep nickname and age validation in a service module such as `src/services/userProfile/profileValidation.ts`, not inside presentational UI components.
- Nickname uniqueness must use a server/API-backed reservation path; client-only Firestore duplicate checks are forbidden.
- Keep route helper logic in `src/services/appShell/prdNavigationPolicy.ts` or route-level adapters, not inside screen components.
- Browser UI must not mutate `helpedCount` directly.
- The profile eye/avatar motif is visual only; do not add avatar/profile data fields for it.
- Policy screens must render policy sources or a production-safe empty state; fake policy copy is forbidden.
- Presentational screens must not import Firebase, API clients, service internals, or mutation modules.

| Decision area | PRD source section | Chosen behavior | Implementation phase | Test target | Manual evidence target | TODO.md needed modification? | PRD.md needed modification? | Owner/date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nickname | PRD 7.1 | Onboarding nickname is required; `users/{uid}.nickname` is the display field; trim before validation/storage; length 2-12 characters; Korean letters, English letters, and digits only; internal spaces, special characters, emoji, control characters, and whitespace-only input rejected; nickname editing after onboarding excluded from MVP; visible only in the signed-in user's my-page profile summary; forbidden in my answers, answer detail, other-user screens, worry cards, reply cards, example worries, and notification copy. | Phase 9 functional, Phase 10/16/20 presentation and leak checks | `src/services/userProfile/profileValidation.test.ts` or equivalent service test must cover 1-character invalid, 2-character valid, 12-character valid, 13-character invalid, Korean/English/digit valid, internal spaces invalid, special characters invalid, emoji invalid, whitespace-only invalid; my-page contract/leak tests in `src/screens/myPage/contract.test.ts` or equivalent; notification/card leak checks near their read-model or presentation contract tests. | Onboarding invalid/valid nickname screenshots; my-page summary screenshot; screenshots or browser notes proving nickname does not appear in my answers, answer detail, other-user screens, worry cards, reply cards, example worries, or notification copy. | Yes: this Phase 1 record closes `TODO-DESIGN-1.1`, `1.2`, `1.5`, `1.12`, `1.15`, and `1.14` for decision scope. | No. Current PRD is source of truth. | Phase 9/10/16/20, recorded 2026-05-16 |
| nickname uniqueness | PRD 7.1 | `normalizedNickname` uses trim + Unicode NFC + lowercase normalization where lowercase is applicable. Duplicate check is server/API-backed; final uniqueness uses normalized nickname reservation documents; client-only Firestore duplicate checks forbidden. Route/state is `onboarding_duplicate_check`; states are idle/checking/available/duplicate/invalid/network-failed/retry; continue/submit disabled until availability is proven. | Phase 2 route state, Phase 9 server/API behavior, Phase 24 regression | Server/API nickname reservation tests under the eventual nickname reservation module; `src/services/userProfile/profileValidation.test.ts` or equivalent for NFC and lowercase normalization; `src/services/appShell/prdNavigationPolicy.test.ts` for route/state policy; `src/firestore.rules.test.ts` for reservation docs and unsafe direct client write denial; concurrency/race tests for normalized duplicate conflict, reservation transaction conflict, and concurrent conflict behavior. | Onboarding duplicate-check screenshots or notes for available, duplicate, network-failed, retry, disabled-before-available, and conflict retry behavior. | Yes: this Phase 1 record closes `TODO-DESIGN-1.3`, `1.4`, `1.5`, `1.16`, `1.17`, and contributes to `1.14`. | No. Current PRD intentionally leaves implementation mechanism to TODO/implementation docs. | Phase 2/9/24, recorded 2026-05-16 |
| age | PRD 7.1/6.2 | Age is required, number type, persisted to `users/{uid}.age`, range 14-99 inclusive, hidden from other users, not used in MVP matching sort/filter, and optional/removal behavior is forbidden. | Phase 9 functional and rules, Phase 24 regression | `src/services/userProfile/profileValidation.test.ts` or equivalent for required age, numeric type, 14/99 valid, below 14 invalid, above 99 invalid, persistence contract, and no optional/removal path; `src/firestore.rules.test.ts` for required age persistence and validation/rules behavior; matching/recipient-selection tests proving age is not used for MVP sorting/filtering. | Onboarding age validation screenshots for empty, non-number, 14, 99, below-range, above-range, and my-page/profile summary where applicable. | Yes: this Phase 1 record closes `TODO-DESIGN-1.1`, `1.6`, `1.7`, `1.8`, `1.15`, `1.17`, and contributes to `1.14`. | No. Current PRD is source of truth. | Phase 9/24, recorded 2026-05-16 |
| gender edit exclusion | PRD 7.1/7.2 | Gender is required in onboarding, has no MVP edit UI, and my-page edit scope is interests-only. | Phase 9 onboarding, Phase 10/20 my-page | `src/services/userProfile/profileValidation.test.ts` or equivalent onboarding validation test; `src/screens/myPage/contract.test.ts` or equivalent my-page/edit-interests contract tests proving no gender edit control. | Onboarding gender required screenshot; my-page/edit-interests screenshots proving interests-only edit scope. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 9/10/20, recorded 2026-05-16 |
| interests/category value `워라밸` | PRD 7.1 and `packages/domain/src/index.ts` | Domain/display value remains `워라밸`; use `WORRY_CATEGORIES`; do not migrate target away; legacy misspellings are only explicit compatibility input if actually found, not target values. | Phase 9 onboarding/edit interests, Phase 11/12 matching and moderation, Phase 24 regression | `packages/domain/src/index.test.ts`; category inference/fallback tests near the LLM moderation/category module; matching/recipient-selection tests proving `워라밸` is valid; onboarding/edit-interests contract tests using `WORRY_CATEGORIES`. | Onboarding interests and edit-interests screenshots showing `워라밸` chip. | Yes: this Phase 1 record closes `TODO-DESIGN-1.9`, `1.15`, and contributes to `1.14`. | No. Current PRD is source of truth. | Phase 9/11/12/24, recorded 2026-05-16 |
| helpedCount/received hearts | PRD 7.2/7.9/7.10 | Internal field remains `helpedCount`; UI label is `받은 하트`; browser UI must not mutate it directly; changes only through server/service paths. | Phase 10 my-page, Phase 13 feedback, Phase 24 rules/regression | Reply feedback service tests under `src/services/replyFeedback/`; rules/read-model tests as applicable, including `src/firestore.rules.test.ts` if direct writes are governed there; my-page contract test proving `받은 하트` label maps from `helpedCount`. | My-page screenshot showing dynamic `받은 하트`; feedback/browser note proving UI path does not directly mutate `helpedCount`. | Yes: this Phase 1 record closes `TODO-DESIGN-1.10` and contributes to `1.14`. | No. Current PRD is source of truth. | Phase 10/13/24, recorded 2026-05-16 |
| avatar/profile motif | PRD 7.2 design interpretation | Visual-only motif; no avatar upload, avatar URL, or avatar data field. | Phase 14 primitive, Phase 20 my-page visual | `src/screens/myPage/contract.test.ts` or equivalent contract/import-boundary tests proving no avatar data field is required; Phase 8 import-boundary tests as applicable. | My-page/profile screenshots proving motif is shown without avatar upload or avatar data. | Yes: this Phase 1 record closes `TODO-DESIGN-1.11` and contributes to `1.14`. | No. Current PRD is source of truth. | Phase 14/20, recorded 2026-05-16 |
| display-name fallback | PRD 7.1 | My-page summary shows nickname; fallback is allowed only for loading/missing-profile defensive state and must not leak to other-user screens, cards, details, lists, or notifications. | Phase 10 my-page, Phase 20 visual/leak checks | `src/screens/myPage/contract.test.ts` or equivalent; presentation contract/leak tests for cards/details/lists/notifications near their owning modules. | My-page loading/missing-profile note and screenshots proving fallback is limited; screenshots proving no fallback identity in other-user screens, cards, details, lists, or notifications. | Yes: this Phase 1 record closes `TODO-DESIGN-1.2`, `1.5`, `1.12`, and contributes to `1.14`. | No. Current PRD is source of truth. | Phase 10/20, recorded 2026-05-16 |
| policy routes | PRD 7.2 | Privacy policy and operation policy only; terms and dedicated usage-guide excluded; no login policy links; access only from my-page/more. Source targets are `docs/privacy_policy.md` and `docs/operation_policy.md`; inspection found neither tracked nor present. Phase 10/20 must handle absent/empty source with production-safe empty state; fake copy forbidden. | Phase 2 routes, Phase 10 policy behavior, Phase 20 visual | `src/services/appShell/prdNavigationPolicy.test.ts` for explicit privacy/operation routes and excluded terms/usage-guide/login links; policy source/empty-state behavior tests near the policy loader/screen contract. | My-page/more policy route screenshots; privacy and operation policy empty-state screenshots if sources remain absent/empty; login screenshot proving no policy links. | Yes: this Phase 1 record closes `TODO-DESIGN-1.13` and contributes to `1.14`. | No. Current PRD is source of truth. | Phase 2/10/20, recorded 2026-05-16 |
| PWA install/share | PRD 4.1/7.2 | My-page/more includes `앱처럼 사용하기`; Android install, iOS share-to-home-screen guidance, and URL/QR sharing are required; static guidance cannot replace real PWA targets. | Phase 10 behavior, Phase 20 visual, Phase 23 hardening | PWA install/share hook or service tests where practical; my-page contract tests for settings row; manifest/service-worker target checks in build or PWA-specific tests if available. | Android Chrome install/open note, iOS Safari share-to-home-screen note, URL/QR sharing browser note. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 10/20/23, recorded 2026-05-16 |
| push notification settings | PRD 7.2 | My-page/more includes Web Push permission request, FCM registration, and granted/denied/default status display; real push path required. | Phase 10 behavior, Phase 20 visual, Phase 23 hardening | Push registration service/hook tests under `src/services/pushRegistration/`; my-page contract tests for settings row and status mapping. | Browser notes/screenshots for granted, denied, default where possible, plus FCM registration status. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 10/20/23, recorded 2026-05-16 |
| bottom navigation | PRD 7.2 | Default authenticated route is `답변하기`; tabs are `답변하기 / 나의 고민 / 마이페이지`; central action is `고민 작성` and navigates directly to `write_worry`, not a tab switch. | Phase 2 route policy, Phase 14 primitive, Phase 22 polish | `src/services/appShell/prdNavigationPolicy.test.ts` for default route, tab ownership, and central action routing; Phase 14 primitive contract tests if added. | Bottom-navigation screenshots at 393px, 360px, 430px, and desktop; central-action browser note proving direct `write_worry` navigation. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 2/14/22, recorded 2026-05-16 |
| publish-success routing | PRD 7.4/7.6 | Worry success opens newly written worry detail; reply success opens newly written my-answer detail; `question-write-b` and `answer-write-3` are visual references only; no standalone terminal success route. | Phase 2 route policy, Phase 12 publication behavior | `src/services/appShell/prdNavigationPolicy.test.ts`; worry publication tests under `src/services/worryPublication/`; reply publication tests under `src/services/replyPublication/`; feed tests for answered-item removal. | Browser notes for worry publish-to-written-detail and reply publish-to-my-answer-detail; proof no terminal success route blocks navigation. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 2/12, recorded 2026-05-16 |
| example-worry indistinguishability | PRD 7.1/7.10 | Create example worries before answer feed; do not label them example/tutorial/sample/fake; my answers show example replies like real replies. | Phase 9 example creation, Phase 10/11/13 read models, Phase 21/24 audit | Example worry creation tests; `src/services/homeWorryFeed/prdPolicy.test.ts`; my-answer/read-model tests proving example replies appear without labels; static-data audit tests/checks in Phase 21/24. | Answer feed and my-answers screenshots proving examples are indistinguishable and unlabeled. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 9/10/11/13/21/24, recorded 2026-05-16 |
| hidden-content behavior | PRD 7.5/7.7 | Hidden worries/replies disappear from answer feed, my worries, received replies, my answers, and detail routes. | Phase 10/11/13 read models, Phase 24 regression | `src/services/homeWorryFeed/prdPolicy.test.ts`, `src/services/myWorries/prdPolicy.test.ts`, my answers/read-model tests, received replies/detail read-model tests, and detail route tests. | Browser notes/screenshots for hidden worry/reply exclusion from answer feed, my worries, received replies, my answers, and detail routes. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 10/11/13/24, recorded 2026-05-16 |
| my-page edit scope | PRD 7.2 | My-page edit is interests-only; no gender edit UI; nickname edit excluded from MVP; age edit excluded unless PRD changes. | Phase 10 behavior, Phase 20 visual | `src/screens/myPage/contract.test.ts` or equivalent; edit-interests contract tests proving only interests are editable. | My-page and edit-interests screenshots proving only interests can be edited. | Yes: this Phase 1 record contributes to `TODO-DESIGN-1.14`. | No. Current PRD is source of truth. | Phase 10/20, recorded 2026-05-16 |

The decision areas must include at least:

- nickname
- nickname uniqueness
- age
- gender edit exclusion
- interests/category value `워라밸`
- helpedCount/received hearts
- avatar/profile motif
- policy routes
- PWA install/share
- push notification settings
- bottom navigation
- publish-success routing
- example-worry indistinguishability
- hidden-content behavior
- my-page edit scope

Phase 1 is not complete until every Phase 1 checkbox is represented in this artifact with an implementation phase, test target, and manual evidence target.

## Canonical PRD Product Decisions For This Integration

- Default authenticated route: `답변하기`.
- Bottom tabs: `답변하기 / 나의 고민 / 마이페이지`.
- Center bottom action: `고민 작성`; it opens write worry and is not the default route.
- Nickname: required, unique, server-verified, persisted with normalized uniqueness data, and visible only in the signed-in user's my-page profile summary.
- Age: required, persisted, hidden from other users, and not used for MVP matching sort/filter logic.
- Gender: required during onboarding and not editable in MVP.
- Interests: required during onboarding, stored as domain category values, and editable from my page.
- Category spelling: target production domain value and display value is `워라밸`.
- Received hearts: display existing `helpedCount` as `받은 하트`; browser UI must not mutate `helpedCount` directly.
- Example worries: create before entering the authenticated feed, but never visually label them as example, tutorial, sample, seed, or fake content.
- Login policy links: login must not expose privacy policy, operation policy, terms, or policy-link text.
- MVP policy routes: privacy policy and operation policy only, reachable from my-page/more; terms and a dedicated usage-guide screen are excluded.
- Worry publish success: route to the newly written worry detail and carry enough created worry id information to resolve that detail.
- Reply publish success: route to the newly written my-answer detail and carry enough created reply id information to resolve that detail.
- Reply success: remove the answered delivery from the answer feed.
- Success UI: `question-write-b` and `answer-write-3` are visual references only for transient success styling. Do not implement standalone production success routes for write worry or write reply. Any toast/modal/copy must not block the required detail navigation.
- Hidden content: hidden worries/replies must disappear from all user-facing read models, including answer feed, my worries, received replies, my answers, and detail routes.
- PWA/push settings: PWA install/share and push notification settings live under my-page/more.
- Static design data: production UI must not copy sample names, fixed dates, fixed counts, static worry/reply bodies, lorem ipsum, fake status bars, fake home indicators, or fixed 393px-only absolute positioning.

## Shared UI Primitive Ownership

Shared primitives are introduced or adapted in Phase 14 and reused by later phases. Later visual phases may compose these primitives, but must not reimplement them locally inside a screen.

| Primitive | Owner phase | Expected consumers/screens | Forbidden duplication rule | Test/evidence target |
| --- | --- | --- | --- | --- |
| App shell / mobile frame | Phase 14 | All authenticated and unauthenticated screens | Do not create screen-local fake phone frames, fake status bars, or fake home indicators | 393px/360px/430px/desktop screenshots; safe-area browser notes |
| Bottom navigation | Phase 14 | Phases 17-22, received worries, write reply, write worry, my worries, my answers, my page, policy/account states | Do not reimplement separately inside received-worries, write screens, my-page, my-worries, or my-answers | Route-policy tests; active tab screenshots at 393px/360px/430px/desktop |
| Central write-worry action | Phase 14 | Bottom navigation shell and write worry entry points | Do not implement as a simple `나의 고민` tab switch or screen-local button with duplicate route logic | Route-policy tests proving navigation to `write_worry`; manual central-action evidence |
| Content sheet | Phase 14 | Onboarding, feed, write forms, details, my-page/account screens | Do not create incompatible screen-local sheet radii/shadows/spacing | Primitive screenshot and representative integrated screenshots |
| Orange header band | Phase 14 | Received worries, my-page, my answers, my worries, edit interests where design calls for it | Do not hardcode divergent orange header layouts per screen | Token review and screenshots |
| Primary CTA | Phase 14 | Login, onboarding, write forms, confirmations | Do not define per-screen primary button colors/radii/loading behavior | Props-contract tests where useful; screenshots for enabled/disabled/processing |
| Secondary/destructive CTA | Phase 14 | Logout, account deletion, dialogs, cancel actions | Do not create local destructive button semantics without shared disabled/processing rules | Confirmation screenshots and props-contract tests |
| Card | Phase 14 | Feed cards, my answers, my worries, detail cards | Do not copy static design cards with embedded data | Props-contract tests for dynamic data; visual screenshots |
| Category chip | Phase 14 | Onboarding interests, edit interests, feed/detail categories | Do not hardcode category labels or local selected-state styling | Domain category tests; chip screenshots including `워라밸` |
| Text area | Phase 14 | Write worry, write reply, feedback comment | Do not implement local character-count/validation visuals separate from shared state mapping | Validation/props-contract tests; screenshots for empty/too-long/valid |
| Modal/dialog | Phase 14 | Logout, account deletion, feedback/comment confirmation if used | Do not create screen-local focus/escape/destructive behavior | Manual focus/cancel/confirm evidence |
| Empty/loading/error state | Phase 14 | Every route with async data | Do not replace missing dynamic data with design samples | Manual matrix evidence for loading/empty/error states |
| Profile eye/avatar motif | Phase 14 | My-page/profile summary and account confirmation visuals | Do not add avatar upload or avatar data fields | My-page screenshots proving motif is visual only |
| Policy text container | Phase 14 | Privacy policy and operation policy screens | Do not use fake policy body or login policy link components | Policy screenshots for filled or empty state |
| Settings row | Phase 14 | My-page/more, push/PWA/policy/logout/delete rows | Do not create per-screen navigation-row implementations with divergent accessibility | My-page/settings screenshots and route tests |

## Minimum Manual Evidence Matrix

This is the minimum manual/browser evidence required before release. Phase reports may add more evidence, but Phase 24 and the final release gate must prove this matrix is complete.

| Route/state | Required viewport(s) | Required state/data condition | Evidence type |
| --- | --- | --- | --- |
| Login | 393px and one non-393px width | Google login ready/error/processing as applicable; no policy or terms links | Screenshot/browser note |
| Onboarding basic | 393px | Empty, invalid, valid nickname/gender/age states | Screenshot/browser note |
| Onboarding duplicate check | 393px | Available, duplicate, and network-failed or simulated failed state | Screenshot/browser note |
| Onboarding interests | 393px and one narrow width if chips wrap | Selected, unselected, no-selection invalid; includes `워라밸` | Screenshot/browser note |
| Received worries | 393px and one non-393px width | Loading, empty, error, non-empty, pass loading, pass failure, pass success, open card | Screenshot/browser note |
| Write worry | 393px | Empty, too-long, valid, processing, moderation rejected, published-to-detail | Screenshot/browser note |
| Write reply | 393px | Selected worry, empty, valid, moderation rejected, published-to-my-answer-detail, feed item removed | Screenshot/browser note |
| My page | 393px | Dynamic nickname, helpedCount as `받은 하트`, interests, push/PWA/settings rows | Screenshot/browser note |
| Edit interests | 393px | Selected, save, error | Screenshot/browser note |
| My answers | 393px | Dynamic list and my-answer detail | Screenshot/browser note |
| My worries | 393px | Dynamic list, detail, received replies | Screenshot/browser note |
| Privacy policy | 393px | Filled body or production-safe empty state | Screenshot/browser note |
| Operation policy | 393px | Filled body or production-safe empty state | Screenshot/browser note |
| Logout confirmation | 393px | Cancel, confirm, processing | Screenshot/browser note |
| Account deletion confirmation | 393px | Cancel, confirm, processing | Screenshot/browser note |
| Bottom navigation | 393px, 360px, 430px, desktop | Active tab mapping and central write-worry action | Screenshot/browser note |
| PWA install/share | iOS Safari/PWA where available; Android Chrome/PWA where available | iOS safe-area/share-to-home-screen note; Android install/open note | Manual browser note |
| Push notification settings | Browser(s) supported by current implementation | Granted, denied, default where possible; FCM registration status where supported | Manual browser note |

## Presentational Import Boundary Contract

Presentational screen files must not import service implementation, Firebase, server, or data mutation modules. Phase 8 import-boundary tests must be implementable from these exact patterns.

Forbidden import patterns for presentational screen files:

- `src/firebase`
- `firebase/*`
- `firebase-admin/*`
- `src/services/**/apiClient`
- `src/services/**/production`
- `src/services/**/server*`
- `server.ts`
- `src/server/**`
- Firestore SDK imports, including `firebase/firestore`
- Firebase auth/messaging imports, including `firebase/auth` and `firebase/messaging`
- Account deletion clients, including `src/services/userAccount/client` and mutation paths for `deleteMyAccountViaApi`
- Push registration internals, including `src/services/pushRegistration/internalLifecycle`, `src/services/pushRegistration/adapters`, `src/services/pushRegistration/serviceWorker`, and storage mutation internals
- Read-state API clients, including `src/services/readState/apiClient`
- Publication API clients, including `src/services/worryPublication/apiClient` and `src/services/replyPublication/apiClient`
- Feedback production adapters, including `src/services/replyFeedback/production` and direct `submitReplyFeedbackWithProductionAdapters` imports
- Delivery pass API clients, including `src/services/deliveries/apiClient` and direct `passDeliveryViaApi` imports

Allowed imports for presentational screen files:

- Type-only screen contract imports.
- Shared UI primitives owned by Phase 14.
- Pure formatting helpers if explicitly approved in the screen contract and covered by import-boundary tests.
- Static SVG/icon assets that are UI-only and not data-bearing.

## Canonical Design Screen To Production Route Mapping

| Design screen | Production route/state | Product interpretation | Required data source | Primary implementation phase | Visual reskin phase | Required tests/evidence | Static design data that must not be copied |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `splash` | Splash/loading shell state before auth/profile resolution | Transitional app-start state only; no separate product feature | Auth/profile loading state from app shell | Phase 2 route state; Phase 3 shell boundary | Phase 15 | Route-policy coverage if represented in policy; manual screenshots for splash/loading | Fake status bar/home indicator, fixed 393px frame, static decorative-only timing |
| `loading` | Loading shell state for auth/profile/route data | Generic production loading state reused by shell and route containers | Real auth/profile or route loading flags | Phase 2 route state; Phase 3 shell boundary | Phase 15 | Manual screenshots for loading; browser notes for loading states in Phase 23 | Fake status bar/home indicator, fixed loading copy if route-specific copy is needed |
| `login` | `login` shell route | Google login entry; no policy/terms links under current PRD | Firebase auth state and production Google sign-in callback | Phase 2 route state; Phase 4 contract | Phase 15 | Auth route-policy tests; manual screenshot proving login policy links are absent | Static preview routing, fake policy links, terms links, fake status/home chrome |
| `onboarding-basic` | `onboarding_basic` plus `onboarding_gender_age` states | Required nickname, gender, and age collection; nickname visible only later in my-page summary | Profile draft state; nickname/age validation service; gender constants | Phase 9 | Phase 16 | Onboarding/profile validation tests; Firestore rules tests for required fields; manual first-time sign-in note | Sample nickname `라미`, hardcoded age/gender values, static validation state |
| `onboarding-duplicate` | `onboarding_duplicate_check` state | Required nickname duplicate check and availability confirmation before completion | Server/API nickname reservation transaction or duplicate-check result | Phase 9 | Phase 16 | Nickname uniqueness tests, race/conflict tests, rules tests, manual duplicate-check evidence | Sample nickname `라미`, static available/duplicate result |
| `onboarding-interests` | `onboarding_interests` state | Required multi-select interests before example worries and answer feed | `WORRY_CATEGORIES` from `packages/domain`, user profile interests | Phase 9 | Phase 16 | Domain category tests; onboarding tests for minimum one selection and persistence | Design category misspelling, hardcoded selected chips, fixed 393px chip layout |
| `received-worries` | `답변하기` / received worries answer feed | Default authenticated route; dynamic list of worries assigned for reply; pass/open/read-state behavior | `useHomeWorryFeed`, `filterSuppressedFeedWorries`, `passDeliveryViaApi`, read-state API | Phase 5 container; Phase 11 behavior | Phase 17 | Route-policy tests; feed/pass/read-state service tests; props-contract tests; manual pass/open/reply-removal notes | Static worry cards, fixed dates/counts, sample body text, UI-only pass removal |
| `question-write-a` | `write_worry` route/state | Write-worry form visual reference, not a separate duplicate feature | Worry draft from `contentDrafts`, `validateDraftContent`, `publishWorryViaApi` | Phase 6 container; Phase 12 behavior | Phase 18 | Validation/draft/publication tests; route test for publish to written worry detail; manual screenshot | Static textarea content, fake publish success, fixed character count |
| `question-write-b` | Transient write-worry confirmation styling only, followed by written worry detail navigation | Write-worry success visual reference, not a standalone production route; any toast/modal/copy must not block navigation to the newly written worry detail | Created worry id from publish API/container and my-worries/detail read model | Phase 12 | Phase 18 | Route-policy test proving created worry id resolves written worry detail; manual publish-to-detail note | Lorem ipsum, static success copy that blocks required route transition, terminal success screen behavior |
| `answer-write-1` | `write_reply` initial/editing state | Write-reply form empty/input state for selected received worry | Selected delivery/worry data, reply draft keyed by delivery id, validation service | Phase 6 container; Phase 12 behavior | Phase 17 | Draft/validation/publication tests; props-contract tests; manual write-reply screenshot | Fixed date, static worry text, placeholder as submitted content |
| `answer-write-2` | `write_reply` expanded/read-before-reply state | Write-reply variant showing selected worry detail; same production route as write reply | Selected delivery/worry data and read-state marking | Phase 6 container; Phase 11/12 behavior | Phase 17 | Read-state/open tests; props-contract tests for selected worry display | Lorem ipsum, fixed date, duplicated standalone route behavior |
| `answer-write-3` | Transient write-reply confirmation styling only, followed by my-answer detail navigation | Reply success visual reference, not a standalone production route; any toast/modal/copy must not block navigation to the newly written my-answer detail or feed-item removal | Created reply id from publish API/container; my-answer detail read model; feed refresh | Phase 12 | Phase 17 | Route-policy test for created reply id; feed test for answered-item removal; manual publish-to-my-answer-detail evidence | Lorem ipsum, fixed date, static success modal as terminal state |
| `answer-check` | `received_answer_detail` and `my_answer_detail` | Shared visual pattern for two distinct product flows: replies received on my worries and replies I wrote | `useRepliesForWorry`, `useMyGivenReplies`, reply feedback/comment services, read-state APIs | Phase 7 container; Phase 13 behavior | Phase 19 | Feedback/read-model tests; props-contract tests for both detail types; manual detail/feedback/comment evidence | Lorem ipsum, fixed dates, static feedback/comment bodies |
| `my-page` | `마이페이지` route | Profile summary and more/settings hub; only place nickname appears | User profile, interests, `helpedCount`, push registration hooks, PWA install/share hooks | Phase 7 container; Phase 10 behavior | Phase 20 | My-page route tests; account/push tests; props-contract tests; manual screenshot with dynamic data | `라미`, `314`, fake avatar as data, static settings status |
| `edit-interests` | `edit_interests` route/state | Interests-only profile edit; gender is not editable in MVP | User profile interests and domain `WORRY_CATEGORIES` | Phase 10 | Phase 20 | Profile update tests if touched; props-contract tests; manual screenshot | Design category misspelling, hardcoded selected chips |
| `my-answers` | `my_answers` route/state | List of replies written by the user, including replies to example worries without labels | `useMyGivenReplies`; hidden-content filtering/read model | Phase 7 container; Phase 10 behavior | Phase 19 | My-answer/read-model tests; props-contract tests; manual list/detail navigation evidence | Fixed dates, static answer bodies, example/tutorial labels |
| `my-worries` | `my_worries` route/state | List of worries written by the user and navigation to received replies | `useMyWorries`, `useRepliesForWorry`, read-state API | Phase 7 container; Phase 10 behavior | Phase 18 | My-worries/read-model tests; props-contract tests; manual list/detail evidence | Fixed dates, fixed reply counts, static worry bodies |
| `privacy-policy` | `privacy_policy` route/state plus `operation_policy` sibling route/state | Design provides privacy visual only; production must implement privacy policy and PRD-required operation policy access | `docs/privacy_policy.md`, `docs/operation_policy.md`, production-safe empty state if empty | Phase 10 | Phase 20 | Route-policy tests for both routes; manual screenshots for privacy, operation, empty state if applicable | Fake policy body, terms links, login policy links |
| `logout` | `logout_confirmation` route/state | Confirmation before existing sign-out behavior | Firebase sign-out path and push registration cleanup | Phase 10 | Phase 20 | Account/push cleanup tests if touched; route tests; manual confirmation screenshot | `라미`, `314`, static profile data, confirmation that signs out without explicit action |
| `account-deletion` | `account_deletion_confirmation` route/state | Confirmation before existing account deletion behavior | `deleteMyAccountViaApi`, Firebase sign-out, push cleanup | Phase 10 | Phase 20 | `deleteMyAccount` tests; push cleanup tests if touched; route tests; manual confirmation screenshot | `라미`, `314`, fake profile data, static destructive state |

## Canonical Production Route/State Inventory

| Route/state | Owning tab or shell state | Entry points | Back route | Required data source | Success transition | Implementation phase | Test target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `splash` / `loading` | Shell | App start, auth/profile refresh, route data loading | None | Auth/profile loading state and route container loading flags | `login`, onboarding, or `답변하기` after resolution | Phase 2/3 | `src/services/appShell/prdNavigationPolicy.test.ts` if modeled in policy; manual loading evidence |
| `login` | Shell | Unauthenticated auth/profile resolution | None | Firebase auth and Google sign-in callback | Existing profile -> `답변하기`; missing profile -> onboarding basic | Phase 2/4 | App-shell route tests; manual login screenshot |
| `onboarding_basic` | Shell onboarding flow | New signed-in user without completed profile | `login` only if sign-out/cancel is explicitly supported | Profile draft, nickname/age/gender validation | `onboarding_duplicate_check` or `onboarding_gender_age` depending split | Phase 9 | Onboarding/profile validation tests |
| `onboarding_duplicate_check` | Shell onboarding flow | Continue from nickname entry | `onboarding_basic` | Server/API nickname duplicate-check or reservation result | Next onboarding step after available nickname | Phase 9 | Nickname uniqueness and reservation conflict tests |
| `onboarding_gender_age` | Shell onboarding flow | Onboarding basic if split into substep | Previous onboarding step | Gender choice, age validation/persistence | `onboarding_interests` | Phase 9 | Profile validation and Firestore rules tests |
| `onboarding_interests` | Shell onboarding flow | After required identity fields | Previous onboarding step | `WORRY_CATEGORIES`, profile interest draft | Create example worries, then `답변하기` | Phase 9 | Onboarding tests and domain category tests |
| `답변하기` / `received_worries` | `답변하기` | Default authenticated route, pass success, reply back route | None or shell default | `useHomeWorryFeed`, delivery suppression, read-state API | Open card -> `write_reply`; pass -> refresh/remain | Phase 5/11 | Feed/pass/read-state tests; route-policy tests |
| `write_worry` | `나의 고민` area through center action | Center bottom action, my worries entry point | `my_worries` / `나의 고민` | Worry draft, content validation, publication API | Newly written worry detail with created worry id; no standalone success route | Phase 6/12 | Draft/validation/publication tests; route-policy tests |
| `write_reply` | `답변하기` | Received worry card open | `답변하기` | Selected delivery/worry, reply draft keyed by delivery id, publication API | Newly written my-answer detail with created reply id; answer feed removes item; no standalone success route | Phase 6/12 | Reply publication, draft, feed-removal, route-policy tests |
| `received_answer_detail` | `나의 고민` | My worries received reply open | `my_worries` | `useRepliesForWorry`, reply feedback/comment services, read-state API | Feedback/comment submit stays on detail | Phase 7/13 | Feedback/read-model tests |
| `my_answer_detail` | `마이페이지` | My answers list, reply publish success | `my_answers` or `마이페이지` | `useMyGivenReplies`, original worry data, reply data | Feedback route state remains current if applicable | Phase 7/13 | My-answer detail/read-model tests |
| `마이페이지` | `마이페이지` | Bottom tab | None | User profile, interests, `helpedCount`, push/PWA hooks | Settings item routes below | Phase 7/10 | My-page props-contract, account/push tests |
| `edit_interests` | `마이페이지` | My-page profile/settings item | `마이페이지` | User profile interests and `WORRY_CATEGORIES` | Save -> `마이페이지` | Phase 10 | Profile update tests if touched; route-policy tests |
| `my_answers` | `마이페이지` | My-page settings/item | `마이페이지` | `useMyGivenReplies`, hidden-content filtering | Open item -> `my_answer_detail` | Phase 7/10 | My-answer read-model tests |
| `my_worries` | `나의 고민` | Bottom/nav area, my-page item if present | `나의 고민` or `마이페이지` depending entry | `useMyWorries`, `useRepliesForWorry` | Open received reply -> `received_answer_detail` | Phase 7/10 | My-worries read-model tests |
| `privacy_policy` | `마이페이지` | My-page/more policy item | `마이페이지` | `docs/privacy_policy.md`; empty-state fallback | None | Phase 10 | Route-policy tests; manual policy screenshot |
| `operation_policy` | `마이페이지` | My-page/more policy item | `마이페이지` | `docs/operation_policy.md`; empty-state fallback | None | Phase 10 | Route-policy tests; manual policy screenshot |
| `logout_confirmation` | `마이페이지` | My-page/more logout item | `마이페이지` | Firebase sign-out and push cleanup callback | Confirm -> `login`; cancel -> `마이페이지` | Phase 10 | Account/push cleanup tests if touched; route-policy tests |
| `account_deletion_confirmation` | `마이페이지` | My-page/more delete account item | `마이페이지` | `deleteMyAccountViaApi`, sign-out, push cleanup | Confirm -> `login`; cancel -> `마이페이지` | Phase 10 | `src/services/userAccount/deleteMyAccount.test.ts`; route-policy tests |

## Detailed Phased TODO Checklist

### Phase 0 - Design Inventory And Production-Gap Audit

- [x] TODO-DESIGN-0.1 Inspect `design/README.md`, `design/package.json`, every `design/src/screens/**/Component.tsx`, all screen-local SVG/image assets, `design/src/styles/index.css`, `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/services/appShell/prdNavigationPolicy.ts`, `src/services/validation/content.ts`, `src/services/drafts/contentDrafts.ts`, the service folders named in this TODO, `packages/domain/src/index.ts`, `firestore.rules`, `src/firestore.rules.test.ts`, and existing related tests; embedded evidence is summarized by the canonical product-decision, route inventory, mapping, token/motif, and warning sections in this TODO.
- [x] TODO-DESIGN-0.2 Create a single screen-to-route mapping table covering every design screen: `splash`, `loading`, `login`, `onboarding-basic`, `onboarding-duplicate`, `onboarding-interests`, `received-worries`, `question-write-a`, `question-write-b`, `answer-write-1`, `answer-write-2`, `answer-write-3`, `answer-check`, `my-page`, `edit-interests`, `my-answers`, `my-worries`, `privacy-policy`, operation-policy access, `logout`, and `account-deletion`; evidence: the embedded `Canonical Design Screen To Production Route Mapping` section.
- [x] TODO-DESIGN-0.3 Classify each design screen in the embedded mapping table as a required functional screen, confirmation/modal state, visual variant of another production flow, or intentional product-level exclusion/PRD override.
- [x] TODO-DESIGN-0.4 Record production gaps discovered from the audit, including onboarding identity fields, onboarding duplicate check, explicit onboarding subroutes, edit interests, my answers, my worries, privacy policy, operation policy, logout confirmation, account deletion confirmation, answer-check/detail mapping, bottom navigation, publish-success routing, route-policy gaps, and static-design data replacement; evidence: the embedded canonical product-decision, route inventory, and mapping sections.
- [x] TODO-DESIGN-0.5 Record design tokens and motifs: SUIT font, orange `#ff8b3d`/`#ff8b0d`, cream `#fff1d1`/`#fff5eb`, dark text `#1a1a1a`/`#2a2a2a`, muted gray `#b8b8b8`, border gray `#dadce0`/`#f0f0f2`, pill/card/modal radii, card/modal shadows, orange header band, cream content sheet, bottom navigation, category chips, white cards, text areas, CTA styles, modal styles, and profile eye/avatar motif; evidence is this embedded token/motif list plus Phase 14 implementation targets.
- [x] TODO-DESIGN-0.6 Record implementation warnings: fixed absolute positioning, fake status bars, fake home indicators, hardcoded sample names/dates/counts/content, lorem ipsum, preview-only routing, fixed 393px-only layout, and blind copying of `design/package.json` dependencies are not acceptable production implementation; evidence is this embedded warning plus static-data prohibitions in the canonical mapping.
- [x] TODO-DESIGN-0.7 Verify this TODO states that `design/` is static and production routing/state/API/UX flows must be implemented in production modules; evidence: Scope Statement, Non-Goals, canonical sections, and Phase 3-8 boundary gates.
- [x] TODO-DESIGN-0.V1 Verify Phase 0 with the completed mapping table, gap list, token list, and implementation-warning list embedded in this TODO before checking this item.

### Phase 1 - Product Model And Schema Decisions Before UI

Phase 2 must not begin until Phase 1 verifies that the current `docs/PRD.md` product decisions are reflected in this TODO and downstream implementation items. If a TODO item conflicts with `docs/PRD.md`, treat the PRD as the source of truth and stop to update this TODO before implementation. Phase 1 checkboxes are decision, reflection, and implementation-target gates only; do not check them based on production code changes unless the item only asks for verification of already-existing behavior. Phase 1 must produce the `Phase 1 Decision Artifact Contract` record.

- [x] TODO-DESIGN-1.1 Verify nickname required behavior from `docs/PRD.md` and record it in the Phase 1 decision artifact: onboarding must collect nickname, nickname duplicate check remains in the flow, nickname and age are added to stored profile data, and nickname is visible only to the signed-in user in the my-page profile summary.
- [x] TODO-DESIGN-1.2 Define profile fields exactly in the Phase 1 decision artifact: display nickname field, normalized nickname field, trim behavior, min/max length, allowed characters, blocked characters, error copy, and whether nickname can be changed after onboarding; ensure nickname exposure is limited to the my-page profile summary and does not appear in my answers, answer detail, other-user screens, worry cards, reply cards, example worries, or notification copy.
- [x] TODO-DESIGN-1.3 Define duplicate-check behavior exactly in the Phase 1 decision artifact: route/state location, trigger, idle/checking/available/duplicate/invalid/network-failed/retry states, disabled submit rules, and display copy.
- [x] TODO-DESIGN-1.4 Define nickname uniqueness persistence exactly in the Phase 1 decision artifact for implementation: server/API transaction using normalized nickname reservation documents, not client-only Firestore checks; keep the PRD wording limited to server-side final duplicate-check guarantee.
- [x] TODO-DESIGN-1.5 Verify nickname rejection/removal paths are not implemented because nickname is required by the current PRD; record evidence targets in the Phase 1 decision artifact showing onboarding basic, duplicate-check, and my-page summary all follow required-nickname behavior.
- [x] TODO-DESIGN-1.6 Verify age required behavior from `docs/PRD.md` and record it in the Phase 1 decision artifact: age is mandatory, persisted to `users/{uid}.age`, validated during onboarding, included in data policy, and not used for MVP matching sort/filter logic.
- [x] TODO-DESIGN-1.7 Define `users/{uid}.age` type, allowed range, validation copy, persistence path, rules behavior, and matching non-use exactly in the Phase 1 decision artifact; use the current PRD range of 14 through 99 unless the product owner updates the PRD.
- [x] TODO-DESIGN-1.8 Verify age rejection/removal paths are not implemented because age is required by the current PRD; record evidence targets in the Phase 1 decision artifact showing onboarding basic preserves required age input and validation.
- [x] TODO-DESIGN-1.9 Verify the target category value from `docs/PRD.md` and `packages/domain/src/index.ts` and record it in the Phase 1 decision artifact: the production domain/display value is `워라밸`; existing data, seed/example worries, and test fixtures must not be migrated away from `워라밸`; if truly legacy misspellings exist in data, record them only as explicit compatibility input targets and not as the target domain value.
- [x] TODO-DESIGN-1.10 Verify received hearts behavior and record it in the Phase 1 decision artifact: `받은 하트` displays existing `helpedCount` and browser UI code does not mutate `helpedCount` directly.
- [x] TODO-DESIGN-1.11 Record in the Phase 1 decision artifact that the design eye/profile motif is a design implementation detail only; do not add avatar upload or avatar fields to the product model unless the PRD later adds them.
- [x] TODO-DESIGN-1.12 Define profile display-name fallback under required-nickname behavior in the Phase 1 decision artifact: my-page summary may display the user's nickname, but fallback identity must not leak into other users' screens, worry/reply cards, my-answer lists, or answer details.
- [x] TODO-DESIGN-1.13 Define policy behavior from `docs/PRD.md` in the Phase 1 decision artifact: keep privacy policy and operation policy only, exclude terms and a dedicated usage-guide screen from MVP, do not show policy links on login, expose policy access only from my-page/more, use `docs/privacy_policy.md` and `docs/operation_policy.md` as policy body sources, allow those files to be empty, and show a production-safe empty state such as policy body preparation without adding fake policy copy; record Phase 2 route targets and Phase 10/20 implementation targets.
- [x] TODO-DESIGN-1.14 Produce and verify the Phase 1 PRD reflection record required by `Phase 1 Decision Artifact Contract`; it must confirm nickname, age, duplicate check, helpedCount/received hearts, avatar-as-design-detail, display-name exposure limits, privacy/operation policy behavior, PWA install/share, push notification settings, bottom navigation, publish-success routing, category value, example-worry indistinguishability, hidden-content behavior, and my-page edit scope.
- [x] TODO-DESIGN-1.15 Add validation/schema test targets to the Phase 1 decision artifact and implementation plan: domain category tests in `packages/domain/src/index.test.ts`; LLM category validation/fallback/matching tests proving `워라밸` is valid; any legacy misspelling coverage must be explicit compatibility-input coverage only; content validation remains in `src/services/validation/content.test.ts`; profile nickname and required age validation tests go in a new service test such as `src/services/userProfile/profileValidation.test.ts` or `src/services/authProfile/profileIdentity.test.ts` if that module owns the logic.
- [x] TODO-DESIGN-1.16 Add nickname uniqueness test targets to the Phase 1 decision artifact: normalized nickname validation, duplicate check result mapping, reservation transaction conflict, concurrent/race conflict behavior, and Firestore rules preventing unsafe direct client writes.
- [x] TODO-DESIGN-1.17 Add Firestore rules test targets to the Phase 1 decision artifact in `src/firestore.rules.test.ts` for nickname reservation docs, server-owned nickname fields, required age persistence, and age validation/rules behavior; note whether `npm run test:rules` is required in Phase 24.
- [x] TODO-DESIGN-1.GATE Verify the PRD reflection gate: the Phase 1 decision artifact covers every required decision area, all current `docs/PRD.md` product decisions are reflected in this TODO, and Phase 2+ implementation items do not contradict the PRD.

### Phase 2 - Route And App-Shell Functional Expansion

- [x] TODO-DESIGN-2.1 Update route types and helper functions in `src/services/appShell/prdNavigationPolicy.ts`; no route helper may live only inside a presentational component.
- [x] TODO-DESIGN-2.2 Remove or deprecate `usage_guide` and generic `policy` routing from the production route policy unless a PRD-approved route is added; keep explicit privacy policy and operation policy routes/states only.
- [x] TODO-DESIGN-2.3 Add route/state coverage for splash/loading, login, onboarding basic, onboarding duplicate check, onboarding gender/age, onboarding interests, received worries/answer feed, write worry, write reply, received-answer detail, my-answer detail, answer/reply check visual state as applicable, my page, edit interests, my answers, my worries, privacy policy, operation policy, logout confirmation, and account deletion confirmation.
- [x] TODO-DESIGN-2.4 Implement current PRD route semantics: default authenticated route to received worries/answer feed, onboarding completion to received worries/answer feed after profile/examples are ready, worry publish success to the newly written worry detail with enough created worry id information to resolve that detail, reply publish success to the newly written my-answer detail with enough created reply id information to resolve that detail, pass success to received worries/answer feed, and no standalone write-worry/write-reply success routes.
- [x] TODO-DESIGN-2.5 Define back routes for write worry, write reply, received-answer detail, my-answer detail, edit interests, my answers, my worries, privacy policy, operation policy, logout confirmation, and account deletion confirmation.
- [x] TODO-DESIGN-2.6 Define bottom-tab ownership for nested routes: received worries/write reply under `답변하기`, my worries/write worry/received-answer detail under `나의 고민`, and my page/edit interests/my answers/my-answer detail/privacy policy/operation policy/logout/account deletion/settings subroutes under `마이페이지`.
- [x] TODO-DESIGN-2.7 Define the central bottom-navigation action contract: the center visual/action is labeled or announced as `고민 작성`, remains visually/semantically connected to the `나의 고민` area, and navigates to write worry rather than merely switching to the my-worries tab.
- [x] TODO-DESIGN-2.8 Create minimal functional screen skeletons only where needed to exercise new routes before visual reskin; skeletons must use real route state and callbacks, not static design data.
- [x] TODO-DESIGN-2.9 Add route-policy tests in `src/services/appShell/prdNavigationPolicy.test.ts` for removing/deprecating `usage_guide` and generic `policy`, default authenticated route, onboarding completion, worry publish success to written worry detail with created worry id resolution, reply publish success to my-answer detail with created reply id resolution, pass success to received worries/answer feed, every back route, my-page subroutes, logout/account deletion routes, explicit privacy/operation policy routes, bottom-tab selection, and central write-worry action routing.
- [x] TODO-DESIGN-2.V1 Verify Phase 2 with passing `src/services/appShell/prdNavigationPolicy.test.ts`, a route map diff, and evidence that route policy did not move into UI components.

### Phase 3 - App Shell Responsibility And Route Rendering Boundary

Phase 3 must constrain `src/App.tsx` before new route and screen work increases its current mix of Firebase, Firestore, route, onboarding, publication, pass, feedback, push/PWA, account, and rendering responsibility.

- [x] TODO-DESIGN-3.1 Inventory current `src/App.tsx` responsibilities and classify each as app-shell orchestration, route rendering, feature container logic, or presentational screen rendering.
- [x] TODO-DESIGN-3.2 Define the app-shell boundary: auth/profile loading, top-level route selection, global overlays, and shell-level providers may stay in app shell; feature data wiring must move to route containers.
- [x] TODO-DESIGN-3.3 Extract or identify route rendering boundaries for authenticated shell, onboarding flow, received worries, write worry, write reply, reply details, my-page/account, and policy screens.
- [x] TODO-DESIGN-3.4 Record the maximum allowed `src/App.tsx` responsibilities before Phase 5 starts; if route expansion increases responsibility beyond that boundary, split route rendering into dedicated shell/container files in this phase before continuing.
- [x] TODO-DESIGN-3.5 Verify no visual reskin work begins in this phase beyond minimal route skeletons needed to test routing.
- [x] TODO-DESIGN-3.V1 Verify Phase 3 with a file/module map, App-shell responsibility notes, and evidence that route rendering boundaries exist before screen contract work starts.

### Phase 4 - Presentational Screen Contract Definition

Presentational screen contracts must be defined before container wiring. Presentational components must receive props and emit events only; they must not import Firebase, Firestore SDK, API clients, service implementation internals, moderation, matching, read-state, push/PWA, or account deletion logic.

- [x] TODO-DESIGN-4.1 Define screen props contracts for login/loading/splash screens, including auth/loading/error/submit props and no Firebase imports.
- [x] TODO-DESIGN-4.2 Define screen props contracts for onboarding basic, duplicate check, and interests, including field values, validation messages, submit/check callbacks, processing states, and no Firestore/API imports.
- [x] TODO-DESIGN-4.3 Define screen props contracts for received-worries, including feed items, pass/open callbacks, loading/error/empty states, unread state, and no delivery API imports; do not include a completed-reply display state because replied deliveries must be excluded from the answer feed.
- [x] TODO-DESIGN-4.4 Define screen props contracts for write-worry and write-reply forms, including draft value, validation result, character count, publish callback, processing/moderation/error states, and no publication API imports.
- [x] TODO-DESIGN-4.5 Define screen props contracts for reply-check/detail screens, including original worry, reply, feedback, comment, submit callbacks, existing-feedback states, and no feedback API imports.
- [x] TODO-DESIGN-4.6 Define screen props contracts for my-page/account screens, including profile summary, helpedCount/received hearts, interests, required push notification settings access, required PWA install/share access, policy settings items, logout/delete callbacks, and no Firebase/userAccount imports.
- [x] TODO-DESIGN-4.7 Add pure props-contract tests in named targets near the screen contract modules, such as `src/screens/receivedWorries/contract.test.ts`, `src/screens/writeForm/contract.test.ts`, and `src/screens/myPage/contract.test.ts`; do not require React DOM rendering tests unless a React test harness is deliberately added.
- [x] TODO-DESIGN-4.8 If a React DOM component test harness is added deliberately, document the dependency, setup file, and first test target; otherwise rely on pure props-contract tests, import-boundary tests, service tests, and manual browser evidence.
- [x] TODO-DESIGN-4.V1 Verify Phase 4 with contract definitions and props-contract test output before container wiring begins.

### Phase 5 - Received-Worries Container Boundary

Functional screen phases must use real production data sources and production route state. Skeleton data is allowed only when explicitly marked as temporary, isolated to non-user-facing route exercise, and removed before the corresponding functional phase verification item is checked.

- [x] TODO-DESIGN-5.1 Implement received-worries container wiring to `useHomeWorryFeed`, `filterSuppressedFeedWorries`, and route helpers.
- [x] TODO-DESIGN-5.2 Keep pass behavior in the container/service path using `passDeliveryViaApi`, delivery suppression policy, loading-by-delivery-id state, and feed refresh behavior.
- [x] TODO-DESIGN-5.3 Keep open-for-reply behavior in the container/service path using selected worry state, route helpers, and read-state marking.
- [x] TODO-DESIGN-5.4 Ensure the received-worries presentational screen only receives props and emits events; it must not import delivery APIs, read-state APIs, Firebase, or service internals.
- [x] TODO-DESIGN-5.5 Verify no visual reskin work begins in this phase beyond minimal functional UI needed to exercise the container.
- [x] TODO-DESIGN-5.V1 Verify Phase 5 with container notes, props-contract tests, and manual browser-note evidence for a functional received-worries skeleton.

### Phase 6 - Write Forms Container Boundary

- [x] TODO-DESIGN-6.1 Implement write-worry container wiring to `validateDraftContent`, `CONTENT_MAX_LENGTH`, worry draft state, `publishWorryViaApi`, moderation result display, draft clearing, and route helpers.
- [x] TODO-DESIGN-6.2 Implement write-reply container wiring to selected delivery/worry data, reply draft keyed by delivery id, `publishReplyViaApi`, moderation result display, draft clearing, feed refresh, and route helpers.
- [x] TODO-DESIGN-6.3 Ensure write form presentational components only receive props and emit events; they must not import publication APIs, Firebase, draft services, or validation service internals unless validation result is explicitly part of a shared pure UI contract.
- [x] TODO-DESIGN-6.4 Verify no visual reskin work begins in this phase beyond minimal functional UI needed to exercise publication flows.
- [x] TODO-DESIGN-6.V1 Verify Phase 6 with container notes, props-contract tests, and manual screenshot evidence for functional write-worry/write-reply skeletons.

### Phase 7 - My-Page/Account/Reply-Detail Container Boundary

- [x] TODO-DESIGN-7.1 Implement my-page/account container wiring to profile data, helpedCount/received hearts, interests, settings items, real push permission/FCM registration/status hooks, PWA install/share hooks, sign-out cleanup, and `deleteMyAccountViaApi`.
- [x] TODO-DESIGN-7.2 Implement my-answers/my-worries container wiring to `useMyGivenReplies`, `useMyWorries`, `useRepliesForWorry`, selected item state, route helpers, and read-state behavior where applicable.
- [x] TODO-DESIGN-7.3 Implement reply-detail container wiring to original worry data, reply data, feedback submit, publisher comment submit, moderation rejection display, draft clearing, and route helpers.
- [x] TODO-DESIGN-7.4 Ensure my-page/account/reply-detail presentational screens only receive props and emit events; they must not import Firebase, userAccount APIs, push internals, feedback APIs, read-state APIs, or Firestore SDK.
- [x] TODO-DESIGN-7.5 Verify no visual reskin work begins in this phase beyond minimal functional UI needed to exercise account/detail flows.
- [x] TODO-DESIGN-7.V1 Verify Phase 7 with container notes, props-contract tests, and manual browser-note evidence for functional my-page/account/reply-detail skeletons.

### Phase 8 - Import-Boundary And Deep Module Guardrail Verification

- [x] TODO-DESIGN-8.1 Add import-boundary tests in a named target such as `src/ui/importBoundaries.test.ts` or `src/screens/importBoundaries.test.ts`.
- [x] TODO-DESIGN-8.2 Import-boundary tests must fail if presentational screen files import any pattern forbidden by `Presentational Import Boundary Contract`, including `src/firebase`, `firebase/*`, `firebase-admin/*`, service API clients, production adapters, server modules, Firestore SDK, Firebase auth/messaging SDK, account deletion clients, push internals, read-state API clients, publication API clients, feedback production adapters, or delivery pass API clients.
- [x] TODO-DESIGN-8.3 Verify route policy remains in `src/services/appShell/prdNavigationPolicy.ts` and route-policy tests remain in `src/services/appShell/prdNavigationPolicy.test.ts`.
- [x] TODO-DESIGN-8.4 Verify domain/service logic remains in `src/services/**` and `packages/domain/**`, not presentational components.
- [x] TODO-DESIGN-8.5 Verify `src/App.tsx` did not grow into a larger monolith after Phases 3-7.
- [x] TODO-DESIGN-8.V1 Verify Phase 8 with import-boundary test output, route-policy test output, and a module-boundary review note; this is a hard gate before Phase 9 functional product implementation and before any visual reskin.

### Phase 9 - Onboarding Functional Implementation

- [x] TODO-DESIGN-9.1 Implement the finalized PRD onboarding flow using minimal functional skeletons first if the final visual reskin is not ready: nickname input, nickname duplicate check, gender/age input, interests selection, example worry creation, then answer feed.
- [x] TODO-DESIGN-9.2 Implement nickname validation in the service location chosen in Phase 1 and add tests for trimming, normalization, min/max length, allowed characters, blocked characters, and error copy.
- [x] TODO-DESIGN-9.3 Implement duplicate-check behavior with idle/checking/available/duplicate/invalid/network-failed/retry states and disabled continue until availability is proven.
- [x] TODO-DESIGN-9.4 Implement server/API transaction or reservation logic and tests for duplicate reservation, normalized-name conflict, and concurrent/race conflict behavior.
- [x] TODO-DESIGN-9.5 Add Firestore rules coverage in `src/firestore.rules.test.ts` proving unsafe client writes to nickname reservation docs or server-owned nickname fields are denied.
- [x] TODO-DESIGN-9.6 Implement required age validation, persistence to `users/{uid}.age`, rules behavior, and tests for valid, invalid, empty, and boundary ages.
- [x] TODO-DESIGN-9.7 Verify age is not used in MVP matching sort/filter logic and no age-removal onboarding adaptation is implemented under the current PRD.
- [x] TODO-DESIGN-9.8 Preserve gender persistence and rules behavior already covered by `src/firestore.rules.test.ts`.
- [x] TODO-DESIGN-9.9 Preserve interests persistence using domain category values, including `워라밸`; update onboarding tests and fixtures so `워라밸` remains the target domain/display value and any truly legacy misspelling is handled only as explicit compatibility input.
- [x] TODO-DESIGN-9.10 Preserve server-owned example worry creation before entering the authenticated feed, and verify example worries are not labeled, badged, or otherwise distinguished from real worries in production UI.
- [x] TODO-DESIGN-9.11 Preserve onboarding completion route transition from Phase 2.
- [x] TODO-DESIGN-9.12 Add or update onboarding service/container tests in the relevant new or existing service test files for valid onboarding, invalid required fields, duplicate nickname, required age, profile persistence, example worry creation, and route transition.
- [x] TODO-DESIGN-9.13 Add manual browser-note evidence for first-time sign-in through onboarding at 393px before final reskin, proving the functional skeleton works end to end.
- [x] TODO-DESIGN-9.V1 Verify Phase 9 with onboarding tests, nickname/rules tests if applicable, and the manual browser-note evidence.

### Phase 10 - My-Page/Account Functional Expansion

- [x] TODO-DESIGN-10.1 Implement profile summary using dynamic nickname, interests, PRD-approved self-profile fields only, and helpedCount/received hearts; keep avatar motif as visual detail and do not expose nickname outside my-page summary.
- [x] TODO-DESIGN-10.2 Implement edit-interests route/state backed by existing profile update behavior for interests only; gender is not editable in MVP and no gender edit UI should be added.
- [x] TODO-DESIGN-10.3 Implement my-answers route/state backed by `useMyGivenReplies`, with dynamic list items and detail navigation; include replies to example worries exactly like real replies and hide any content suppressed by moderation/admin policy.
- [x] TODO-DESIGN-10.4 Implement my-worries route/state backed by `useMyWorries` and `useRepliesForWorry`, with dynamic list items and received replies navigation; hide worries and replies suppressed by moderation/admin policy from both publisher and answerer views.
- [x] TODO-DESIGN-10.5 Implement privacy policy and operation policy route/state using `docs/privacy_policy.md` and `docs/operation_policy.md` as body sources; if a source file is empty, show a production-safe empty state such as policy body preparation; do not add fake policy copy and do not implement terms or a dedicated usage-guide route for MVP.
- [x] TODO-DESIGN-10.6 Implement logout confirmation route/state before calling existing sign-out behavior.
- [x] TODO-DESIGN-10.7 Implement account deletion confirmation route/state before calling `deleteMyAccountViaApi`.
- [x] TODO-DESIGN-10.8 Preserve logout cleanup: local push registration state is cleared and Firebase auth signs out.
- [x] TODO-DESIGN-10.9 Preserve account deletion cleanup: server deletion path runs, local push state is cleaned, and user is signed out.
- [x] TODO-DESIGN-10.10 Preserve required push notification settings access in my-page/more with real Web Push permission request, FCM registration, and granted/denied/default status display; do not reduce this to static guidance.
- [x] TODO-DESIGN-10.11 Preserve required PWA install/share access in my-page/more as an "앱처럼 사용하기" flow covering Android install, iOS share-to-home-screen guidance, and service URL/QR sharing as applicable.
- [x] TODO-DESIGN-10.12 Add route-policy tests for my-page subroutes in `src/services/appShell/prdNavigationPolicy.test.ts`.
- [x] TODO-DESIGN-10.13 Add account behavior tests in existing account/push locations, including `src/services/userAccount/deleteMyAccount.test.ts` and `src/services/pushRegistration/internalLifecycle.test.ts` when cleanup behavior changes; push tests must cover permission request, FCM registration, and status mapping when touched.
- [x] TODO-DESIGN-10.14 Add pure props-contract tests for helpedCount fallback, destructive-action confirmation props, and settings item routing in the my-page contract test target from Phase 4.
- [x] TODO-DESIGN-10.15 Add manual screenshot evidence for my page, logout confirmation, and account deletion confirmation using dynamic data, proving hardcoded design values such as `라미` and `314` are gone.
- [x] TODO-DESIGN-10.V1 Verify Phase 10 with route tests, account/push tests, props-contract tests, and manual screenshot evidence.

### Phase 11 - Received Worries And Pass/Reply Functional Alignment

- [x] TODO-DESIGN-11.1 Wire received-worries data to `useHomeWorryFeed` and `filterSuppressedFeedWorries`.
- [x] TODO-DESIGN-11.2 Render dynamic category, received-time/fallback copy, unread state, worry content, loading, error, and empty states; exclude deliveries/replies that have already been answered from the received-worries feed instead of rendering a completed-reply state.
- [x] TODO-DESIGN-11.3 Ensure card body opens write reply through route helpers and marks delivery read where applicable.
- [x] TODO-DESIGN-11.4 Ensure `건너뛰기` maps to existing `passDeliveryViaApi` behavior, not UI-only removal.
- [x] TODO-DESIGN-11.5 Ensure pass click does not trigger card body open.
- [x] TODO-DESIGN-11.6 Ensure pass loading/disabled state is keyed by delivery id and prevents duplicate mutation.
- [x] TODO-DESIGN-11.7 Ensure pass success suppresses/hides the delivery and refreshes feed behavior correctly.
- [x] TODO-DESIGN-11.8 Ensure pass failure preserves the card, clears loading, and displays the existing error path.
- [x] TODO-DESIGN-11.9 Preserve unread/read-state behavior through existing read-state service/API modules.
- [x] TODO-DESIGN-11.10 Add or update tests in existing delivery/feed/read-state locations: `src/services/deliveries/uiPolicy.test.ts`, `src/services/deliveries/passDelivery.test.ts`, `src/services/homeWorryFeed/prdPolicy.test.ts`, `src/services/homeWorryFeed/apiClient.test.ts`, and read-state tests as behavior changes require; include coverage that answered deliveries/replies and hidden worries/replies are excluded from the answer feed/read model.
- [x] TODO-DESIGN-11.11 Add pure props-contract tests for card open, pass click isolation, pass loading, answered-item exclusion from props, empty state, and error state.
- [x] TODO-DESIGN-11.12 Add manual browser-note evidence for one card open, one pass success, one pass failure or simulated failure, reply success removing the submitted item from the answer feed, and empty feed.
- [x] TODO-DESIGN-11.V1 Verify Phase 11 with service tests, props-contract tests, and manual browser-note evidence.

### Phase 12 - Worry Writing And Reply Writing Functional Alignment

- [x] TODO-DESIGN-12.1 Preserve `CONTENT_MAX_LENGTH` and `validateDraftContent` from `src/services/validation/content.ts` as the validation source for worry and reply.
- [x] TODO-DESIGN-12.2 Preserve worry draft persistence and clearing through `src/services/drafts/contentDrafts.ts`.
- [x] TODO-DESIGN-12.3 Preserve reply draft persistence and clearing keyed by delivery id.
- [x] TODO-DESIGN-12.4 Preserve moderation rejected/failed/published handling for both worry and reply publication.
- [x] TODO-DESIGN-12.5 Preserve publish success routing from Phase 2: worry publish success opens the written worry detail, reply publish success opens the written my-answer detail, any transient success toast/modal/copy does not block detail navigation, and no standalone terminal success screen is introduced.
- [x] TODO-DESIGN-12.6 Implement design-compatible input states: placeholder, live character count, disabled submit, processing submit, validation help/error text, moderation rejection display, and retry path where applicable.
- [x] TODO-DESIGN-12.7 Add validation tests in `src/services/validation/content.test.ts` only if validation rules change.
- [x] TODO-DESIGN-12.8 Add draft tests in `src/services/drafts/contentDrafts.test.ts` if draft keys or clearing behavior changes.
- [x] TODO-DESIGN-12.9 Add or update publication/API tests in `src/services/worryPublication/apiClient.test.ts`, `src/services/replyPublication/apiClient.test.ts`, and server publication tests if behavior changes.
- [x] TODO-DESIGN-12.10 Add pure props-contract tests for empty input, too-long input, valid input, rejected moderation display, failed publish display, successful publish callback, draft clearing callback, processing state, and route transition request.
- [x] TODO-DESIGN-12.11 Add manual screenshot evidence for write worry and write reply at 393px before final visual polishing if using functional skeletons.
- [x] TODO-DESIGN-12.V1 Verify Phase 12 with validation/draft/publication tests, props-contract tests, and manual screenshot evidence.

### Phase 13 - Reply Check, Feedback, Comment Functional Alignment

- [x] TODO-DESIGN-13.1 Map answer-check to received-answer detail for replies to the user's worries.
- [x] TODO-DESIGN-13.2 Map my-answer detail to replies written by the user, even if it shares the answer-check visual pattern; include replies written to example worries without distinguishing them from real-worry replies.
- [x] TODO-DESIGN-13.3 Preserve dynamic original worry content and dynamic reply content in both detail flows.
- [x] TODO-DESIGN-13.4 Preserve helpful and not-helpful feedback submission through `submitReplyFeedbackWithProductionAdapters`.
- [x] TODO-DESIGN-13.5 Preserve publisher comment submission where allowed after helpful feedback.
- [x] TODO-DESIGN-13.6 Preserve feedback/comment moderation rejection handling and user/help copy.
- [x] TODO-DESIGN-13.7 Preserve helpedCount behavior and do not mutate helpedCount from browser UI code.
- [x] TODO-DESIGN-13.8 Preserve read-model assumptions for existing feedback and comments, and ensure hidden worries/replies disappear from publisher and answerer read models.
- [x] TODO-DESIGN-13.9 Preserve feedback comment draft persistence and clearing.
- [x] TODO-DESIGN-13.10 Add or update feedback tests in `src/services/replyFeedback/submitReplyFeedback.test.ts`, `src/services/replyFeedback/serverFeedback.test.ts`, and `src/services/replyFeedback/serverFirestore.test.ts` if behavior changes.
- [x] TODO-DESIGN-13.11 Add or update mailbox/read-model tests in `src/services/replyMailbox/controller.test.ts`, `src/services/myWorries/prdPolicy.test.ts`, `src/services/homeWorryFeed/prdPolicy.test.ts`, or read-state tests if detail/read behavior changes; include hidden worry/reply exclusion for home feed, my worries, received replies, my answers, and detail routes.
- [x] TODO-DESIGN-13.12 Add pure props-contract tests for helpful feedback, not-helpful feedback, comment submission, rejected comment, existing feedback display, my-answer detail display, and received-answer detail display.
- [x] TODO-DESIGN-13.13 Add manual browser-note evidence for received-answer detail, my-answer detail, feedback submission, existing feedback display, and comment submission/rejection state.
- [x] TODO-DESIGN-13.V1 Verify Phase 13 with feedback/read-model tests, props-contract tests, and manual browser-note evidence.

### Phase 14 - Design Token And Global Style Foundation

- [x] TODO-DESIGN-14.1 Add production design tokens in `src/index.css` or the production global CSS entry for SUIT font, primary/secondary orange, cream backgrounds, white surfaces, dark text, muted text, border gray, danger red, and success/positive accents.
- [x] TODO-DESIGN-14.2 Add radius, shadow, and spacing tokens/conventions for cards, modals, input areas, small buttons, pill chips, app shell, content sheets, CTAs, and bottom safe-area padding.
- [x] TODO-DESIGN-14.3 Import SUIT in production global CSS or document an approved local/font-loading alternative.
- [x] TODO-DESIGN-14.4 Do not copy `design/package.json` dependencies blindly; document every new dependency and why existing production dependencies cannot cover it.
- [x] TODO-DESIGN-14.5 Implement or adapt every primitive owned by `Shared UI Primitive Ownership`: app shell/mobile frame, bottom navigation, central write-worry action, content sheet, orange header band, primary CTA, secondary/destructive CTA, card, category chip, text area, modal/dialog, empty/loading/error state, profile eye/avatar motif, policy text container, and settings row.
- [x] TODO-DESIGN-14.6 Implement the bottom navigation primitive contract from Phase 2: left `답변하기`, central `고민 작성` action that routes to write worry, right `마이페이지`, default authenticated screen on `답변하기`, active-tab mapping through route policy, and `write_worry` owned visually/semantically by the `나의 고민` area while still navigating directly to write worry.
- [x] TODO-DESIGN-14.7 Implement shell spacing primitives for bottom-navigation height, scroll-container bottom padding, `env(safe-area-inset-bottom)`, and CTA/form/list overlap prevention so Phases 17-20 can integrate screen-specific spacing without inventing the shell.
- [x] TODO-DESIGN-14.8 Add route-policy or primitive contract tests for bottom-tab mapping and central write-worry action if not already fully covered by Phase 2 tests.
- [x] TODO-DESIGN-14.9 Acceptance criteria: 393px width preserves the design hierarchy and main layout; 360px, 430px, and desktop widths remain usable and not clipped.
- [x] TODO-DESIGN-14.10 Acceptance criteria: fake status bars and fake home indicators from `design/` are replaced by safe-area-aware production layout using viewport/safe-area handling.
- [x] TODO-DESIGN-14.11 Acceptance criteria: dynamic content may expand layout; pixel-perfect copying is not required when it harms accessibility, readability, or production data.
- [x] TODO-DESIGN-14.12 Acceptance criteria: color, font, CTA, card, chip, bottom-nav, modal, text-area, and profile motif alignment are visually recognizable against `design/`.
- [x] TODO-DESIGN-14.13 Add pure props-contract tests for primitive state mappings where useful; do not require React DOM rendering tests unless a harness was deliberately added in Phase 4.
- [x] TODO-DESIGN-14.14 Add manual screenshot evidence for primitives or first integrated screens at 393px, 360px, 430px, and desktop preview, including bottom navigation and central write-worry action.
- [x] TODO-DESIGN-14.V1 Verify Phase 14 with token inventory, dependency diff, shared primitive inventory, duplication review against `Shared UI Primitive Ownership`, props-contract test output if added, and manual screenshot evidence.

### Phase 15 - Loading/Login Visual Reskin

Every visual reskin phase must use real production data and route state. Hardcoded sample names, dates, counts, worry text, reply text, lorem ipsum, and example/tutorial labels are forbidden unless the route is an explicit loading, error, or empty mock state.

- [x] TODO-DESIGN-15.1 Confirm Phase 2 route wiring, Phase 3 shell boundaries, Phase 4 screen contracts, and Phase 14 shared primitives are complete before visual work starts; do not duplicate app shell, CTA, loading/error, or policy-link primitives inside this phase.
- [x] TODO-DESIGN-15.2 Reskin loading/splash using production loading/error state, safe-area-aware layout, accessible loading text, and no fake status/home indicators.
- [x] TODO-DESIGN-15.3 Reskin login using production Google login wiring, processing/disabled/auth-error states, no policy or terms links under the current PRD, and keyboard/focus behavior.
- [x] TODO-DESIGN-15.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [x] TODO-DESIGN-15.5 Add manual browser-note evidence and user visual verification handoff for loading/splash and login at 393px and at least one non-393px width, including evidence that policy links are absent from login; do not create, store, or output screenshot evidence files for Phase 15.
- [x] TODO-DESIGN-15.V1 Verify Phase 15 with browser notes, user visual verification handoff checklist, and any touched functional test output.

### Phase 16 - Onboarding Visual Reskin

- [x] TODO-DESIGN-16.1 Confirm Phase 1 product decisions, Phase 9 onboarding functional implementation, and Phase 14 shared primitives are complete before onboarding visual work starts; do not duplicate content sheet, CTA, category chip, or loading/error primitives inside this phase.
- [x] TODO-DESIGN-16.2 Reskin onboarding basic with dynamic required nickname, gender, and age fields from Phase 1, validation errors, disabled/processing states, and keyboard/focus behavior.
- [x] TODO-DESIGN-16.3 Reskin onboarding duplicate-check screen/state for required nickname duplicate checking.
- [x] TODO-DESIGN-16.4 Reskin onboarding interests with dynamic category data including `워라밸`, selected/unselected states, invalid/no-selection state, disabled/processing state, and accessible selection controls.
- [ ] TODO-DESIGN-16.5 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [x] TODO-DESIGN-16.6 Add Phase 16 browser-note evidence where production state is reachable, a static HTML visual preview under `tmp/phase-16/`, and a text-only user visual verification handoff checklist for onboarding basic, duplicate/adapted step, and interests at 393px and non-393px widths; do not create, store, or output screenshot evidence files for Phase 16.
- [ ] TODO-DESIGN-16.V1 Verify Phase 16 with browser notes where reachable, static HTML preview evidence, text-only user visual verification handoff, and onboarding test output.

### Phase 17 - Received Worries/Write Reply Visual Reskin

- [ ] TODO-DESIGN-17.1 Confirm Phase 5 received-worries container, Phase 11 pass/reply functional alignment, Phase 12 write-reply behavior, and Phase 14 shared primitives are complete before visual work starts; do not duplicate bottom navigation, central action, card, text area, CTA, modal, or loading/error primitives inside this phase.
- [ ] TODO-DESIGN-17.2 Reskin received worries with dynamic feed data, loading/error/empty states, pass disabled/processing state, answered-item exclusion from the feed, bottom-nav overlap prevention, and card accessibility labels.
- [ ] TODO-DESIGN-17.3 Reskin write reply with selected worry data, empty input, processing, validation error, moderation error, safe-area/bottom-nav overlap prevention, keyboard behavior, and transient success styling only if it does not block navigation to my-answer detail or feed-item removal.
- [ ] TODO-DESIGN-17.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-17.5 Add manual screenshot/browser-note evidence for received worries, empty/error/loading states where practical, pass state, reply success removing the item from the answer feed, publish-to-my-answer-detail transition, and write reply.
- [ ] TODO-DESIGN-17.V1 Verify Phase 17 with screenshots/browser notes and affected pass/feed/write-reply test output.

### Phase 18 - Write Worry/My Worries Visual Reskin

- [ ] TODO-DESIGN-18.1 Confirm Phase 6 write forms container, Phase 10 my-worries functional expansion, Phase 12 write-worry behavior, and Phase 14 shared primitives are complete before visual work starts; do not duplicate bottom navigation, central action, card, text area, CTA, modal, or loading/error primitives inside this phase.
- [ ] TODO-DESIGN-18.2 Reskin write worry with draft data, empty input, processing, validation error, moderation error, safe-area/bottom-nav overlap prevention, keyboard behavior, and transient success styling only if it does not block navigation to the written worry detail.
- [ ] TODO-DESIGN-18.3 Reskin my worries with dynamic list, empty/loading/error states, received-replies navigation, bottom-nav overlap prevention, and card accessibility labels.
- [ ] TODO-DESIGN-18.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-18.5 Add manual screenshot/browser-note evidence for write worry, publish-to-written-worry-detail transition, and my worries list/detail states.
- [ ] TODO-DESIGN-18.V1 Verify Phase 18 with screenshots/browser notes and affected write-worry/my-worries test output.

### Phase 19 - Reply Check/Feedback/My Answers Visual Reskin

- [ ] TODO-DESIGN-19.1 Confirm Phase 7 reply-detail container, Phase 10 my-answers functional expansion, Phase 13 feedback/comment functional alignment, and Phase 14 shared primitives are complete before visual work starts; do not duplicate bottom navigation, card, CTA, modal, or loading/error primitives inside this phase.
- [ ] TODO-DESIGN-19.2 Reskin answer/reply check with original worry data, reply data, feedback states, comment states, loading/error fallbacks, bottom-nav overlap prevention, and accessible feedback buttons.
- [ ] TODO-DESIGN-19.3 Reskin my answers with dynamic list, empty/loading/error states, detail navigation, bottom-nav overlap prevention, and card accessibility labels.
- [ ] TODO-DESIGN-19.4 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-19.5 Add manual screenshot/browser-note evidence for received-answer detail, my-answer detail, feedback states, comment states, and my answers.
- [ ] TODO-DESIGN-19.V1 Verify Phase 19 with screenshots/browser notes and feedback/read-model test output.

### Phase 20 - My Page/Account/Policy Visual Reskin

- [ ] TODO-DESIGN-20.1 Confirm Phase 7 my-page/account container, Phase 10 my-page/account functional expansion, and Phase 14 shared primitives are complete before visual work starts; do not duplicate bottom navigation, settings row, policy text container, profile motif, modal, CTA, or loading/error primitives inside this phase.
- [ ] TODO-DESIGN-20.2 Reskin my page with dynamic profile summary, helpedCount/received hearts, required push notification settings access, required "앱처럼 사용하기" PWA install/share access, policy settings routes, loading/error state, bottom-nav overlap prevention, and accessible navigation buttons.
- [ ] TODO-DESIGN-20.3 Reskin edit interests with selected interests, save disabled/processing/error states, bottom-nav overlap prevention, and accessible selection controls.
- [ ] TODO-DESIGN-20.4 Reskin privacy policy and operation policy access with policy body content from the dedicated policy files, loading/error state if applicable, readable long text, production-safe empty state for empty policy files, and no fake policy copy.
- [ ] TODO-DESIGN-20.5 Reskin logout confirmation with cancel/confirm wiring, processing disabled state, error state, focus trap/escape behavior if modal, and destructive-action copy.
- [ ] TODO-DESIGN-20.6 Reskin account deletion confirmation with cancel/confirm wiring, processing disabled state, error state, focus trap/escape behavior if modal, and destructive-action copy.
- [ ] TODO-DESIGN-20.7 Verify 393px hierarchy matches the design intent and 360px/430px/desktop remain usable and not clipped.
- [ ] TODO-DESIGN-20.8 Add manual screenshot/browser-note evidence for my page, edit interests, privacy policy, operation policy, empty policy state if applicable, logout confirmation, and account deletion confirmation.
- [ ] TODO-DESIGN-20.V1 Verify Phase 20 with screenshots/browser notes and account/push/route test output.

### Phase 21 - Static Hardcoded Data Audit And Visual Acceptance Pass

- [ ] TODO-DESIGN-21.1 Audit that earlier phases did not introduce static hardcoded design data where dynamic data is required, including sample names, dates, counts, worry text, reply text, lorem ipsum, and any production UI marker that labels an example worry as example/sample/tutorial content; fix only defects found by this audit, not deferred cleanup from earlier phases.
- [ ] TODO-DESIGN-21.2 Verify no production screen uses fake status bars or fake home indicators from `design/`; all mobile chrome spacing must be safe-area-aware production layout.
- [ ] TODO-DESIGN-21.3 Verify no production screen depends on fixed 393px-only absolute positioning for dynamic content.
- [ ] TODO-DESIGN-21.4 Verify color, font, CTA, card, chip, bottom-nav, modal, text-area, and profile motif alignment across reskinned screens.
- [ ] TODO-DESIGN-21.5 Verify 393px width preserves design hierarchy and main layout across all reskinned screens.
- [ ] TODO-DESIGN-21.6 Verify 360px, 430px, and desktop preview widths remain usable and not clipped across representative screens.
- [ ] TODO-DESIGN-21.7 Add final manual screenshot/browser-note evidence for the full visual acceptance pass.
- [ ] TODO-DESIGN-21.V1 Verify Phase 21 with the hardcoded-data audit, visual acceptance notes, and final screenshot set; this phase is an audit/fix pass, not the first point where hardcoded design data is removed.

### Phase 22 - Bottom Navigation And Mobile Shell Final Polish

- [ ] TODO-DESIGN-22.1 Confirm Phase 14 already introduced the bottom navigation primitive and route/action contract before final shell polish starts, and confirm no visual phase duplicated that primitive independently.
- [ ] TODO-DESIGN-22.2 Audit active tab highlighting for top-level received worries/answer feed, my worries, and my page.
- [ ] TODO-DESIGN-22.3 Audit active tab highlighting for nested write reply, write worry, received-answer detail, my-answer detail, edit interests, my answers, privacy policy, operation policy, logout confirmation, and account deletion confirmation; `write_worry` remains owned by the `나의 고민` tab.
- [ ] TODO-DESIGN-22.4 Audit the central orange action as a `고민 작성` shortcut that calls `routeToWriteWorry()` or the equivalent route helper and navigates to `write_worry`; it must not behave as a simple `나의 고민` tab switch.
- [ ] TODO-DESIGN-22.5 Polish any remaining bottom-navigation overlap defects so the shell does not cover form CTAs, card lists, modals, or final scroll content.
- [ ] TODO-DESIGN-22.6 Polish any remaining scroll-container bottom padding defects based on nav height and `env(safe-area-inset-bottom)`.
- [ ] TODO-DESIGN-22.7 Add or update route-policy tests in `src/services/appShell/prdNavigationPolicy.test.ts` only for bottom-tab mappings changed during this polish phase; Phase 2/14 should already cover default route to `답변하기`, `write_worry` ownership by `나의 고민`, and central action navigation to write worry.
- [ ] TODO-DESIGN-22.8 Add manual screenshot evidence for final bottom nav at 393px, 360px, 430px, and desktop preview.
- [ ] TODO-DESIGN-22.9 Add manual-only PWA/browser notes for final iOS safe-area behavior and Android Chrome/PWA bottom navigation behavior; do not treat these as automated tests.
- [ ] TODO-DESIGN-22.V1 Verify Phase 22 with changed route-policy test output if applicable, screenshots, and separate iOS/Android manual notes.

### Phase 23 - Accessibility, Responsive Behavior, And Production Hardening

- [ ] TODO-DESIGN-23.1 Replace fragile absolute positioning from design references with responsive production layouts wherever dynamic data can change size.
- [ ] TODO-DESIGN-23.2 Preserve visual similarity to `design/`, but prefer accessible responsive layout over pixel-perfect copying when they conflict.
- [ ] TODO-DESIGN-23.3 Verify long Korean worry, reply, feedback comment, required nickname in its allowed my-page summary location, `워라밸` category chip wrapping, and privacy/operation policy text remain readable without clipping.
- [ ] TODO-DESIGN-23.4 Verify all controls use semantic `button`, `a`, `input`, `textarea`, or appropriate ARIA roles.
- [ ] TODO-DESIGN-23.5 Verify destructive actions are clearly confirmed, visually differentiated, and disabled while processing.
- [ ] TODO-DESIGN-23.6 Verify color contrast for orange CTAs, cream backgrounds, muted gray text, disabled controls, danger buttons, and chip labels.
- [ ] TODO-DESIGN-23.7 Verify keyboard focus order for login, onboarding, write forms, feedback forms, settings list, logout confirmation, and account deletion confirmation.
- [ ] TODO-DESIGN-23.8 Verify screen-reader labels for icon-only or visually abstract controls, including bottom nav, back buttons, notification/settings icons, pass, feedback, close/cancel, and destructive actions.
- [ ] TODO-DESIGN-23.9 Add manual screenshot evidence for mobile widths 360px, 393px, 430px, and desktop preview across representative routes.
- [ ] TODO-DESIGN-23.10 Add manual-only PWA and push notes for iOS home-screen/safe-area/share behavior, Android PWA install/open behavior, and notification permission granted/denied/default states with FCM registration status where supported.
- [ ] TODO-DESIGN-23.11 Add browser-note evidence for loading, error, empty, disabled, and processing states on every production route.
- [ ] TODO-DESIGN-23.V1 Verify Phase 23 with accessibility notes, responsive screenshots, PWA manual-only notes, and any added hardening tests.

### Phase 24 - Regression Test And PRD/Design Release Gate

- [ ] TODO-DESIGN-24.1 Run `npm test` and save passing output.
- [ ] TODO-DESIGN-24.2 Run `npm run lint` and save passing output.
- [ ] TODO-DESIGN-24.3 Run `npm run build` and save passing output.
- [ ] TODO-DESIGN-24.4 Run `npm run test:rules` if Firestore rules or Firestore behavior changed, and save passing output.
- [ ] TODO-DESIGN-24.5 Add any missing focused tests discovered during implementation before release.
- [ ] TODO-DESIGN-24.6 Verify auth, onboarding, nickname uniqueness, required age validation/rules, `워라밸` target domain/display value, example worries with no visible example marker, example-worry replies in my answers, worry publication to written worry detail with no standalone terminal success screen, reply publication to my-answer detail with no standalone terminal success screen, reply success removal from answer feed, pass/replacement, read-state, hidden worry/reply exclusion across read models, feedback, comment moderation, push permission/FCM registration/status, account deletion, and PWA install/share still work.
- [ ] TODO-DESIGN-24.7 Verify every `design/` screen has a matching production route/screen or a documented intentional product-level exclusion in the Phase 0 table.
- [ ] TODO-DESIGN-24.8 Verify no static hardcoded design text or design-only sample values such as `라미`, `314`, fixed dates, lorem ipsum, or static worry/reply bodies remain where dynamic production data is required.
- [ ] TODO-DESIGN-24.9 Verify no unused copied design dependencies remain.
- [ ] TODO-DESIGN-24.10 Verify `src/App.tsx` did not become a larger monolith.
- [ ] TODO-DESIGN-24.11 Verify deep module boundaries remain intact using the Phase 8 import-boundary tests and the exact forbidden import patterns in `Presentational Import Boundary Contract`.
- [ ] TODO-DESIGN-24.12 Verify the `Minimum Manual Evidence Matrix` is complete before release.
- [ ] TODO-DESIGN-24.13 Verify every checkbox in `docs/TODO.md` is either checked with evidence or remains unchecked with a clear blocker.
- [ ] TODO-DESIGN-24.V1 Verify Phase 24 by attaching automated test output, completed minimum manual evidence matrix, design route map, and boundary review evidence.

## Final Release-Gate Checklist

- [ ] TODO-DESIGN-GATE.1 Confirm all Phase 0 through Phase 24 verification items are checked with evidence.
- [ ] TODO-DESIGN-GATE.2 Confirm Phase 1 PRD reflection gate was completed before Phase 2 work began.
- [ ] TODO-DESIGN-GATE.3 Confirm no current PRD decision was bypassed or reopened as an implementation assumption.
- [ ] TODO-DESIGN-GATE.4 Confirm no box was checked based only on visual similarity without functional wiring.
- [ ] TODO-DESIGN-GATE.5 Confirm no `design/` static screen was copied directly into production without replacing hardcoded text/data and reconnecting production behavior.
- [ ] TODO-DESIGN-GATE.6 Confirm required functional/product behavior was completed before presentational reskin work.
- [ ] TODO-DESIGN-GATE.7 Confirm tests cover schema, validation, route, publication, pass, feedback, account, push/PWA, and read-model changes introduced by the integration.
- [ ] TODO-DESIGN-GATE.8 Confirm manual/browser verification covers the full `Minimum Manual Evidence Matrix`, including 393px design hierarchy, 360px/430px/desktop usability, iOS PWA, Android PWA, long Korean content, safe-area behavior, and bottom navigation overlap.
- [ ] TODO-DESIGN-GATE.9 Confirm `docs/PRD.md` remains the source of truth and any product decision that differs from design is documented as an intentional product-level exclusion.
- [ ] TODO-DESIGN-GATE.10 Confirm the deep module architecture remains preserved and presentational components do not own domain, Firebase, Firestore/API, moderation, matching, read-model, push/PWA, or account deletion logic, using `Presentational Import Boundary Contract`.
- [ ] TODO-DESIGN-GATE.11 Confirm the final release gate fails if any production UI still contains design-only sample values such as `라미`, `314`, fixed dates, lorem ipsum, or static worry/reply bodies where dynamic data is required.
- [ ] TODO-DESIGN-GATE.12 Confirm no shared primitive from `Shared UI Primitive Ownership` was duplicated independently in later visual phases.
- [ ] TODO-DESIGN-GATE.13 Confirm the production app fully matches the required `design/`-aligned state and no hidden design-integration work remains.
