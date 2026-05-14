# Phase 17 Guardrail Audit

## App Policy Ownership

| Area | Finding | Evidence | Action | TODOs Supported |
|---|---|---|---|---|
| `src/App.tsx` | UI composes views and calls API/service wrappers for PRD mutations. It does not own matching, moderation decisions, transactions, delivery transitions, helpedCount, push dispatch, AI fallback, rematch, deletion blocking, or legacy migration. | `publishWorryViaApi`, `publishReplyViaApi`, `passDeliveryViaApi`, `submitReplyFeedbackWithProductionAdapters`, `deleteMyAccountViaApi`; route/service tests cover server behavior. | Removed unused legacy `Letter` interface. Profile/onboarding and presence Firestore writes remain narrow client-owned profile/presence behavior. | TODO-1.52 |

## Module Seam Verdicts

| Area | Finding | Evidence | Action | TODOs Supported |
|---|---|---|---|---|
| `adminHiding` | Deep service owns hide policy and Firestore transaction boundary. | `src/services/adminHiding/hideContent.test.ts`, `src/server/adminHidingRoutes.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `aiFallback` | Seam hides provider, repository, clock, and push dependencies; service owns 24-hour/no-human-reply policy. | `src/services/aiFallback/createAiFallbacks.test.ts`, `src/services/aiFallback/generateAiReply.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `appShell` | Policy module owns PRD navigation decisions, not server policy. | `src/services/appShell/prdNavigationPolicy.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `deliveries` | Pass and replacement modules own transaction, counter, replacement, and push-warning behavior. | `src/services/deliveries/passDelivery.test.ts`, `src/services/deliveries/recipientSelection.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `drafts` | Small persistence utility owns keyed draft behavior. | `src/services/drafts/contentDrafts.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `exampleWorries` | Service owns seed selection, deterministic IDs, once-only creation, and delayed feedback jobs. | `src/services/exampleWorries/*.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `homeWorryFeed` | Hook plus policy module owns PRD answer-feed read model and hidden/status filtering. | `src/services/homeWorryFeed/prdPolicy.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `matching/server` | Recipient policy owns ranking and deterministic random tie-break behavior. | `src/services/matching/server/recipientPolicy.ts`, delivery/worry selection tests | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `moderation` | Normalization/copy modules hide provider response variability and own canonical user copy. | `src/services/moderation/normalize.test.ts`, `src/services/moderation/rejectionCopy.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `myWorries` | Read model policy owns author/replier visibility and hidden/disliked filtering. | `src/services/myWorries/prdPolicy.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `notifications` | Service hides push/messaging dependency and owns durable push log behavior. | `src/services/notifications/notifications.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `pushRegistration` | Adapter seam hides browser/Firebase/localStorage/service-worker APIs and enables deterministic lifecycle tests. | `src/services/pushRegistration/*.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `readState` | Server service/repository owns private read-state writes and idempotency. | `src/services/readState/server/*.test.ts`, `src/server/readStateRoutes.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `rematch` | Service owns lock, linear Round 0 -> 1 -> 2 policy, caps, and no-branching behavior. | `src/services/rematch/rematchDueDeliveries.test.ts`, `src/services/rematch/policy.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `replyFeedback` | Service owns moderation, ownership, immutable feedback, helpedCount, and push behavior. | `src/services/replyFeedback/serverFeedback.test.ts`, `src/services/replyFeedback/serverFirestore.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `replyMailbox` | Adapter interface hides browser notification/subscription boundary and controller owns initial-load notification policy. | `src/services/replyMailbox/controller.test.ts`, `src/services/replyMailbox/policy.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `replyPublication` | Server module owns one-reply-per-delivery, moderation, counters, and push-after-commit. | `src/services/replyPublication/server/*.test.ts`, `src/services/replyPublication/runtimeBoundary.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `userAccount` | Service owns soft delete and token cleanup behind repository/clock seams. | `src/services/userAccount/deleteMyAccount.test.ts`, `src/server/userAccountRoutes.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `validation` | Shared validator owns observable content limits across worry/reply/feedback paths. | `src/services/validation/content.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |
| `worryPublication` | Server module owns moderation/category persistence, 5-delivery invariant, transaction, and push-after-commit. | `src/services/worryPublication/server/*.test.ts`, `src/server/worryRoutes.test.ts` | No change. | TODO-1.58, TODO-1.59, TODO-1.60 |

No unresolved shallow wrapper/interface was found that only forwards a call or only exists because a call crosses a file boundary. Barrel `index.ts` files are import surfaces, not behavior seams.

## Slice Behavior And Brittleness Verdicts

| Slice | Behavior-removal evidence | Brittleness verdict | Action | TODOs Supported |
|---|---|---|---|---|
| Publication/matching | `publishWorry.test.ts`, `recipientSelection.test.ts`: exactly 5, 4 matched + 1 random, shortfall no writes. | Random injected in service tests; strict invariant tests retained. | No change. | TODO-1.69, TODO-1.70 |
| Reply publication | `publishReplyForDelivery.test.ts`: deterministic reply ID, one reply, counter decrement, push failure no rollback. | Tests assert observable transaction results. | No change. | TODO-1.69, TODO-1.70 |
| Read state | `markDeliveryRead.test.ts`, `markRepliesForWorryRead.test.ts`: private read-state docs and idempotency. | Tests use service outputs/state, not implementation internals. | No change. | TODO-1.69, TODO-1.70 |
| Pass/replacement | `passDelivery.test.ts`, `recipientSelection.test.ts`: pass status, counter decrement, replacement, same-worry exclusion. | Random injected; tests preserve activeDeliveryCount invariants. | No change. | TODO-1.69, TODO-1.70 |
| Feedback | `serverFeedback.test.ts`, `serverFirestore.test.ts`: immutable feedback, comment moderation, helpedCount, push semantics. | Observable feedback docs/counters; provider failure tests fail closed. | No change. | TODO-1.69, TODO-1.70 |
| Rematch | `rematchDueDeliveries.test.ts`, `policy.test.ts`: linear rounds, no Round 3, no branching, max cap. | Clock/random injected; invariant tests retained. | No change. | TODO-1.69, TODO-1.70 |
| AI fallback | `createAiFallbacks.test.ts`, `firestoreRepository.test.ts`: 24-hour cap/no-human-reply/idempotency. | Clock injected or `now` supplied; provider errors observable. | No change. | TODO-1.69, TODO-1.70 |
| Example worries | `createExamplesForUser.test.ts`, `createExampleFeedbacks.test.ts`, `policy.test.ts`: once-only examples and delayed like. | Deterministic IDs/order and injected random where delay matters. | No change. | TODO-1.69, TODO-1.70 |
| User account | `deleteMyAccount.test.ts`, `userAccountRoutes.test.ts`: soft delete, idempotency, token cleanup, verified UID. | Clock injected for deletedAt. | No change. | TODO-1.69, TODO-1.70 |
| Admin hiding | `hideContent.test.ts`, `adminHidingRoutes.test.ts`: hide metadata, counter decrement only for active delivery. | Observable state and route shape tests. | No change. | TODO-1.69, TODO-1.70 |
| Legacy removal | `legacyRouteAbsence.test.ts`, static `rg` checks. | Static/runtime absence tests are appropriate for removed routes/model. | Removed unused `Letter` type from `src/App.tsx`. | TODO-1.69, TODO-1.70 |

## API Response-Shape Matrix

| Route file | Covered cases | Structurally not applicable | Action |
|---|---|---|---|
| `worryRoutes.test.ts` | 401, deleted 403, validation 400, provider 502, service 500, Firebase unavailable 500, moderation rejection 200, body UID/profile ignored. | 404/409: publish route does not address existing user-owned resource. | Added Phase 17 tests. |
| `replyRoutes.test.ts` | 401, deleted 403, validation 400, forbidden 403, not found 404, conflict 409, provider 502, service 500, Firebase unavailable 500, moderation rejection 200, body UID ignored. | None. | Added service-throw 500 test. |
| `readStateRoutes.test.ts` | 401, deleted 403, replies-read validation 400, forbidden 403, not found 404, conflict 409, service 500, Firebase unavailable 500. | Delivery-read body validation: route has no supported body contract. | Added service-throw 500 test. |
| `passRoutes.test.ts` | 401, deleted 403, body validation 400, forbidden 403, not found 404, conflict 409, service 500, Firebase unavailable 500, body ownership ignored. | Provider 502: no provider dependency. | Existing tests sufficient. |
| `feedbackRoutes.test.ts` | 401, deleted 403, validation 400, forbidden 403, not found 404, conflict 409, provider 502, service 500, Firebase unavailable 500, moderation rejection 200, body ownership ignored. | None. | Added mapping and throw tests. |
| `rematchRoutes.test.ts` | internal 401/403, missing secret 503, invalid body 400, Firebase unavailable 503, `lock_busy` 409, server 500. | Provider 502: no provider dependency. | Added lock-busy test. |
| `aiFallbackRoutes.test.ts` | internal 401/403, missing secret 503, invalid body 400, Firebase unavailable 503, `lock_busy` 409, provider 502, server 500. | None. | Existing tests sufficient. |
| `exampleWorryRoutes.test.ts` | user 401, unsupported body 400, internal 401/403, invalid job body 400, Firebase unavailable 503, server 500. | Provider 502: no provider dependency. Deleted-user block is covered by shared active-auth tests. | Added service failure tests. |
| `adminHidingRoutes.test.ts` | internal 401/403, invalid body 400, Firebase unavailable 503, server 500. | User auth/deleted/provider: internal admin route only. | Existing tests sufficient. |
| `userAccountRoutes.test.ts` | 401, confirmation validation 400, server 500, body UID ignored. | Deleted-user block: delete endpoint intentionally permits verified deletion request; provider/Firebase-unavailable route shape is not exposed separately. | Existing tests sufficient. |
| `auth.test.ts` | Shared canonical 401 shape, deleted-user 403 shape, body UID ignored. | N/A. | Existing tests sufficient. |

## Time, Random, And ID Classification

| Finding | Classification | Evidence | Action | TODOs Supported |
|---|---|---|---|---|
| `Math.random` in worry publication, pass replacement, rematch, and example feedback delay | Deterministic dependency injection already present. | `publishWorry.test.ts`, `recipientSelection.test.ts`, `passDelivery.test.ts`, `rematchDueDeliveries.test.ts`, `exampleWorries/policy.test.ts` pass `random` functions. | No change. | TODO-11.12 |
| `new Date()` in rematch, AI fallback, example jobs, and route body parsing | Deterministic clock or explicit `now` already present. | Route tests parse fixed `now`; service tests pass fixed `now` or `clock`. | No change. | TODO-11.12 |
| `serverTimestamp`/`FieldValue.serverTimestamp()` in repositories and `src/App.tsx` profile/presence | Production timestamp only, not test-brittle. | Repository tests assert state semantics, not exact server timestamp object values. App use is profile/presence only. | No change. | TODO-11.12 |
| `Date.now`, `Math.random`, `crypto.randomUUID` in push registration adapter | Browser instance/token metadata boundary; deterministic adapter methods used in lifecycle tests. | `src/services/pushRegistration/internalLifecycle.test.ts`, `adapters.test.ts` cover injected `now` and instance behavior. | No change. | TODO-11.12 |
| `createIds()` in publication/reply repositories and deterministic example IDs | Deterministic dependency injection already present. | `publishWorry.test.ts`, `publishReplyForDelivery.test.ts`, `createExamplesForUser.test.ts` use deterministic IDs. | No change. | TODO-11.12 |
| `new Date()` in tests and Firestore rules tests | Test fixture timestamp only. | Rules/service tests use fixed dates or disposable fixture timestamps. | No change. | TODO-11.12 |

No `code/test refactor required` finding remained after classification.

## Operational Self-Check

| Checklist item | Evidence |
|---|---|
| Docs entrypoints present | `README.md`, `docs/ops.md`, `docs/PRD.md`, `docs/TODO.md`, `docs/phase.md`, `docs/matching_algorithm.md` |
| Required env/config checklist present | `docs/ops.md` lists `FIREBASE_SERVICE_ACCOUNT`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `INTERNAL_JOB_SECRET`, and `firebase-applet-config.json` fields. |
| Exact setup command present | `README.md` and `docs/ops.md` include `npm install` and `npm run dev`. |
| Exact test/lint/build/rules commands present | `README.md`, `docs/ops.md`, and `src/server/opsDocs.test.ts`. |
| Scheduled-job invocation examples present | `docs/ops.md` includes examples for rematch, AI fallback, example feedback, and admin hide. |
| Docs consistency test passed | `npm test` passed with `src/server/opsDocs.test.ts`. |
| Command results recorded | Final Phase 17 report records `git rev-parse HEAD`, automated commands, and static `rg` checks. |
