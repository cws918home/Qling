# Qling PRD Alignment Phase Plan

This is the executable implementation plan for bringing the current codebase into alignment with `docs/PRD.md`.

- Product baseline: `docs/PRD.md`
- Implementation checklist: `docs/TODO.md`
- Execution order and checkbox ownership: this file

Each checkbox in `docs/TODO.md` has a stable ID. This plan assigns each TODO ID to exactly one phase. ID ranges below are inclusive. Do not check a TODO item until the owning phase's verification criteria pass.

## Phase Rules

- Complete phases in order.
- A phase may only check TODO IDs that are fully implemented and verified by the end of that phase.
- Transition rules are not final rules. Final legacy denial is completed only in Phase 16.
- Runtime behavior and Firestore security are separate verification surfaces. Phase 1 removes runtime direct Firestore worry publication; Phase 2 proves rules deny direct client writes.
- Phase 18 only closes final verification TODO IDs.

## Phase 0: Baseline Confirmation

### Goal

Confirm the starting point and planning artifacts before changing runtime behavior.

### Work

- Read `docs/PRD.md` and `docs/TODO.md`.
- Confirm the documented current architecture mismatches still describe the codebase.
- Confirm the TODO document is concrete, actionable, and does not claim implementation has already passed.

### TODO IDs Completed In This Phase

- TODO-0.1..TODO-0.9
- TODO-8.1
- TODO-12.1..TODO-12.7

### Verification Criteria

- The current codebase still has the documented legacy `letters`, client-write, rules, bot scheduling, and navigation mismatches.
- `docs/TODO.md` remains a planning document, not a claim that tests pass.
- No runtime code or Firestore rules are changed in this phase.

### Explicit Non-Goals / Deferred Work

- Do not mark target architecture, rules invariants, risk mitigations, or runtime behavior as complete in Phase 0.

## Phase 1: Server-Owned Worry Publication

### Goal

Publish worries through a server endpoint and create the canonical Round 0 PRD data model while keeping legacy read fallback isolated.

### Work

- Implement authenticated `POST /api/worries/publish`.
- Create the auth middleware needed by this endpoint.
- Move runtime worry publication out of client Firestore writes.
- Validate worry content: trim, non-empty, max 1000.
- Normalize moderation/category output and preserve raw/valid/invalid/matching categories.
- Create one worry, one Round 0 delivery batch, exactly five deliveries, one moderation log, and best-effort push logs.
- Use the strict 5-recipient policy: if fewer than 5 eligible human recipients exist, return a clear server error and write no partial worry, batch, delivery, counter, or push state.
- Treat a missing `users/{uid}.deleted` field as not deleted for Phase 1 matching eligibility; exclude only `deleted === true` or an explicit final inactive/deleted marker.
- Maintain `activeDeliveryCount` transactionally for initial recipients.
- Add answer-feed read model for active PRD deliveries with an explicitly named legacy fallback.

### TODO IDs Completed In This Phase

- TODO-1.1, TODO-1.11, TODO-1.23, TODO-1.26, TODO-1.31, TODO-1.32, TODO-1.33, TODO-1.43, TODO-1.61
- TODO-2.15, TODO-2.20..TODO-2.27, TODO-2.33..TODO-2.37, TODO-2.57, TODO-2.62..TODO-2.66, TODO-2.70..TODO-2.72, TODO-2.75
- TODO-3.1..TODO-3.10
- TODO-4.1..TODO-4.16
- TODO-5.1..TODO-5.11
- TODO-6.1, TODO-6.3, TODO-6.4, TODO-6.5, TODO-6.8, TODO-6.9, TODO-6.10, TODO-6.18, TODO-6.20
- TODO-8.2, TODO-8.3
- TODO-9.1, TODO-9.4, TODO-9.5, TODO-9.8, TODO-9.9, TODO-9.10, TODO-9.14, TODO-9.20, TODO-9.41, TODO-9.74
- TODO-11.10, TODO-11.13

### Verification Criteria

- Happy path creates one worry, one Round 0 batch, and five delivery docs with 4 matched plus 1 random recipient.
- Fewer than 5 eligible human recipients fails with a clear server error and creates no partial worry, batch, delivery, counter, or push state.
- Rejected moderation creates a moderation log and no worry, batch, or deliveries.
- Selected recipients are rechecked inside the transaction with `activeDeliveryCount < 10`, and each selected recipient is incremented exactly once.
- Runtime app code no longer publishes PRD worries by writing `letters` or PRD source-of-truth collections directly from the browser.
- Push failures create/log a warning path and do not roll back the core publish transaction.
- Recipient can see an assigned delivery without granting push permission.

### Explicit Non-Goals / Deferred Work

- Firestore rules denial for direct client writes is Phase 2.
- Replies, read state, pass, feedback, rematch, AI fallback, examples, account deletion UI, admin hiding, final tabs, and legacy removal are deferred.

## Phase 2: Transition Firestore Rules Hardening

### Goal

Make the Phase 1 PRD collections server-owned at the rules layer while preserving only the minimum legacy access needed for migration.

### Work

- Add transition Firestore rules and rules tests for users, FCM tokens, worries, deliveries, initial delivery batches, moderation logs, push logs, and legacy letters.
- Deny client create/update/delete on Phase 1 PRD source-of-truth collections.
- Narrow `users/{uid}` profile access and forbid client writes to server-owned fields such as `activeDeliveryCount`.
- Implement deleted-user rules helpers so a missing `deleted` field is allowed during transition and only explicit `deleted === true` is blocked.

### TODO IDs Completed In This Phase

- TODO-1.15, TODO-1.46, TODO-1.47
- TODO-5.12..TODO-5.18
- TODO-6.17
- TODO-7.1..TODO-7.6, TODO-7.10, TODO-7.14, TODO-7.16
- TODO-9.31, TODO-9.35..TODO-9.38
- TODO-11.1

### Verification Criteria

- App still loads and uses the Phase 1 publish path.
- Rules tests prove clients cannot directly create/update/delete `worries`, `deliveries`, initial `deliveryBatches`, `moderationLogs`, or `pushLogs`.
- Rules tests prove users can write only narrow own profile/token fields and cannot mutate server-owned fields.
- Rules tests prove missing `deleted` does not block a user during transition, while explicit `deleted === true` does.

### Explicit Non-Goals / Deferred Work

- Reply, feedback, operational job, hidden/admin, and final `letters` rules are completed when those collections or behaviors become real.

## Phase 3: Server-Owned Reply Publication

### Goal

Create exactly one moderated reply per delivery through a server endpoint.

### Work

- Implement `POST /api/deliveries/:deliveryId/replies`.
- The API path uses `deliveryId`; the stored reply document ID is deterministic from `deliveryId`, usually `replies/{deliveryId}`; the response may still return `replyId`.
- Validate and moderate replies before saving.
- In one transaction, create the moderation log and reply, set delivery status to `answered`, update worry human reply state, and decrement `activeDeliveryCount` exactly once.
- Add new-reply notification support and reply Firestore rules.

### TODO IDs Completed In This Phase

- TODO-1.2, TODO-1.16, TODO-1.24, TODO-1.27, TODO-1.34, TODO-1.36, TODO-1.44, TODO-1.48, TODO-1.62
- TODO-2.38, TODO-2.39, TODO-2.45..TODO-2.49, TODO-2.58
- TODO-3.25..TODO-3.31
- TODO-4.17..TODO-4.21
- TODO-5.19..TODO-5.28
- TODO-6.11
- TODO-7.7
- TODO-9.11, TODO-9.13, TODO-9.15, TODO-9.21, TODO-9.32, TODO-9.42

### Verification Criteria

- A recipient can reply once to an active delivery.
- Repeating the same submitted content can return the existing deterministic reply success; submitting different content for the same delivery returns `409`.
- Answered or hidden deliveries cannot receive a new reply.
- No runtime PRD reply path creates a `letters` reply.
- Rules tests prove the browser cannot create or mutate replies directly.

### Explicit Non-Goals / Deferred Work

- My-worries mailbox read model is Phase 4.
- Feedback and dislike-hidden behavior are Phase 7.

## Phase 4: My Worries and Reply Mailbox Read Models

### Goal

Replace legacy inbox/mailbox concepts with PRD read models for authored worries and replies.

### Work

- Implement `useMyWorries`, `useRepliesForWorry`, and `useMyGivenReplies`.
- Read authored worries from `worries` by `authorUid`.
- Read replies received for those worries from `replies` by `worryId`.
- Read replies written by the signed-in user from `replies` by `replierUid`.
- Keep any legacy reply fallback isolated behind an explicitly named adapter.

### TODO IDs Completed In This Phase

- TODO-1.12, TODO-1.63
- TODO-4.27..TODO-4.30, TODO-4.34
- TODO-5.29..TODO-5.37
- TODO-9.46, TODO-9.48

### Verification Criteria

- The worry author can see their authored worries and replies to those worries.
- A replier can see their own written replies.
- Removing only the legacy fallback does not hide newly-created PRD replies.

### Explicit Non-Goals / Deferred Work

- Unread emphasis is Phase 5.
- Like/comment/dislike visibility semantics are Phase 7.
- Admin hidden filtering is Phase 15.
- Bottom tab redesign is Phase 11.

## Phase 5: Private Read State

### Goal

Add private read markers and unread emphasis for deliveries and received replies.

### Work

- Implement `POST /api/deliveries/:deliveryId/read`.
- Implement `POST /api/worries/:worryId/replies/read`.
- Store equivalent actor-private read-state timestamps under `users/{recipientUid}/deliveryReadStates/{deliveryId}` and `users/{authorUid}/replyReadStates/{replyId}` only through server endpoints.
- Do not store read timestamps on shared readable source documents such as `deliveries/{deliveryId}` or `replies/{replyId}`, and do not expose read state as public read receipts.
- Update answer feed and my-worries UI/read hooks to emphasize unread items for the current user only.

### TODO IDs Completed In This Phase

- TODO-1.3
- TODO-2.28, TODO-2.40
- TODO-3.11..TODO-3.17, TODO-3.32..TODO-3.38
- TODO-4.31
- TODO-5.38..TODO-5.47
- TODO-6.15
- TODO-9.22, TODO-9.47, TODO-9.50, TODO-9.71

### Verification Criteria

- Opening a delivered worry clears only the recipient's unread emphasis.
- Opening replies clears only the worry author's unread reply emphasis.
- Read timestamps are stored only in actor-private user subcollections and are not exposed as public read receipts to the other party.
- Clients cannot set read state directly.

### Explicit Non-Goals / Deferred Work

- Read state does not affect answerability.
- Read state does not create rematch, feedback, or notification behavior.

## Phase 6: Pass Delivery and Immediate Replacement

### Goal

Allow recipients to pass active deliveries and synchronously attempt one replacement delivery for the same worry.

This is the implementation interpretation of the PRD statement that passed worries are rematched: `POST /api/deliveries/:deliveryId/pass` records pass state and immediately attempts replacement in the same API flow. Phase 8 does not own pass replacement delivery creation.

### Work

- Implement `POST /api/deliveries/:deliveryId/pass`.
- Transition active deliveries to `passed`.
- Decrement the passer's `activeDeliveryCount` exactly once.
- Remove passed deliveries from the recipient's answer feed.
- Record enough state so the same user is excluded from future deliveries for the same worry.
- Synchronously select one eligible replacement recipient when possible.
- Create one active replacement delivery with metadata that distinguishes it from Round 1/Round 2 additive rematch.
- Increment the replacement recipient's `activeDeliveryCount` exactly once when replacement succeeds.
- Attempt a new-worry push notification to the replacement recipient after core state is committed; push failure must not roll back pass or replacement creation.
- If no eligible replacement recipient exists, keep the original delivery passed, create no duplicate/self-redelivery, log the shortfall, and still return pass success.
- Do not notify the author and do not expose a pass signal to the author.

### TODO IDs Completed In This Phase

- TODO-1.4, TODO-1.39, TODO-1.65, TODO-1.71
- TODO-2.29, TODO-2.80
- TODO-3.18..TODO-3.24
- TODO-4.35, TODO-4.37, TODO-4.39, TODO-4.41, TODO-4.43
- TODO-5.48..TODO-5.57
- TODO-6.12, TODO-6.23, TODO-6.24
- TODO-7.17
- TODO-9.16, TODO-9.23, TODO-9.43, TODO-9.92, TODO-9.97..TODO-9.101
- TODO-11.3

### Verification Criteria

- Passing an active delivery removes it from the feed.
- Passing someone else's delivery fails.
- Answered or hidden deliveries return conflict.
- Repeating pass returns the recorded replacement result and does not double-decrement, double-increment, or duplicate replacement deliveries.
- Replacement delivery is created immediately when an eligible user exists.
- No replacement delivery is created when no eligible user exists; the shortfall is logged.
- Replacement excludes the passer, author, previous recipients, previous passers, repliers, deleted/inactive users, and users excluded by normal matching policy.
- Passer counter decrements exactly once; replacement recipient counter increments exactly once only when replacement succeeds.
- Replacement-recipient push failure does not roll back pass or replacement creation.
- Clients cannot read or write pass replacement attempt records directly.
- The author receives no pass signal.

### Explicit Non-Goals / Deferred Work

- Round 1/Round 2 additive rematch batches are Phase 8. Immediate pass replacement must not be encoded as those batches unless a separate replacement batch type is explicitly defined.
- Invalid token cleanup and durable push log hardening remain in Phase 13.

## Phase 7: Feedback Migration

### Goal

Implement deterministic, immutable feedback with correct helpedCount, visibility, and notification semantics.

### Work

- Implement `POST /api/replies/:replyId/feedback`.
- Store feedback in deterministic `feedbacks/{replyId}` or an equivalent deterministic document keyed by reply ID.
- Validate and moderate feedback comments before saving.
- Enforce immutable like/dislike choice.
- Apply the explicit comment policy: like choice is immutable, but a missing like comment may be added later once; dislike choice is immutable and cannot receive a later comment after the publisher view hides the reply.
- Increment helpedCount exactly once for eligible human and example likes; AI likes do not increment helpedCount.
- Hide disliked replies from the publisher view without deleting replies.
- Expose likes and like comments to repliers; do not expose dislikes or dislike comments to repliers.
- Send reply-liked push where PRD allows it; comments and dislikes do not trigger push.

### TODO IDs Completed In This Phase

- TODO-1.5, TODO-1.13, TODO-1.17, TODO-1.25, TODO-1.28, TODO-1.37, TODO-1.38, TODO-1.45, TODO-1.49, TODO-1.64
- TODO-2.41, TODO-2.50..TODO-2.56, TODO-2.59
- TODO-3.39..TODO-3.45
- TODO-4.22..TODO-4.26, TODO-4.32
- TODO-5.58..TODO-5.66
- TODO-7.8
- TODO-9.7, TODO-9.12, TODO-9.18, TODO-9.24, TODO-9.33, TODO-9.39, TODO-9.49

### Verification Criteria

- Same feedback repeat returns existing success; different type returns `409`.
- Like increments helpedCount exactly once for eligible human/example replies.
- AI reply like does not increment helpedCount.
- Dislike hides the reply from publisher views without deleting it.
- Repliers cannot read dislike feedback or comments.
- Comment pushes are not sent; like push is sent where PRD allows; push failure does not roll back feedback.

### Explicit Non-Goals / Deferred Work

- AI reply creation is Phase 9.
- Example worry creation is Phase 10.

## Phase 8: Additive Rematch Job

### Goal

Create additive human delivery batches after 8-hour timeouts without expiring existing active deliveries. This phase is the scheduled Round 0 -> Round 1 -> Round 2 rematch flow, not the immediate pass replacement flow.

### Work

- Implement `POST /api/internal/rematch-due-deliveries` with internal auth.
- Add job locks and rematch run records.
- Maintain linear batch lineage: Round 0 -> Round 1 -> Round 2.
- Use the previous round as the source batch and apply PRD 8.5 random-slot replacement.
- Do not retroactively fill pass slots as the job's primary responsibility; immediate pass replacement is handled in Phase 6.
- Exclude author, deleted/inactive users, users at active delivery limit, all previous recipients, passed users, and answered users. Missing `deleted` is not deleted until Phase 14 writes the final deletion fields.
- Never exceed 15 human deliveries.
- Increment activeDeliveryCount for newly created recipients exactly once.

### TODO IDs Completed In This Phase

- TODO-1.6, TODO-1.18, TODO-1.35, TODO-1.40
- TODO-2.16, TODO-2.30, TODO-2.73, TODO-2.74, TODO-2.76
- TODO-3.53
- TODO-4.36, TODO-4.38, TODO-4.40, TODO-4.42, TODO-4.44
- TODO-5.67..TODO-5.77
- TODO-6.2, TODO-6.6, TODO-6.7, TODO-6.13, TODO-6.16, TODO-6.19, TODO-6.22
- TODO-7.11
- TODO-9.6, TODO-9.28, TODO-9.34, TODO-9.45, TODO-9.51..TODO-9.69, TODO-9.72, TODO-9.73, TODO-9.76, TODO-9.93
- TODO-11.2, TODO-11.4, TODO-11.6

### Verification Criteria

- Round 1 is created from Round 0 after 8 hours.
- Round 2 is created from Round 1 after another 8 hours.
- No Round 3 is created.
- Historical earlier batches do not independently spawn branches.
- Existing active deliveries remain answerable after rematch.
- Total human deliveries never exceed 15.
- Running the job twice does not duplicate deliveries.
- Pass replacement behavior is already covered by Phase 6 and is not required for Phase 8 to pass.

### Explicit Non-Goals / Deferred Work

- AI fallback is Phase 9 and must not be created by the rematch job.

## Phase 9: AI Fallback

### Goal

Create one moderated AI reply only under the exact PRD no-human-reply condition.

### Work

- Implement `POST /api/internal/create-ai-fallbacks` with internal auth.
- Create at most one AI reply after 24 hours, human delivery cap exhausted, zero human replies, and no existing AI reply.
- Treat disliked human replies as human replies.
- Recheck current reply state at job execution time.
- Moderate AI reply before saving and notify the author best-effort.

### TODO IDs Completed In This Phase

- TODO-1.7, TODO-1.19, TODO-1.29, TODO-1.41, TODO-1.66
- TODO-2.17, TODO-2.42, TODO-2.60, TODO-2.77
- TODO-3.54
- TODO-4.45..TODO-4.49
- TODO-5.78..TODO-5.88
- TODO-7.12
- TODO-9.29, TODO-9.77..TODO-9.79, TODO-9.94
- TODO-11.7

### Verification Criteria

- A qualifying worry receives exactly one AI reply.
- Any human reply blocks fallback, including a reply submitted after 8 hours by an original recipient.
- AI fallback does not require existing active deliveries to expire.

### Explicit Non-Goals / Deferred Work

- Professional counseling copy is outside MVP unless the PRD changes.

## Phase 10: Example Worries

### Goal

Create onboarding example deliveries once per user and delayed example likes.

### Work

- Add example seed storage and example creation for newly onboarded users.
- Create up to five example deliveries once, selected by interests.
- Do not label examples in the UI.
- Moderate example replies.
- Add delayed example feedback jobs: auto-like after 5-15 minutes, no auto comment, helpedCount increases.

### TODO IDs Completed In This Phase

- TODO-1.8, TODO-1.20, TODO-1.30, TODO-1.42, TODO-1.67
- TODO-2.2, TODO-2.18, TODO-2.31, TODO-2.43, TODO-2.61, TODO-2.78, TODO-2.79
- TODO-3.55, TODO-3.56, TODO-3.57
- TODO-4.50..TODO-4.54
- TODO-5.89..TODO-5.96
- TODO-7.13
- TODO-9.30, TODO-9.80, TODO-9.81
- TODO-11.5

### Verification Criteria

- A new onboarded user receives at most five example deliveries once.
- Example selection uses interests and does not create later additions after interest edits.
- Example feedback creates one delayed like, no comment, and increments helpedCount.

### TODO-5.94 Manual-Equivalent Verification

Live browser/Firebase manual verification was unavailable in the executor environment. TODO-5.94 is therefore covered by automated/manual-equivalent verification only:

1. Seed fixture path exists at `src/services/exampleWorries/exampleSeedFixtures.ts`, and dev/admin seeding is script-only through `scripts/seedExampleWorrySeeds.ts`.
2. Fresh profile plus onboarding endpoint behavior is covered by `src/services/exampleWorries/createExamplesForUser.test.ts` and `src/server/exampleWorryRoutes.test.ts`.
3. Answer feed delivery visibility and no example label exposure are covered by `src/services/homeWorryFeed/prdPolicy.test.ts`.

Executor command run for this manual-equivalent check:

```bash
npm test -- src/services/exampleWorries/createExamplesForUser.test.ts src/server/exampleWorryRoutes.test.ts src/services/homeWorryFeed/prdPolicy.test.ts
```

Result: passed. The project test script expands the full `src/**/*.test.ts` suite, so this command ran the full automated suite plus the named manual-equivalent files.

Unresolved risk: a real browser/Firebase onboarding session has still not been exercised; before Phase 11 UI/navigation work, run the seed script against the target Firebase project, create a new user, complete onboarding, and visually confirm unlabeled example deliveries in the answer feed.

### Evidence Matrix

| TODO ID | Checked? | Evidence |
|---|---|---|
| TODO-1.8 | yes | `src/server/exampleWorryRoutes.test.ts`; `src/services/exampleWorries/createExamplesForUser.test.ts`; `src/services/exampleWorries/createExampleFeedbacks.test.ts` |
| TODO-1.20 | yes | `firestore.rules`; `src/firestore.rules.test.ts` example operational collection denial |
| TODO-1.30 | yes | `src/services/replyPublication/server/firestoreRepository.test.ts` example moderation target and rejected example reply tests |
| TODO-1.42 | yes | `src/services/exampleWorries/firestoreRepository.test.ts` deterministic ID and repeated job execution tests |
| TODO-1.67 | yes | `src/services/exampleWorries/index.ts`; `createExamplesForUser.ts`; `seedAdapter.ts`; `createExampleFeedbacks.ts`; module tests |
| TODO-2.2 | yes | `createExamplesForUser.ts`; `firestoreRepository.ts`; `src/firestore.rules.test.ts` user example field protection |
| TODO-2.18 | yes | `firestoreRepository.ts` example worry write model; `createExamplesForUser.test.ts` creation path |
| TODO-2.31 | yes | `firestoreRepository.ts` example delivery write model; `createExamplesForUser.test.ts` creation path |
| TODO-2.43 | yes | `replyPublication/server/firestoreRepository.test.ts` `isExampleReply: true` assertion |
| TODO-2.61 | yes | `replyPublication/server/firestoreRepository.test.ts` `targetType: 'example_reply'` assertions |
| TODO-2.78 | yes | `seedAdapter.ts`; `scripts/seedExampleWorrySeeds.ts`; `firestore.rules`; `src/firestore.rules.test.ts` |
| TODO-2.79 | yes | `createExampleFeedbacks.ts`; `firestoreRepository.ts`; `src/firestore.rules.test.ts` |
| TODO-3.55 | yes | `src/server/exampleWorryRoutes.test.ts` tests `POST /api/internal/create-example-feedbacks` |
| TODO-3.56 | yes | `scripts/seedExampleWorrySeeds.ts`; `exampleSeedFixtures.ts`; no admin UI or public seed route |
| TODO-3.57 | yes | `src/server/exampleWorryRoutes.test.ts`; `createExampleFeedbacks.test.ts`; `firestoreRepository.test.ts` |
| TODO-4.50 | yes | `src/services/exampleWorries/*`; policy and service tests |
| TODO-4.51 | yes | `src/services/exampleWorries/index.ts`; `createExamplesForUser.ts`; `createExampleFeedbacks.ts` |
| TODO-4.52 | yes | Required files exist; `src/App.tsx`; `server.ts`; `src/server/exampleWorryRoutes.ts` |
| TODO-4.53 | yes | `policy.test.ts`; `createExamplesForUser.test.ts`; `homeWorryFeed/prdPolicy.test.ts`; `createExampleFeedbacks.test.ts` |
| TODO-4.54 | yes | `homeWorryFeed/prdPolicy.test.ts`; `replyPublication/server/firestoreRepository.test.ts` normal reply/job regression |
| TODO-5.89 | yes | `createExamplesForUser.test.ts`; `src/server/exampleWorryRoutes.test.ts` |
| TODO-5.90 | yes | `src/services/exampleWorries/*`; `src/App.tsx`; `src/server/exampleWorryRoutes.ts`; feed tests |
| TODO-5.91 | yes | `firestoreRepository.ts`; `firestoreRepository.test.ts`; rules tests for seeds/jobs |
| TODO-5.92 | yes | Policy, feed, reply publication, feedback job, and helpedCount tests |
| TODO-5.93 | yes | `createExamplesForUser.test.ts`; `createExampleFeedbacks.test.ts`; `firestoreRepository.test.ts` |
| TODO-5.94 | yes | Manual path documented: run `scripts/seedExampleWorrySeeds.ts`, create a new user, complete onboarding, verify answer feed examples with no label |
| TODO-5.95 | yes | No admin seed UI or public seed endpoint added; seed is script-only |
| TODO-5.96 | yes | `homeWorryFeed/prdPolicy.test.ts`; `replyPublication/server/firestoreRepository.test.ts` normal behavior regressions |
| TODO-7.13 | yes | `firestore.rules`; `src/firestore.rules.test.ts` seed/job deny-all tests |
| TODO-9.30 | yes | `src/server/exampleWorryRoutes.test.ts` internal auth for `/api/internal/create-example-feedbacks` |
| TODO-9.80 | yes | `createExamplesForUser.test.ts` once/max five tests |
| TODO-9.81 | yes | `policy.test.ts`; `createExampleFeedbacks.test.ts`; `firestoreRepository.test.ts` delayed/no-comment/helpedCount tests |
| TODO-11.5 | yes | `firestoreRepository.test.ts` deterministic IDs and repeated job no double increment |

### Explicit Non-Goals / Deferred Work

- No admin seed UI is introduced.

## Phase 11: PRD Navigation and App Composition

### Goal

Make the user-facing app shell match the PRD navigation and remove public-board impressions.

### Work

- Make `답변하기` the first authenticated screen.
- Use bottom tabs: `답변하기`, `나의 고민`, `마이페이지`.
- Start worry writing from `나의 고민`.
- Move More actions into My Page: notification guide/settings, usage guide, policy, logout, delete account entry.
- Keep server policy out of `App.tsx`.

### TODO IDs Completed In This Phase

- TODO-1.53..TODO-1.57
- TODO-5.97..TODO-5.102
- TODO-9.82..TODO-9.84, TODO-9.86..TODO-9.88
- TODO-11.11

### Verification Criteria

- Authenticated users land on `답변하기`.
- The three PRD bottom tabs are the only bottom tabs.
- No screen looks like a public board.
- More actions live in My Page.

### Evidence

- Added `src/services/appShell/prdNavigationPolicy.ts` and tests for canonical tabs, default authenticated route, My Page More item policy, publish/reply/pass/feedback targets, and detail/write back targets.
- Refactored `src/App.tsx` to compose PRD routes around `답변하기`, `나의 고민`, and `마이페이지`; worry writing starts from `나의 고민`; reply/pass return to `답변하기`; worry publish routes to `나의 고민`; reply feedback stays in context.
- Preserved existing service-owned behavior through `publishWorryViaApi`, `useHomeWorryFeed`, `markDeliveryReadWithServer`, `publishReplyViaApi`, `useMyWorries`, `useRepliesForWorry`, `markRepliesForWorryReadWithServer`, `useMyGivenReplies`, and `submitReplyFeedbackWithProductionAdapters`.
- My Page exposes helped count, profile/interests edit, push notification settings/guide, install/usage guidance, policy entry, logout, a disabled account deletion entry, and own written replies through `useMyGivenReplies`.
- Copy audit removed public-board/radio/broadcast-style user-facing wording from the Phase 11 app shell and push/error copy; remaining searched terms are device/profile/settings wording, internal identifiers, tests, or legacy module names.
- Verification passed: `npm test`, `npm run lint`, and `npm run build`. Live Firebase/browser verification was unavailable, so the Phase 10 example-delivery guard used existing automated coverage for example creation, answer-feed example visibility, publish/reply/read/feedback service behavior, and Phase 11 UI wiring.

### Explicit Non-Goals / Deferred Work

- Visual brand overhaul is not part of this phase.
- Actual account deletion endpoint is Phase 14; this phase only places the entry point if needed.

## Phase 12: Validation Copy and Draft Preservation

### Goal

Polish content validation UX and moderation copy after server validation already exists on write endpoints.

### Work

- Centralize duplicated validation UI around the shared server policy.
- Ensure moderation failure reason messages match PRD reason codes.
- Add high-risk help message behavior.
- Preserve drafts on validation/moderation failure.

### TODO IDs Completed In This Phase

- TODO-5.103..TODO-5.109
- TODO-9.2, TODO-9.3, TODO-9.85, TODO-9.89..TODO-9.91

### Verification Criteria

- Worry, reply, and feedback comment forms all preserve draft on validation or moderation failure.
- Reason/help copy is consistent across write surfaces.
- This phase does not introduce the first server validation for any endpoint; endpoint validation was implemented in Phases 1, 3, and 7.

### Explicit Non-Goals / Deferred Work

- Rich text is not part of the MVP.

## Phase 13: Notification Hardening

### Goal

Consolidate notification behavior after all PRD notification-producing paths exist.

### Work

- Extract or harden notification service code used by new worry, new reply, and reply liked.
- Ensure durable push log status coverage.
- Clean invalid tokens.
- Remove or disable non-PRD notification paths such as comment notifications.
- Document foreground duplication policy where needed.

### TODO IDs Completed In This Phase

- TODO-2.3, TODO-2.11..TODO-2.14, TODO-2.67..TODO-2.69
- TODO-5.110..TODO-5.118
- TODO-9.95
- TODO-11.9

### Verification Criteria

- Supported notification kinds are only new worry, new reply, and reply liked.
- Invalid tokens are deleted or marked according to the TODO policy.
- Comment and dislike notifications are absent.
- Push failure never rolls back publication, reply, or feedback.

### Phase 13 Evidence

- `src/services/notifications/index.ts` exposes only `sendNewWorryNotificationAfterCommit`, `sendNewReplyNotificationAfterCommit`, `sendReplyLikedNotificationAfterCommit`, and the server-only `deleteAllPushTokensForUser` helper. It reads `users/{uid}` before token lookup, skips `deleted === true`, reads destinations only from `users/{uid}/fcmTokens/*`, writes the shared push log schema, deletes invalid token docs at runtime, and never throws into core mutation paths.
- `src/services/notifications/notifications.test.ts` covers `new_worry`, `new_reply`, `reply_liked`, missing messaging, no token docs, deleted target users, invalid-token deletion, generic failure preservation, multiple token docs, pass replacement `sourceReason: 'pass_replacement'`, impossible non-PRD public exports, and `deleteAllPushTokensForUser`.
- `src/services/worryPublication/server/publishWorry.test.ts`, `src/services/replyPublication/server/publishReplyForDelivery.test.ts`, `src/services/deliveries/passDelivery.test.ts`, and `src/services/replyFeedback/serverFeedback.test.ts` prove push failure/unavailability does not roll back worry publication, reply publication, pass replacement, or reply feedback success.
- `src/services/pushRegistration/adapters.ts` writes token docs with exactly `token`, `platform`, `userAgent`, `instanceId`, `notificationPermission`, `isInstalledPWA`, `createdAt`, `updatedAt`, and `lastSeenAt`; it also syncs `notificationPermission` and `isInstalledPWA` to `users/{uid}`. `src/services/pushRegistration/internalLifecycle.test.ts` covers createdAt preservation, updatedAt/lastSeenAt refresh, profile field sync, and granted/denied/default manual-equivalent permission behavior.
- `server.ts` no longer has a local `sendPushNotification` helper or scalar `users/{uid}.fcmToken` fallback. `src/server/legacyNotificationRoutes.ts` returns non-success for legacy notification routes, and `src/server/legacyNotificationRoutes.test.ts` proves comment/dislike notification routes cannot send.
- `src/services/replyPublication/publishPublisherComment.ts`, `src/services/replyMailbox/policy.ts`, and related tests hard-disable comment notification attempts. Reply feedback tests prove comment-only like updates, dislikes, and repeated likes do not send or log push attempts.
- `src/services/notifications/FOREGROUND_POLICY.md` documents best-effort server push, `pushLogs` audit, foreground read-model source-of-truth, duplicate-toast avoidance, and permission-denied/no-token not being delivery failure.
- `firestore.rules` and `src/firestore.rules.test.ts` prove clients cannot read/write `pushLogs`, current users can manage only own token docs, current users can write only safe notification profile fields, and clients cannot mutate server-owned `helpedCount`, `activeDeliveryCount`, `deleted`, or `deletedAt`.
- Commands passed before checking TODOs: `npm test`, `npm run lint`, `npm run build`, and `npm run test:rules`.
- Phase 13 completes token lifecycle capability and invalid-token runtime deletion. Phase 14 will call the already-tested `deleteAllPushTokensForUser` helper from the account deletion endpoint; Phase 13 does not wire it into account deletion runtime behavior or rules.

### Explicit Non-Goals / Deferred Work

- Notification settings beyond the PRD are not introduced.

## Phase 14: Account Deletion and Deleted-User Blocking

### Goal

Implement soft account deletion and complete deleted-user blocking across user endpoints.

### Work

- Implement `POST /api/users/me/delete`.
- Soft delete users and keep existing content.
- Remove push tokens.
- Exclude deleted users from matching and notifications.
- Ensure deleted users cannot publish, reply, mark read, pass, or give feedback.
- Confirm the compatibility rule used by earlier phases: before this phase, missing `deleted` means not deleted; after this phase, `deleted === true` is the explicit block for publish/reply/read/pass/feedback actions and matching.

### TODO IDs Completed In This Phase

- TODO-1.9, TODO-1.22, TODO-1.68
- TODO-2.1, TODO-2.4..TODO-2.10
- TODO-3.46..TODO-3.52
- TODO-4.55..TODO-4.59
- TODO-5.119..TODO-5.127
- TODO-9.19, TODO-9.25, TODO-9.26, TODO-9.96

### Verification Criteria

- Deletion is idempotent.
- Existing authored content and replies remain visible according to PRD read rules.
- Deleted users cannot publish, reply, mark read, pass, or give feedback.
- Deleted users are excluded from matching and notification targets.

### Explicit Non-Goals / Deferred Work

- Physical data erasure and full privacy export/delete workflows are outside MVP.

## Phase 15: Admin Hiding and Internal Audit Coverage

### Goal

Support DB-manual hiding and centralized hidden-content filtering without adding an admin UI.

### Work

- Add and honor hidden fields on worries, deliveries, and replies.
- Centralize hidden filtering in read model policies.
- Decrement `activeDeliveryCount` exactly once when an active delivery is hidden.
- Ensure major paths have operational audit coverage.
- Add hidden/admin-only rules where possible.

### TODO IDs Completed In This Phase

- TODO-1.50
- TODO-2.19, TODO-2.32, TODO-2.44
- TODO-4.33
- TODO-5.128..TODO-5.136
- TODO-6.14, TODO-6.21
- TODO-7.9
- TODO-9.17, TODO-9.44, TODO-9.70, TODO-9.75

### Verification Criteria

- Hidden worries, deliveries, and replies disappear from user-visible read models.
- Hiding an active delivery decrements `activeDeliveryCount` exactly once.
- Hidden filtering is centralized and not scattered through view markup.
- No admin UI is introduced.

### Explicit Non-Goals / Deferred Work

- Full admin dashboard is not part of the MVP.

## Phase 16: Legacy `letters` Runtime Removal

### Goal

Remove runtime dependency on the legacy `letters` data model and close final rules access.

### Work

- Remove `receiverId === 'public'`.
- Remove `deleteLetter`.
- Remove `letters` worry and reply fallbacks.
- Remove old bot schedule endpoint and old comment notification endpoint.
- Remove client Firestore adapters that create/update `letters`.
- Deny all runtime access to `letters` in final rules, or remove the match block.
- Verify runtime code no longer depends on `letters`.

### TODO IDs Completed In This Phase

- TODO-1.10, TODO-1.14, TODO-1.21, TODO-1.51
- TODO-5.137..TODO-5.143
- TODO-7.15
- TODO-8.4..TODO-8.6
- TODO-9.40
- TODO-11.8

### Verification Criteria

- Runtime `rg "letters"` shows no application dependency, allowing archival/migration documentation mentions only.
- The app works with only PRD collections.
- Final rules deny legacy `letters` runtime reads/writes/deletes.
- Old bot schedule and old comment notification endpoints are removed.

### Explicit Non-Goals / Deferred Work

- Historical data migration is not required if the reset/archive strategy is chosen.

## Phase 17: Operational Documentation and Final Guardrail Audit

### Goal

Make operational docs match the final PRD implementation and close long-running architecture guardrails.

### Work

- Update matching algorithm documentation.
- Update README or create/update `docs/ops.md`.
- Document Firebase Admin, moderation provider, internal job secret, env vars, local test commands, emulator/rules test setup, and deploy notes for scheduled jobs.
- Audit that no shallow adapter/interface was added merely because a call crossed a file boundary.
- Audit that introduced seams hide real dependencies, enable deterministic tests, or own meaningful policy boundaries.
- Audit that tests focus on observable PRD behavior and each slice has a deletion test or equivalent behavior-removal check.

### TODO IDs Completed In This Phase

- TODO-1.52, TODO-1.58..TODO-1.60, TODO-1.69, TODO-1.70
- TODO-5.144..TODO-5.148
- TODO-9.27
- TODO-11.12

### Verification Criteria

- A new developer can run, test, and deploy using `docs/PRD.md`, code, `docs/TODO.md`, `docs/phase.md`, and ops docs.
- Docs mention all internal endpoints and required environment variables.
- Architecture guardrail audit has no unresolved shallow-wrapper or implementation-detail-test issues.

### Explicit Non-Goals / Deferred Work

- Broad product documentation beyond implementation and operations is not required.

## Phase 18: Final Verification

### Goal

Run the final verification checklist after all implementation phases are complete.

### Work

- Run full automated checks.
- Run final manual happy, rejection, rematch, AI fallback, notification, deletion, security, and legacy-removal paths.

### TODO IDs Completed In This Phase

- TODO-10.1..TODO-10.9

### Verification Criteria

- `npm test` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Firestore rules tests pass.
- Manual happy, rejection, pass/rematch/AI, security, and legacy-removal checks pass.

### Explicit Non-Goals / Deferred Work

- This phase does not own implementation work. The coverage matrix below assigns every TODO ID to a concrete phase.

## TODO Coverage Matrix

| Phase | TODO IDs |
| --- | --- |
| Phase 0 | TODO-0.1..TODO-0.9; TODO-8.1; TODO-12.1..TODO-12.7 |
| Phase 1 | TODO-1.1; TODO-1.11; TODO-1.23; TODO-1.26; TODO-1.31..TODO-1.33; TODO-1.43; TODO-1.61; TODO-2.15; TODO-2.20..TODO-2.27; TODO-2.33..TODO-2.37; TODO-2.57; TODO-2.62..TODO-2.66; TODO-2.70..TODO-2.72; TODO-2.75; TODO-3.1..TODO-3.10; TODO-4.1..TODO-4.16; TODO-5.1..TODO-5.11; TODO-6.1; TODO-6.3..TODO-6.5; TODO-6.8..TODO-6.10; TODO-6.18; TODO-6.20; TODO-8.2..TODO-8.3; TODO-9.1; TODO-9.4..TODO-9.5; TODO-9.8..TODO-9.10; TODO-9.14; TODO-9.20; TODO-9.41; TODO-9.74; TODO-11.10; TODO-11.13 |
| Phase 2 | TODO-1.15; TODO-1.46..TODO-1.47; TODO-5.12..TODO-5.18; TODO-6.17; TODO-7.1..TODO-7.6; TODO-7.10; TODO-7.14; TODO-7.16; TODO-9.31; TODO-9.35..TODO-9.38; TODO-11.1 |
| Phase 3 | TODO-1.2; TODO-1.16; TODO-1.24; TODO-1.27; TODO-1.34; TODO-1.36; TODO-1.44; TODO-1.48; TODO-1.62; TODO-2.38..TODO-2.39; TODO-2.45..TODO-2.49; TODO-2.58; TODO-3.25..TODO-3.31; TODO-4.17..TODO-4.21; TODO-5.19..TODO-5.28; TODO-6.11; TODO-7.7; TODO-9.11; TODO-9.13; TODO-9.15; TODO-9.21; TODO-9.32; TODO-9.42 |
| Phase 4 | TODO-1.12; TODO-1.63; TODO-4.27..TODO-4.30; TODO-4.34; TODO-5.29..TODO-5.37; TODO-9.46; TODO-9.48 |
| Phase 5 | TODO-1.3; TODO-2.28; TODO-2.40; TODO-3.11..TODO-3.17; TODO-3.32..TODO-3.38; TODO-4.31; TODO-5.38..TODO-5.47; TODO-6.15; TODO-9.22; TODO-9.47; TODO-9.50; TODO-9.71 |
| Phase 6 | TODO-1.4; TODO-1.39; TODO-1.65; TODO-1.71; TODO-2.29; TODO-2.80; TODO-3.18..TODO-3.24; TODO-4.35; TODO-4.37; TODO-4.39; TODO-4.41; TODO-4.43; TODO-5.48..TODO-5.57; TODO-6.12; TODO-6.23..TODO-6.24; TODO-7.17; TODO-9.16; TODO-9.23; TODO-9.43; TODO-9.92; TODO-9.97..TODO-9.101; TODO-11.3 |
| Phase 7 | TODO-1.5; TODO-1.13; TODO-1.17; TODO-1.25; TODO-1.28; TODO-1.37..TODO-1.38; TODO-1.45; TODO-1.49; TODO-1.64; TODO-2.41; TODO-2.50..TODO-2.56; TODO-2.59; TODO-3.39..TODO-3.45; TODO-4.22..TODO-4.26; TODO-4.32; TODO-5.58..TODO-5.66; TODO-7.8; TODO-9.7; TODO-9.12; TODO-9.18; TODO-9.24; TODO-9.33; TODO-9.39; TODO-9.49 |
| Phase 8 | TODO-1.6; TODO-1.18; TODO-1.35; TODO-1.40; TODO-2.16; TODO-2.30; TODO-2.73..TODO-2.74; TODO-2.76; TODO-3.53; TODO-4.36; TODO-4.38; TODO-4.40; TODO-4.42; TODO-4.44; TODO-5.67..TODO-5.77; TODO-6.2; TODO-6.6..TODO-6.7; TODO-6.13; TODO-6.16; TODO-6.19; TODO-6.22; TODO-7.11; TODO-9.6; TODO-9.28; TODO-9.34; TODO-9.45; TODO-9.51..TODO-9.69; TODO-9.72..TODO-9.73; TODO-9.76; TODO-9.93; TODO-11.2; TODO-11.4; TODO-11.6 |
| Phase 9 | TODO-1.7; TODO-1.19; TODO-1.29; TODO-1.41; TODO-1.66; TODO-2.17; TODO-2.42; TODO-2.60; TODO-2.77; TODO-3.54; TODO-4.45..TODO-4.49; TODO-5.78..TODO-5.88; TODO-7.12; TODO-9.29; TODO-9.77..TODO-9.79; TODO-9.94; TODO-11.7 |
| Phase 10 | TODO-1.8; TODO-1.20; TODO-1.30; TODO-1.42; TODO-1.67; TODO-2.2; TODO-2.18; TODO-2.31; TODO-2.43; TODO-2.61; TODO-2.78..TODO-2.79; TODO-3.55..TODO-3.57; TODO-4.50..TODO-4.54; TODO-5.89..TODO-5.96; TODO-7.13; TODO-9.30; TODO-9.80..TODO-9.81; TODO-11.5 |
| Phase 11 | TODO-1.53..TODO-1.57; TODO-5.97..TODO-5.102; TODO-9.82..TODO-9.84; TODO-9.86..TODO-9.88; TODO-11.11 |
| Phase 12 | TODO-5.103..TODO-5.109; TODO-9.2..TODO-9.3; TODO-9.85; TODO-9.89..TODO-9.91 |
| Phase 13 | TODO-2.3; TODO-2.11..TODO-2.14; TODO-2.67..TODO-2.69; TODO-5.110..TODO-5.118; TODO-9.95; TODO-11.9 |
| Phase 14 | TODO-1.9; TODO-1.22; TODO-1.68; TODO-2.1; TODO-2.4..TODO-2.10; TODO-3.46..TODO-3.52; TODO-4.55..TODO-4.59; TODO-5.119..TODO-5.127; TODO-9.19; TODO-9.25..TODO-9.26; TODO-9.96 |
| Phase 15 | TODO-1.50; TODO-2.19; TODO-2.32; TODO-2.44; TODO-4.33; TODO-5.128..TODO-5.136; TODO-6.14; TODO-6.21; TODO-7.9; TODO-9.17; TODO-9.44; TODO-9.70; TODO-9.75 |
| Phase 16 | TODO-1.10; TODO-1.14; TODO-1.21; TODO-1.51; TODO-5.137..TODO-5.143; TODO-7.15; TODO-8.4..TODO-8.6; TODO-9.40; TODO-11.8 |
| Phase 17 | TODO-1.52; TODO-1.58..TODO-1.60; TODO-1.69..TODO-1.70; TODO-5.144..TODO-5.148; TODO-9.27; TODO-11.12 |
| Phase 18 | TODO-10.1..TODO-10.9 |
