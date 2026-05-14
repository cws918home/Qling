# Qling PRD Full Implementation TODO

This document expands `docs/PRD.md` into a development-ready implementation plan based on the current codebase. It intentionally does not implement code. Every slice should be testable against observable PRD behavior, and every new module should own real policy rather than moving code from `src/App.tsx` into shallow wrappers.

Recommended default where this TODO makes a choice: prefer server-owned mutations, top-level PRD collections, query-backed read models during migration, and transactionally maintained counters only where PRD invariants need race protection.

## 0. Current Architecture Summary

- [x] TODO-0.1 Current data model: `letters` is overloaded for both delivered worries (`type: 'worry'`) and replies (`type: 'reply'`). A worry publication creates multiple `letters` documents, one per receiver, instead of one canonical worry plus delivery documents.
- [x] TODO-0.2 Current client-side Firestore writes exist in `src/App.tsx`, `src/services/worryPublication/adapters/firestore.ts`, `src/services/replyPublication/adapters.ts`, `src/services/replyFeedback/firestoreAdapters.ts`, `src/services/replyMailbox/production.ts`, and push token code. The browser can create/update/delete user-visible source-of-truth data.
- [x] TODO-0.3 Current worry publication path: `src/App.tsx#publishWorry` calls `publishWorryWithProductionAdapters`, which uses `src/services/worryPublication/publishWorry.ts`. That runs client-side moderation via `/api/process-worry`, fetches active users from client Firestore, selects 3 recipients in `policy/recipientSelection.ts`, writes `letters` in `adapters/firestore.ts`, then calls notification/bot follow-ups.
- [x] TODO-0.4 Current reply publication path: `src/App.tsx#sendReply` calls `publishReplyWithProductionAdapters`, which moderates through `/api/process-reply`, creates a `letters` reply document, then calls `/api/notify-new-reply`.
- [x] TODO-0.5 Current feedback path: `src/App.tsx#giveFeedback` calls `submitReplyFeedbackWithProductionAdapters`, which updates `letters/{replyId}.feedback` and increments `users/{replierId}.helpedCount` from the client. Publisher comments are updated on the same `letters` reply through `publishPublisherComment`.
- [x] TODO-0.6 Current home/answer feed path: `useHomeWorryFeed` queries all `letters` where `type == 'worry'`, then `selectVisibleHomeWorryFeed` includes `receiverId == profile.uid` and also legacy `receiverId == 'public'`.
- [x] TODO-0.7 Current bot reply scheduling path: `server.ts` exposes `/api/schedule-bot-reply`, uses `setTimeout`, generates an AI-like reply after 4-8 minutes, writes a `letters` reply, and sends a push. This is not the PRD 24-hour AI fallback.
- [x] TODO-0.8 Current Firestore rules weakness: `firestore.rules` allows every authenticated user to read/write/delete all `users` and all `letters`. There are no rules for `worries`, `deliveries`, `replies`, `feedbacks`, `moderationLogs`, or `pushLogs`.
- [x] TODO-0.9 Current UI navigation mismatch with PRD: `App.tsx` uses views such as `home`, `write_worry`, `write_reply`, `inbox`, `my_replies`, `read_reply`, `read_my_reply`, and `settings`, with header inbox/settings affordances. PRD requires first screen `답변하기`, bottom tabs `답변하기 / 나의 고민 / 마이페이지`, worry writing from `나의 고민`, and More inside `마이페이지`.

## 1. Target PRD Architecture

- [x] TODO-1.1 Worry publication mutation boundary is server-owned: browser submits to an authenticated endpoint, never supplies trusted `uid`, and no runtime PRD worry publication path writes `letters` or PRD source-of-truth collections directly from the client.
- [x] TODO-1.2 Reply publication mutation boundary is server-owned: browser submits by delivery ID to an authenticated endpoint, stored reply ID is deterministic from delivery ID, and no runtime reply publication path creates `letters` replies.
- [x] TODO-1.3 Read-state mutation boundary is server-owned: delivery and reply read markers are set only through authenticated endpoints and are not public read receipts.
- [x] TODO-1.4 Pass mutation boundary is server-owned: pass status changes, same-worry exclusion, immediate replacement attempt, and `activeDeliveryCount` decrement/increment behavior happen only in an authenticated server transaction or transaction-plus-best-effort-push flow.
- [x] TODO-1.5 Feedback mutation boundary is server-owned: like/dislike/comment writes and helpedCount changes happen only through an authenticated server transaction.
- [x] TODO-1.6 Rematch job mutation boundary is server-owned: rematch runs are performed only by authenticated internal endpoints or server jobs.
- [x] TODO-1.7 AI fallback job mutation boundary is server-owned: AI fallback runs are performed only by authenticated internal endpoints or server jobs.
- [x] TODO-1.8 Example feedback job mutation boundary is server-owned: example creation and delayed example feedback are performed only by authenticated server endpoints or internal jobs.
- [ ] TODO-1.9 Account deletion mutation boundary is server-owned: delete requests use authenticated user identity, soft-delete the user, remove tokens, and block future user actions.
- [ ] TODO-1.10 Final source-of-truth mutation boundary is closed: after legacy removal, the browser cannot create or mutate `worries`, `deliveries`, `replies`, `feedbacks`, `moderationLogs`, `pushLogs`, operational job collections, or legacy `letters`.
- [x] TODO-1.11 Answer feed read path reads active `deliveries` for the signed-in recipient plus enough worry display data, with any legacy fallback isolated behind an explicitly named adapter.
- [x] TODO-1.12 My worries and reply mailbox read paths read `worries` authored by the signed-in user, `replies` for those worries, and replies written by the signed-in user, with legacy fallback isolated behind an explicitly named adapter.
- [x] TODO-1.13 My page read path reads own profile, own written replies, and like/comment state visible to the replier.
- [ ] TODO-1.14 Temporary legacy read fallbacks are removed from runtime code.
- [x] TODO-1.15 Firestore ownership for initial PRD collections is enforced: `worries`, `deliveries`, `moderationLogs`, `pushLogs`, and initial `deliveryBatches` are server-owned; clients keep only narrow profile/token writes and temporary legacy reads.
- [x] TODO-1.16 Firestore ownership for replies is enforced: `replies` are server-owned and legacy reply write paths are not needed for PRD replies.
- [x] TODO-1.17 Firestore ownership for feedback is enforced: `feedbacks` and helpedCount changes are server-owned.
- [x] TODO-1.18 Firestore ownership for rematch operational collections is enforced.
- [x] TODO-1.19 Firestore ownership for AI fallback operational collections is enforced.
- [x] TODO-1.20 Firestore ownership for example operational collections is enforced.
- [ ] TODO-1.21 Final Firestore ownership is enforced: legacy `letters` runtime access is removed or fully denied.
- [ ] TODO-1.22 Server invariant for auth/deleted-user blocking is enforced for all user endpoints. Compatibility rule: until Phase 14 backfills/sets deletion state, a missing `deleted` field means "not deleted"; only `deleted === true` or another final explicit inactive/deleted marker blocks activity and matching.
- [x] TODO-1.23 Server invariant for worry content validation is enforced: trim, non-empty, max 1000.
- [x] TODO-1.24 Server invariant for reply content validation is enforced: trim, non-empty, max 1000.
- [x] TODO-1.25 Server invariant for feedback comment validation is enforced: trim, non-empty when submitted, max 1000.
- [x] TODO-1.26 Server invariant for worry moderation is enforced before saving user-visible worries.
- [x] TODO-1.27 Server invariant for reply moderation is enforced before saving user-visible replies.
- [x] TODO-1.28 Server invariant for feedback comment moderation is enforced before saving user-visible feedback comments.
- [x] TODO-1.29 Server invariant for AI reply moderation is enforced before saving AI replies.
- [x] TODO-1.30 Server invariant for example reply moderation is enforced before saving example replies.
- [x] TODO-1.31 Server invariant for category preservation is enforced for worry publication: raw, valid, invalid, and matching categories are stored.
- [x] TODO-1.32 Server invariant for initial matching is enforced: exactly 5 initial human deliveries, 4 matched plus 1 random. If fewer than 5 eligible human recipients exist, publication fails without partial worry, batch, delivery, counter, or push state.
- [x] TODO-1.33 Server invariant for initial delivery active limit is enforced: selected initial recipients have `activeDeliveryCount < 10`.
- [x] TODO-1.34 Server invariant for same-worry redelivery exclusion metadata is enforced when users pass or answer.
- [x] TODO-1.35 Server invariant for rematch delivery limits is enforced: total human delivery cap `15`, active delivery limit `< 10`, and no redelivery of the same worry to the same user.
- [x] TODO-1.36 Server invariant for one reply per delivery is enforced with deterministic reply IDs and idempotency/duplicate-content behavior.
- [x] TODO-1.37 Server invariant for one immutable feedback per reply is enforced with deterministic feedback IDs and delayed like-comment rules.
- [x] TODO-1.38 Server invariant for helpedCount is enforced: increments happen exactly once only for eligible human/example likes, and AI likes are excluded.
- [x] TODO-1.39 Server invariant for pass idempotency is enforced by status preconditions.
- [x] TODO-1.40 Server invariant for rematch job idempotency is enforced by deterministic IDs, job locks, and status preconditions.
- [x] TODO-1.41 Server invariant for AI fallback idempotency is enforced by deterministic AI reply state and status preconditions.
- [x] TODO-1.42 Server invariant for example job idempotency is enforced by per-user example state, deterministic jobs, and status preconditions.
- [x] TODO-1.43 Server invariant for worry publication push failure is enforced: push failure never rolls back core worry publication.
- [x] TODO-1.44 Server invariant for reply publication push failure is enforced: push failure never rolls back core reply publication.
- [x] TODO-1.45 Server invariant for feedback push failure is enforced: push failure never rolls back core feedback mutation.
- [x] TODO-1.71 Server invariant for pass replacement push failure is enforced: push failure to the immediate replacement recipient never rolls back the pass transition or replacement delivery creation.
- [x] TODO-1.46 Firestore rules invariant for initial PRD collections is enforced: clients cannot create/update/delete `worries`, `deliveries`, `moderationLogs`, `pushLogs`, or initial `deliveryBatches`.
- [x] TODO-1.47 Firestore rules invariant for profile/token surfaces is enforced: users can read/write only narrow own profile fields and own push token docs during transition.
- [x] TODO-1.48 Firestore rules invariant for replies is enforced: users can read only permitted reply surfaces and cannot write replies directly.
- [x] TODO-1.49 Firestore rules invariant for feedback is enforced: publisher can read own feedback, replier can read only likes and like comments, and clients cannot write feedback directly.
- [ ] TODO-1.50 Firestore rules invariant for hidden/admin-only data is enforced: users cannot read moderation logs, push logs, operational logs, hidden content, or admin-only feedback comments.
- [ ] TODO-1.51 Firestore rules invariant for legacy removal is enforced: final rules deny legacy `letters` runtime reads/writes/deletes.
- [ ] TODO-1.52 `App.tsx` does not own matching, moderation interpretation, Firestore transaction rules, delivery status transitions, helpedCount changes, push dispatch, AI fallback, example scheduling, deletion blocking, or legacy migration decisions.
- [x] TODO-1.53 `App.tsx` is limited to view composition plus calls to service hooks/API wrappers for PRD behavior.

### Architecture Safeguard: UI Extraction Before the Navigation Slice

- [x] TODO-1.54 UI tab restructuring waits until Slice 11, but feature-level extraction is allowed earlier when it prevents `src/App.tsx` from growing worse.
- [x] TODO-1.55 Allowed early extractions:
  - `AnswerFeed` component/hook.
  - `MyWorries` read hook.
  - `ReplyDetail` action hook.
  - API wrappers for server-owned mutation endpoints.
- [x] TODO-1.56 Forbidden in UI code:
  - Matching policy.
  - Moderation interpretation.
  - Delivery status transition rules.
  - helpedCount or feedback invariants.
  - Thin pass-through components that add indirection without owning behavior.
- [x] TODO-1.57 Extract only when it improves locality or testability. Do not move server policy into React components while waiting for the full tab restructure.

### Architecture Safeguard: Deep Modules and Interface Guardrails

- [ ] TODO-1.58 Do not create a new adapter/interface merely because a function call crosses a file boundary.
- [ ] TODO-1.59 Introduce a seam only when it hides an external dependency, enables deterministic tests, or owns a meaningful policy boundary.
- [ ] TODO-1.60 Prefer one deep module with a small public interface over many shallow wrappers.
- [x] TODO-1.61 Apply deep-module guardrails to `worryPublication`, `moderation`, and `answerFeed`.
- [x] TODO-1.62 Apply deep-module guardrails to `replyPublication`.
- [x] TODO-1.63 Apply deep-module guardrails to `replyMailbox` / `myWorries`.
- [x] TODO-1.64 Apply deep-module guardrails to `replyFeedback`.
- [x] TODO-1.65 Apply deep-module guardrails to `pass` / `rematch`.
- [x] TODO-1.66 Apply deep-module guardrails to `aiFallback`.
- [x] TODO-1.67 Apply deep-module guardrails to `exampleWorries`.
- [ ] TODO-1.68 Apply deep-module guardrails to `userAccount`.
- [ ] TODO-1.69 Each slice includes a deletion test or equivalent observable-behavior removal check:
  - Deleting the new module removes a real PRD behavior.
  - Deleting a wrapper is not the only observable effect.
- [ ] TODO-1.70 Tests should focus on observable PRD behavior, not implementation details.

## 2. Final Firestore Data Model

Use server timestamps for all `createdAt`/`updatedAt` fields. Use `hiddenAt`/`hiddenReason` for DB-manual admin hiding; no admin UI is required.

### `users/{uid}`

- [ ] TODO-2.1 Core profile fields: `uid`, `gender: 'male' | 'female'`, `interests`, `helpedCount`, `activeDeliveryCount`, `createdAt`, `updatedAt`, `lastActive`, and profile activity fields (`lastSeenAt`).
- [x] TODO-2.2 Example/onboarding fields: `onboardingCompletedAt`, `exampleWorriesCreatedAt`, `exampleWorrySeedIds`.
- [ ] TODO-2.3 Notification setting fields: `notificationPermission`, `isInstalledPWA`.
- [ ] TODO-2.4 Account deletion fields: `deleted`, `deletedAt`.
- [ ] TODO-2.5 Client-writable fields during transition: own `gender`, `interests`, `lastActive`, `notificationPermission`, `isInstalledPWA`.
- [ ] TODO-2.6 Server-owned fields: `helpedCount`, `activeDeliveryCount`, `deleted`, `deletedAt`, example creation state, and any counters.
- [ ] TODO-2.7 Source of truth: user profile and matching eligibility.
- [ ] TODO-2.8 Read access: own document only for clients; server can query all eligible users.
- [ ] TODO-2.9 Lifecycle: soft deleted only; content remains.
- [ ] TODO-2.10 Replaces legacy use: profile matching fields currently queried by the browser.

### `users/{uid}/fcmTokens/{tokenId}`

- [ ] TODO-2.11 Fields: `token`, `platform`, `userAgent`, `instanceId`, `notificationPermission`, `isInstalledPWA`, `createdAt`, `updatedAt`, `lastSeenAt`.
- [ ] TODO-2.12 Source of truth: push destinations for the user.
- [ ] TODO-2.13 Read/write access: own user during transition; invalid token deletion by server.
- [ ] TODO-2.14 Lifecycle: delete on invalid token or account deletion.

### `worries/{worryId}`

- [x] TODO-2.15 Core publication fields: `authorUid`, `content`, `status: 'active'`, `rawCategories`, `validCategories`, `invalidCategories`, `matchingCategories`, `moderationLogId`, `initialDeliveryBatchId`, `initialDeliveryTargetCount: 5`, `humanDeliveryLimit: 15`, `humanDeliveryCount`, `humanReplyCount`, `hasHumanReply`, `createdAt`, `updatedAt`, `lastDeliveryCreatedAt`.
- [x] TODO-2.16 Rematch metadata fields: `lastRematchRunId`, `lastRematchBatchId`, `lastRematchCreatedAt`.
- [x] TODO-2.17 AI fallback fields: `hasAiReply`, `aiReplyId`, `aiFallbackCheckedAt`.
- [x] TODO-2.18 Example fields: `isExample`, `exampleSeedId`, `exampleOwnerUid`.
- [ ] TODO-2.19 Hidden/deleted-author fields: `status: 'hidden' | 'deleted_author'`, `hiddenAt`, `hiddenReason`, `hiddenBy`.
- [x] TODO-2.20 Source of truth: canonical worry content and moderation/category state.
- [x] TODO-2.21 Read access: author can read; recipient reads via delivery/read model; no public board reads.
- [x] TODO-2.22 Write access: server only.
- [x] TODO-2.23 Lifecycle: immutable by users after publication; admin can hide by DB/manual server utility.
- [x] TODO-2.24 Replaces legacy `letters` worry source-of-truth.

### `deliveries/{deliveryId}`

- [x] TODO-2.25 Deterministic ID recommendation: `worryId_recipientUid`.
  - Recommended choice: use deterministic IDs.
  - Why: supports idempotency, prevents duplicate delivery to same user, and enables Firestore rules to prove a recipient may read a worry with `exists(/databases/$(database)/documents/deliveries/$(worryId + '_' + request.auth.uid))`.
  - Tradeoff: if Firestore rules string concatenation or ID length becomes awkward, keep deterministic IDs in code and denormalize feed display fields onto delivery docs.
  - Affected files: `src/services/worryPublication/serverPublication.ts`, `src/services/deliveries/*`, `firestore.rules`.
- [x] TODO-2.26 Delivery status type:
  - `type DeliveryStatus = 'active' | 'answered' | 'passed' | 'hidden'`.
  - `active` means the recipient can answer.
  - 8-hour rematching does not change existing `active` deliveries.
  - `answered` means the recipient submitted a reply.
  - `passed` means the recipient explicitly passed.
  - `hidden` means admin/system hidden from user-visible surfaces.
  - Read state does not affect answerability.
  - Push failure does not affect answerability.
  - Do not include `rematched` as a normal terminal status. If a future admin/manual flow needs that concept, name and document it separately; normal 8-hour rematch is additive.
- [x] TODO-2.27 Core delivery fields: `worryId`, `recipientUid`, `authorUid`, `status: 'active' | 'answered'`, `answeredAt`, `batchId`, `batchRound: 0`, `slotIndex`, `selectionType: 'matched' | 'random'`, `matchOverlapCount`, `matchCategoriesSnapshot`, `recipientInterestsSnapshot`, `recipientGenderSnapshot`, `recipientHelpedCountSnapshot`, `authorGenderSnapshot`, `isAiRecipient: false`, `createdAt`, `updatedAt`, `answerableUntil?: null`.
- [x] TODO-2.28 Delivery read-state field: `readAt` lives under `users/{recipientUid}/deliveryReadStates/{deliveryId}`, not on `deliveries/{deliveryId}`.
- [x] TODO-2.29 Pass fields: `status: 'passed'`, `passedAt`.
- [x] TODO-2.30 Rematch delivery fields: `batchRound: 1 | 2`, `rematchEligibleAfter`, `createdByRematchRunId`.
- [x] TODO-2.31 Example delivery fields: `isExample`, `exampleSeedId`.
- [ ] TODO-2.32 Hidden delivery fields: `status: 'hidden'`, `hiddenAt`, `hiddenReason`.
- [x] TODO-2.33 Source of truth: who may answer a worry and answer feed state.
- [x] TODO-2.34 Read access: recipient can read own delivery; author may read delivery metadata without read receipts exposed in UI.
- [x] TODO-2.35 Write access: server only.
- [x] TODO-2.36 Lifecycle: statuses are monotonic except admin hide; `active` transitions only to `answered`, `passed`, or `hidden`. Immediate pass replacement and 8-hour additive rematch create additional deliveries to other users; neither revokes answerability for existing active deliveries.
- [x] TODO-2.37 Replaces legacy per-recipient worry `letters`.

### `replies/{replyId}`

- [x] TODO-2.38 Deterministic ID recommendation: `deliveryId`, so one reply per delivery is enforced by create-if-absent.
- [x] TODO-2.39 Core human reply fields: `deliveryId`, `worryId`, `authorUid`, `replierUid`, `content`, `status: 'active'`, `moderationLogId`, `createdAt`, `updatedAt`.
- [x] TODO-2.40 Reply read-state field: `readByAuthorAt` lives under `users/{authorUid}/replyReadStates/{replyId}`, not on `replies/{replyId}`.
- [x] TODO-2.41 Feedback summary fields: `feedbackType`, `likedAt`, `dislikedAt`.
- [x] TODO-2.42 AI reply fields: `isAiGenerated`.
- [x] TODO-2.43 Example reply fields: `isExampleReply`.
- [ ] TODO-2.44 Hidden reply fields: `status: 'hidden'`, `hiddenAt`, `hiddenReason`.
- [x] TODO-2.45 Source of truth: final answer content.
- [x] TODO-2.46 Read access: replier can read own replies; worry author can read replies to own worries except disliked replies hidden from publisher UI/read model.
- [x] TODO-2.47 Write access: server only.
- [x] TODO-2.48 Lifecycle: immutable by users; admin can hide.
- [x] TODO-2.49 Replaces legacy `letters` replies.

### `feedbacks/{feedbackId}`

- [x] TODO-2.50 Deterministic feedback ID policy: `feedbacks/{replyId}`.
  - Recommended choice: allow one later `comment` update only for `type == 'like'` when no comment exists.
  - Why: PRD allows delayed like comments but immutable like/dislike choice.
  - Tradeoff: feedback creation and like-comment update need separate server branches.
  - Affected files: `src/services/replyFeedback/*`, `server.ts`, `firestore.rules`.
- [x] TODO-2.51 Fields: `replyId`, `worryId`, `deliveryId`, `publisherUid`, `replierUid`, `type: 'like' | 'dislike'`, `comment`, `commentVisibility: 'replier' | 'admin_only' | 'none'`, `commentModerationLogId`, `helpedCountApplied`, `isForAiReply`, `isForExampleReply`, `createdAt`, `updatedAt`.
- [x] TODO-2.52 Source of truth: immutable like/dislike choice and optional moderated comment.
- [x] TODO-2.53 Read access: publisher can read own feedback; replier can read likes and like comments only; dislike and dislike comments are admin-only.
- [x] TODO-2.54 Write access: server only.
- [x] TODO-2.55 Lifecycle: no cancel/change. Like comment may be added later once if absent; dislike comment cannot be added later after leaving.
- [x] TODO-2.56 Replaces `letters.feedback` and `letters.publisherComment`.

### `moderationLogs/{logId}`

- [x] TODO-2.57 Worry moderation log fields: `targetType: 'worry'`, `targetId`, `uid`, `originalContent`, `status: 'approved' | 'rejected' | 'invalid_provider_response' | 'provider_error'`, `reasonCode`, `userMessage`, `helpMessage`, `rawProviderResponse`, `rawCategories`, `validCategories`, `invalidCategories`, `matchingCategories`, `provider`, `model`, `createdAt`, `updatedAt`.
- [x] TODO-2.58 Reply moderation log fields: `targetType: 'reply'` plus common moderation fields.
- [x] TODO-2.59 Feedback comment moderation log fields: `targetType: 'feedback_comment'` plus common moderation fields.
- [x] TODO-2.60 AI reply moderation log fields: `targetType: 'ai_reply'` plus common moderation fields.
- [x] TODO-2.61 Example reply moderation log fields: `targetType: 'example_reply'` plus common moderation fields.
- [x] TODO-2.62 Reason codes: `abuse_hate_profanity`, `sexual`, `self_harm_suicide`, `crime_violence_victim`, `personal_info`, `spam_promotion`, `empty`, `too_long`, `provider_invalid`.
- [x] TODO-2.63 Source of truth: filtering and category audit.
- [x] TODO-2.64 Read/write access: server/admin only.
- [x] TODO-2.65 Lifecycle: permanent operational log.

### `pushLogs/{pushLogId}`

- [x] TODO-2.66 New-worry push log fields: `kind: 'new_worry'`, `targetUid`, `sourceId`, `sourceType: 'worry' | 'delivery'`, `status: 'sent' | 'failed' | 'skipped_no_token'`, `tokenDocId`, `tokenSummary`, `errorCode`, `errorMessage`, `createdAt`.
- [ ] TODO-2.67 New-reply push log fields: `kind: 'new_reply'` plus common push log fields.
- [ ] TODO-2.68 Reply-liked push log fields: `kind: 'reply_liked'`, `sourceType: 'reply' | 'feedback'`, plus common push log fields.
- [ ] TODO-2.69 Push hardening status fields: `status: 'invalid_token_deleted' | 'skipped_deleted_user'`.
- [x] TODO-2.70 Source of truth: push attempt audit.
- [x] TODO-2.71 Read/write access: server/admin only.
- [x] TODO-2.72 Lifecycle: operational log; optional TTL later.

### Optional Operational Collections

- [x] TODO-2.73 `jobLocks/{jobName}`: `ownerId`, `lockedUntil`, `lastStartedAt`, `lastCompletedAt`, `updatedAt`; server only; prevents overlapping jobs.
- [x] TODO-2.74 `rematchRuns/{runId}`: `startedAt`, `completedAt`, `status`, `dueCount`, `processedCount`, `createdDeliveryCount`, `error`; server/admin only.
- [x] TODO-2.75 `deliveryBatches/{batchId}` Round 0 fields:
  - Fields: `worryId`, `batchRound: 0`, `createdAt`, `targetCount`, `createdCount`, `matchedCount`, `randomCount`, `reason: 'initial'`.
  - Round 0 batch is the initial 5-delivery batch and has no source batch.
- [x] TODO-2.76 `deliveryBatches/{batchId}` rematch lineage fields:
  - Required for rematch correctness once Slice 8 is implemented.
  - Fields: `worryId`, `batchRound: 1 | 2`, `sourceBatchId`, `sourceBatchRound: 0 | 1`, `createdByRunId`, `createdAt`, `targetCount`, `createdCount`, `matchedCount`, `randomCount`, `reason: 'rematch_timeout'`.
  - Round 1 batch references Round 0 as `sourceBatchId`/`sourceBatchRound`.
  - Round 2 batch references Round 1 as `sourceBatchId`/`sourceBatchRound`.
  - The source batch is the relevant 5-slot batch used for PRD 8.5 random-slot replacement semantics.
  - Do not use batch lineage to expire old deliveries.
- [x] TODO-2.77 `aiFallbackRuns/{runId}`: `startedAt`, `completedAt`, `status`, `checkedCount`, `createdReplyCount`, `error`; server/admin only.
- [x] TODO-2.78 `exampleWorrySeeds/{seedId}`: `content`, `categories`, `status`, `createdAt`, `updatedAt`; server/admin write, server read.
- [x] TODO-2.79 `scheduledJobs/{jobId}` or `exampleFeedbackJobs/{jobId}`: `kind`, `runAfter`, `status`, `replyId`, `targetUid`, `attempts`, `createdAt`, `updatedAt`; server only.
- [x] TODO-2.80 Immediate pass replacement metadata:
  - Replacement delivery fields: same `worryId`, enough denormalized worry display context for the answer feed, `selectionType`, matching snapshots, `createdByPassDeliveryId`, `replacementForDeliveryId`, `replacementReason: 'pass'`, `createdAt`, `updatedAt`.
  - Recommended delivery ID remains `worryId_recipientUid`; use a deterministic `passReplacementAttempts/{passedDeliveryId}` or equivalent operation record for idempotency, shortfall logging, selected recipient, created delivery ID, push status pointer, and debugging.
  - Do not encode pass replacement as Round 1 or Round 2 additive rematch unless a separate replacement batch type is explicitly added; it must be distinguishable from the 8-hour rematch job.

## 3. API Surface

All error responses should use `{ error: { code: string, message: string, details?: unknown } }`. Use `401` for missing/invalid auth, `403` for deleted/blocked users or ownership failures, `400` for validation, `404` for inaccessible targets, `409` for immutable/idempotency conflicts, and `500/502` for server/provider failures.

### Auth Middleware

- [x] TODO-3.1 Create `src/server/auth.ts` or `src/services/userAccount/serverAuth.ts`.
- [x] TODO-3.2 `requireFirebaseAuth` verifies `Authorization: Bearer <idToken>` with Firebase Admin Auth, attaches authenticated `uid`, never trusts `uid` from request body, and rejects `users/{uid}.deleted == true` for app activity. Missing `deleted` is treated as not deleted until the Phase 14 deletion field exists on all active users.
- [x] TODO-3.3 Tests: missing bearer, invalid token, body `uid` ignored, deleted user blocked.

### Worry Publication: `POST /api/worries/publish`

- [x] TODO-3.4 Request body: `{ content: string }`.
- [x] TODO-3.5 Auth: signed-in, not deleted, onboarded.
- [x] TODO-3.6 Server validation: trim, non-empty, max 1000.
- [x] TODO-3.7 Transaction boundary: moderation may run before transaction; transaction creates moderation log, worry, the initial Round 0 `deliveryBatches/{batchId}`, exactly 5 Round 0 deliveries, checks each selected recipient still has `activeDeliveryCount < 10`, increments each recipient's `activeDeliveryCount`, stores the Round 0 batch ID on `worries.initialDeliveryBatchId`, and fails without partial writes if fewer than 5 eligible recipients exist or any selected recipient no longer qualifies; push happens after commit; push logs happen after attempts.
- [x] TODO-3.8 Response: `200 { status: 'published', worryId, deliveryIds, moderationLogId }` or `200 { status: 'rejected', reasonCode, userMessage, helpMessage?, moderationLogId }`.
- [x] TODO-3.9 Idempotency: optional `Idempotency-Key`; if not implemented in Slice 1, document duplicate submissions as possible and keep UI submit disabled while pending.
- [x] TODO-3.10 Tests: auth, validation, rejected moderation creates no worry/deliveries/batch, fewer than 5 eligible recipients creates no worry/deliveries/batch/counter changes, approved creates a Round 0 batch plus exactly 5 deliveries with 4/1 selection, push failure warning/log only.

### Answer Feed Read State: `POST /api/deliveries/:deliveryId/read`

- [x] TODO-3.11 Request body: `{}`.
- [x] TODO-3.12 Auth: signed-in delivery recipient, not deleted.
- [x] TODO-3.13 Validation: delivery exists, `recipientUid == auth.uid`, not hidden.
- [x] TODO-3.14 Transaction: if the private delivery read-state doc is absent, set `readAt` and `updatedAt` under `users/{recipientUid}/deliveryReadStates/{deliveryId}`; no-op if already read; do not write `deliveries/{deliveryId}`.
- [x] TODO-3.15 Response: `200 { status: 'read', deliveryId, readAt }`, where `readAt` is the private read-state timestamp.
- [x] TODO-3.16 Idempotency: repeat calls return current read state.
- [x] TODO-3.17 Tests: recipient only, no author read receipt surface, idempotent.

### Pass: `POST /api/deliveries/:deliveryId/pass`

- [x] TODO-3.18 Request body: `{}`.
- [x] TODO-3.19 Auth: signed-in delivery recipient, not deleted.
- [x] TODO-3.20 Validation: delivery exists, belongs to the authenticated user, status is `active`, and the delivery is passable.
- [x] TODO-3.21 Transaction: if delivery is still `active`, set `status: 'passed'`, `passedAt`, decrement passer `activeDeliveryCount` exactly once, write same-worry exclusion metadata, synchronously attempt to select one replacement recipient, and if a recipient exists create one active replacement delivery and increment that recipient's `activeDeliveryCount` exactly once. If no eligible replacement exists, pass still succeeds and writes an operational shortfall log.
- [x] TODO-3.22 Response: `200 { status: 'passed', deliveryId, replacementDeliveryId?: string, replacementStatus: 'created' | 'shortfall' | 'not_applicable' }`.
- [x] TODO-3.23 Idempotency: already passed returns `200` with the recorded replacement result; it must not double-decrement, double-increment, or create a duplicate replacement. Answered or hidden deliveries return `409`.
- [x] TODO-3.24 Tests: active own delivery only, other user's delivery rejected, answered/hidden conflict, immediate feed removal, same user not redelivered, author not notified, immediate replacement created when eligible, no replacement on shortfall, replacement push failure does not roll back pass or replacement.

### Reply Publication: `POST /api/deliveries/:deliveryId/replies`

- [x] TODO-3.25 Request body: `{ content: string }`.
- [x] TODO-3.26 Auth: signed-in delivery recipient, not deleted.
- [x] TODO-3.27 Validation: trim non-empty max 1000, active delivery, no existing `replies/{deliveryId}`.
- [x] TODO-3.28 Transaction: moderation before transaction; create moderation log and `replies/{deliveryId}`; if delivery is still `active`, set delivery `answered`, increment worry human reply state for human replies, and decrement recipient `activeDeliveryCount` exactly once.
- [x] TODO-3.29 Response: `200 { status: 'published', replyId }` or `200 { status: 'rejected', reasonCode, userMessage, helpMessage?, moderationLogId }`.
- [x] TODO-3.30 Idempotency: deterministic reply ID makes duplicate create return existing success if content same; otherwise `409`.
- [x] TODO-3.31 Tests: one reply per delivery, ownership, status transition, moderation rejection, best-effort push to author.

### My Worries Replies Read State: `POST /api/worries/:worryId/replies/read`

- [x] TODO-3.32 Request body: `{ replyIds?: string[] }`; default marks all current PRD replies to that worry matching the worry author and minimal existing status rules only.
- [x] TODO-3.33 Auth: signed-in worry author, not deleted.
- [x] TODO-3.34 Validation: worry exists and `authorUid == auth.uid`.
- [x] TODO-3.35 Transaction/batch: create private reply read-state docs with `readByAuthorAt` for unread current replies existing at request time; do not write `replies/{replyId}`.
- [x] TODO-3.36 Response: `200 { status: 'read', worryId, markedCount }`.
- [x] TODO-3.37 Idempotency: repeat calls no-op.
- [x] TODO-3.38 Tests: author only, later new replies remain unread, read state not visible to repliers.

### Feedback: `POST /api/replies/:replyId/feedback`

- [x] TODO-3.39 Request body: `{ type: 'like' | 'dislike', comment?: string }`.
- [x] TODO-3.40 Auth: signed-in worry author/publisher, not deleted.
- [x] TODO-3.41 Validation: reply exists, reply belongs to publisher's worry, no existing feedback unless adding a first like comment under the allowed delayed-comment rule, comment trim/max 1000, comment moderation when present.
- [x] TODO-3.42 Transaction: create `feedbacks/{replyId}`, set reply feedback summary, increment `users/{replierUid}.helpedCount` exactly once for eligible human likes, hide disliked reply from publisher read model.
- [x] TODO-3.43 Response: `200 { status: 'saved', feedbackId, helpedCountApplied }`.
- [x] TODO-3.44 Idempotency: same feedback repeat returns existing; different type returns `409`; delayed like comment update allowed once if no prior comment.
- [x] TODO-3.45 Tests: one feedback, AI like excluded from helpedCount, dislike hidden, comments visibility, like push only.

### Account Deletion: `POST /api/users/me/delete`

- [ ] TODO-3.46 Request body: `{ confirm: true }`.
- [ ] TODO-3.47 Auth: signed-in user.
- [ ] TODO-3.48 Validation: confirmation required.
- [ ] TODO-3.49 Transaction/batch: set `users/{uid}.deleted = true`, `deletedAt`, `updatedAt`; remove push tokens; keep existing content.
- [ ] TODO-3.50 Response: `200 { status: 'deleted' }`.
- [ ] TODO-3.51 Idempotency: already deleted returns `200`.
- [ ] TODO-3.52 Tests: tokens removed, future endpoints blocked, matching excludes `deleted === true` users, missing `deleted` remains eligible before deletion, existing content preserved.

### Internal Jobs

- [x] TODO-3.53 `POST /api/internal/rematch-due-deliveries`: internal auth; body `{ now?: string, dryRun?: boolean, limit?: number }`; scan worries/deliveries that still need 8-hour additive exposure according to PRD; create linear Round 1/Round 2 additive delivery batches for new recipients; never change old active deliveries merely because 8 hours passed; do not own immediate pass replacement delivery creation; cap total human deliveries at 15; use job lock and deterministic IDs.
- [x] TODO-3.54 `POST /api/internal/create-ai-fallbacks`: internal auth; body `{ now?: string, dryRun?: boolean, limit?: number }`; create one moderated AI reply only after 24h, human delivery limit exhausted, zero human replies, and no existing AI reply.
- [x] TODO-3.55 `POST /api/internal/create-example-feedbacks`: internal auth; body `{ now?: string, limit?: number }`; processes delayed example likes after 5-15 minutes.
- [x] TODO-3.56 Seed/admin utility endpoint: avoid unless strictly necessary. Recommended default is seed `exampleWorrySeeds` by script/manual Firebase import, not public API.
- [x] TODO-3.57 Tests: internal auth, dry run where supported, idempotent repeated calls, exact condition matrices.

## 4. Server Modules and File-Level Plan

### `worryPublication`

- [x] TODO-4.1 Purpose: publish a moderated worry and create initial deliveries.
- [x] TODO-4.2 Public interface: `publishWorryOnServer({ authorUid, content, idempotencyKey? })`.
- [x] TODO-4.3 Internal dependencies: moderation, recipient selection, Firestore Admin adapter, push service, clock/id factory.
- [x] TODO-4.4 Files to create/update: `src/services/worryPublication/serverPublication.ts`, `serverFirestore.ts`, `policy/recipientSelection.ts`, `adapters/http.ts`, `productionFactory.ts`, `types.ts`, `packages/domain/src/index.ts`, `server.ts`.
- [x] TODO-4.5 Tests: `serverPublication.test.ts`, recipient selection tests, production factory tests, publish API tests.
- [x] TODO-4.6 Deletion test: deleting `serverPublication.ts` and route binding removes all PRD publication behavior; client cannot recreate it through Firestore.

### `moderation`

- [x] TODO-4.7 Purpose: normalize provider output, map reason codes/messages, preserve category evidence.
- [x] TODO-4.8 Public interface: `moderateWorry`, `moderateReply`, `moderateFeedbackComment`, `moderateAiReply`, `normalizeWorryModeration`.
- [x] TODO-4.9 Files: `src/services/moderation/normalize.ts`, `src/server/moderationResponses.ts`, optional `reasonCodes.ts`, provider prompts in `server.ts`.
- [x] TODO-4.10 Tests: normalization, server response processing, malformed provider responses, high-risk help message.
- [x] TODO-4.11 Deletion test: removing moderation module should make APIs fail closed, not save unmoderated content.

### `homeWorryFeed` / `answerFeed`

- [x] TODO-4.12 Purpose: client read model for `답변하기`.
- [x] TODO-4.13 Public interface: `useAnswerFeed({ user })` returns deliveries joined with worry display fields.
- [x] TODO-4.14 Files: update or rename `src/services/homeWorryFeed/*`; create `src/services/answerFeed/*` if clearer; keep temporary `legacyLettersFallback.ts`.
- [x] TODO-4.15 Tests: active deliveries, hidden/answered/passed exclusions, additive rematch leaves old active deliveries visible and answerable, legacy fallback isolation.
- [x] TODO-4.16 Deletion test: deleting legacy fallback does not affect new delivery feed.

### `replyPublication`

- [x] TODO-4.17 Purpose: create exactly one moderated reply for a delivery.
- [x] TODO-4.18 Public interface: `publishReplyForDelivery({ replierUid, deliveryId, content })`.
- [x] TODO-4.19 Files: `src/services/replyPublication/serverPublication.ts`, `serverFirestore.ts`, `adapters.ts`, `productionFactory.ts`, `server.ts`.
- [x] TODO-4.20 Tests: one reply per delivery, delivery answered transaction, no `letters` creation.
- [x] TODO-4.21 Deletion test: deleting module removes reply mutation API; client cannot write replies directly.

### `replyFeedback`

- [x] TODO-4.22 Purpose: one immutable feedback per reply and helpedCount transaction.
- [x] TODO-4.23 Public interface: `submitReplyFeedbackOnServer({ publisherUid, replyId, type, comment? })`.
- [x] TODO-4.24 Files: `src/services/replyFeedback/serverFeedback.ts`, `serverFirestore.ts`, `submitReplyFeedback.ts`, `types.ts`, `production.ts`, `firestoreAdapters.ts`.
- [x] TODO-4.25 Tests: deterministic ID, like/dislike behavior, comments visibility, push policy.
- [x] TODO-4.26 Deletion test: deleting server feedback module removes feedback mutation; helpedCount cannot be changed from client.

### `replyMailbox` / `myWorries`

- [x] TODO-4.27 Purpose: show worries authored by me, replies received for my worries, and replies written by me.
- [x] TODO-4.28 Public interface: `useMyWorries`, `useRepliesForWorry`, `useMyGivenReplies`.
- [x] TODO-4.29 Files: `src/services/replyMailbox/*`, new `src/services/myWorries/*`, `src/App.tsx` decomposition.
- [x] TODO-4.30 Tests: authored worries, received replies, own written replies, and isolated legacy fallback behavior.
- [x] TODO-4.31 Read-state extension: unread counts and unread emphasis are added by Slice 5 after read APIs exist.
- [x] TODO-4.32 Feedback extension: disliked filtering is completed by Slice 7 after feedback exists.
- [ ] TODO-4.33 Admin hiding extension: hidden filtering is completed by Slice 15 after admin hiding exists.
- [x] TODO-4.34 Deletion test: legacy mailbox deletion does not remove PRD mailbox behavior.

### `pass` / `rematch`

- [x] TODO-4.35 Purpose: user pass changes delivery status, redelivery eligibility, and immediate replacement attempt.
- [x] TODO-4.36 Purpose: internal rematch creates additive delivery batches.
- [x] TODO-4.37 Public interface: `passDelivery({ uid, deliveryId })`.
- [x] TODO-4.38 Public interface: `rematchDueDeliveries({ now, limit })`.
- [x] TODO-4.39 Files for pass: `src/services/deliveries/passDelivery.ts`, answer feed UI, `server.ts`.
- [x] TODO-4.40 Files for rematch: `src/services/rematch/rematchDueDeliveries.ts`, `src/services/rematch/policy.ts`, `src/services/worryPublication/policy/recipientSelection.ts`, `server.ts`.
- [x] TODO-4.41 Tests for pass: delivery transition, immediate replacement success and shortfall, redelivery exclusion metadata, counter decrement/increment behavior, replacement push failure, and idempotency.
- [x] TODO-4.42 Tests for rematch: no redelivery, job idempotency, additive delivery batches, and counters.
- [x] TODO-4.43 Deletion test for pass: deleting pass module removes pass action without affecting reply publication.
- [x] TODO-4.44 Deletion test for rematch: deleting rematch module stops additive delivery batches without affecting reply publication or existing recipients' ability to answer.

### `aiFallback`

- [x] TODO-4.45 Purpose: create one moderated AI reply only when PRD conditions are exactly met.
- [x] TODO-4.46 Public interface: `createAiFallbacks({ now, limit })`.
- [x] TODO-4.47 Files: `src/services/aiFallback/createAiFallbacks.ts`, `generateAiReply.ts`, `server.ts`.
- [x] TODO-4.48 Tests: 24h, delivery cap exhausted, zero human replies, no duplicate AI.
- [x] TODO-4.49 Deletion test: deleting module disables only fallback, not human replies.

### `exampleWorries`

- [x] TODO-4.50 Purpose: seed up to 5 onboarding example deliveries and delayed likes.
- [x] TODO-4.51 Public interfaces: `createExamplesForUser({ uid })`, `createDueExampleFeedbacks({ now })`.
- [x] TODO-4.52 Files: `src/services/exampleWorries/createExamplesForUser.ts`, `seedAdapter.ts`, `createExampleFeedbacks.ts`, onboarding path in `server.ts` or profile API.
- [x] TODO-4.53 Tests: once/max 5/interest selection/no UI label/delayed like.
- [x] TODO-4.54 Deletion test: deleting examples leaves real delivery feed intact.

### `userAccount`

- [ ] TODO-4.55 Purpose: profile writes, activity blocking, soft deletion, push token cleanup.
- [ ] TODO-4.56 Public interfaces: `updateMyProfile`, `deleteMyAccount`, `assertActiveUser`.
- [ ] TODO-4.57 Files: `src/services/userAccount/*`, `src/services/pushRegistration/*`, `server.ts`.
- [ ] TODO-4.58 Tests: soft delete, matching exclusion, endpoint blocking.
- [ ] TODO-4.59 Deletion test: account deletion is isolated from content modules.

## 5. Implementation Slices

### Slice 1: Server-owned worry publication

- [x] TODO-5.1 Goal: publish worry through authenticated server endpoint, preserving moderation/category evidence and creating the initial Round 0 delivery batch plus exactly 5 initial deliveries. Strict policy: if fewer than 5 eligible human recipients exist, publication fails with no partial state.
- [x] TODO-5.2 Files to inspect: `docs/PRD.md`, `src/App.tsx`, `server.ts`, `firestore.rules`, `packages/domain/src/index.ts`, `src/services/worryPublication/*`, `src/services/homeWorryFeed/*`, `src/services/moderation/*`, `src/server/moderationResponses.ts`.
- [x] TODO-5.3 Files to modify/create: server publication and Firestore Admin adapter under `src/services/worryPublication`, `server.ts` auth and `POST /api/worries/publish`, client wrapper in `adapters/http.ts`, production factory, home/answer feed, domain match types.
- [x] TODO-5.4 Data model changes: add `worries`, `deliveries`, required `deliveryBatches` for Round 0 lineage, `moderationLogs`, `pushLogs`; keep legacy `letters`.
- [x] TODO-5.5 API changes: new publish endpoint; `/api/process-worry`, `/api/notify-new-worry`, and `/api/schedule-bot-reply` become legacy/internal-to-be-removed paths.
- [x] TODO-5.6 UI/read-path changes: `App.tsx#publishWorry` calls endpoint and shows `고민이 전달되었어요!`; answer feed reads new deliveries first with temporary `letters` fallback.
- [x] TODO-5.7 Firestore rules dependency: runtime app code no longer performs PRD worry publication through direct Firestore writes in this slice; full Firestore rules denial for new PRD collections is completed in Slice 2.
- [x] TODO-5.8 Tests: moderation normalization, recipient selection exactly 5 and 4/1, fewer-than-5 eligible recipient failure with no partial writes, server publication transaction creates `deliveryBatches/{batchId}` with `batchRound: 0` and no source batch, API auth/body validation, feed read model with fallback.
- [x] TODO-5.9 Manual verification: publish worry; verify one `worries` doc, five `deliveries`, one moderation log, push logs; recipient sees delivery without push permission.
- [x] TODO-5.10 Explicit non-goals: no reply migration, no pass/rematch/AI/examples, no bottom-tab rebuild.
- [x] TODO-5.11 Deletion test: if server publish route/module is removed, browser cannot publish PRD worries by direct Firestore writes.

### Slice 2: Firestore rules first hardening

- [x] TODO-5.12 Goal: stop new client-created PRD source-of-truth data and reduce legacy blast radius.
- [x] TODO-5.13 Modify: `firestore.rules`; add rules tests.
- [x] TODO-5.14 Rules changes: deny client create/update/delete for PRD collections; deny `letters` worry creation; deny `letters` delete immediately; narrow `users` read/write; preserve only necessary temporary `letters` reply paths.
- [x] TODO-5.15 Tests: direct write denial, own profile allowed, other user denied, legacy delete denied.
- [x] TODO-5.16 Manual verification: app still loads and can use first-slice publish path.
- [x] TODO-5.17 Explicit non-goals: final `letters` denial waits until Slice 16.
- [x] TODO-5.18 Deletion test: removing legacy rules should fail only legacy tests, not PRD source-of-truth tests.

### Slice 3: Reply migration

- [x] TODO-5.19 Goal: replies are created by server only; the API remains `POST /api/deliveries/:deliveryId/replies`, and the stored reply document ID is deterministic from `deliveryId` so one reply per delivery is enforceable.
- [x] TODO-5.20 Files: `src/services/replyPublication/*`, `src/services/moderation/*`, `server.ts`, `src/App.tsx`, answer detail components.
- [x] TODO-5.21 Data/API: add `POST /api/deliveries/:deliveryId/replies`.
- [x] TODO-5.22 Transaction: create moderation log and `replies/{deliveryId}`, set delivery answered, update worry human reply state and counters.
- [x] TODO-5.23 UI/read path: answer detail submits by delivery ID, not legacy worry letter ID.
- [x] TODO-5.24 Rules: deny client reply creation; preserve legacy reply read fallback until Slice 4.
- [x] TODO-5.25 Tests: moderation, deterministic reply ID, one reply per delivery, duplicate same-content idempotency, different-content duplicate rejection, answered status, notify author best-effort, no edit/delete, no writes to `letters`.
- [x] TODO-5.26 Manual verification: recipient answers once; second attempt blocked; author gets new reply signal.
- [x] TODO-5.27 Explicit non-goals: feedback migration, full my-worries UI.
- [x] TODO-5.28 Deletion test: no `letters` reply creation path remains after this slice.

### Slice 4: My worries and reply mailbox migration

- [x] TODO-5.29 Goal: PRD read models replace `letters` mailbox/inbox concepts.
- [x] TODO-5.30 Files: `src/services/replyMailbox/*`, new `src/services/myWorries/*`, `src/App.tsx`.
- [x] TODO-5.31 Data model: read `worries` by `authorUid` and `replies` by `worryId`/`replierUid`; do not require feedback summaries before Slice 7.
- [x] TODO-5.32 UI/read path: my worries list, replies received, and replies written by me; unread reply emphasis waits for Slice 5, disliked filtering waits for Slice 7, and admin hidden filtering waits for Slice 15.
- [x] TODO-5.33 Legacy fallback removal strategy: read both new `replies` and old `letters` replies behind one adapter, then remove fallback in Slice 16.
- [x] TODO-5.34 Tests: my worries list, replies received, replies written, and legacy fallback isolation.
- [x] TODO-5.35 Manual verification: author sees new replies; replier sees own written reply.
- [x] TODO-5.36 Explicit non-goals: bottom tab redesign can wait until Slice 11.
- [x] TODO-5.37 Deletion test: removing `letters` fallback leaves new replies visible.

### Slice 5: Read state

- [x] TODO-5.38 Goal: private read emphasis for deliveries and replies.
- [x] TODO-5.39 Files: deep read-state module under `src/services/readState/server/*`, `src/server/readStateRoutes.ts`, client read-state API wrapper, feed/mailbox hooks, `server.ts`.
- [x] TODO-5.40 API: `POST /api/deliveries/:deliveryId/read`, `POST /api/worries/:worryId/replies/read`.
- [x] TODO-5.41 Data: actor-private read-state docs under `users/{recipientUid}/deliveryReadStates/{deliveryId}` and `users/{authorUid}/replyReadStates/{replyId}`; no shared `deliveries.readAt` or `replies.readByAuthorAt`.
- [x] TODO-5.42 UI: answer tab emphasizes unread deliveries; my worries emphasizes unread replies; no "read by other party" copy.
- [x] TODO-5.43 Rules: clients cannot write private read-state docs directly and cannot write shared read receipt fields on deliveries or replies.
- [x] TODO-5.44 Tests: idempotency, ownership, later replies remain unread, read state private.
- [x] TODO-5.45 Manual verification: opening detail removes own emphasis only.
- [x] TODO-5.46 Explicit non-goals: public read receipts.
- [x] TODO-5.47 Deletion test: removing read-state modules removes emphasis updates but not core publish/reply.

### Slice 6: Pass

- [x] TODO-5.48 Goal: users can pass active deliveries and never receive the same worry again.
- [x] TODO-5.49 Files: new `src/services/deliveries/passDelivery.ts`, answer feed UI, `server.ts`.
- [x] TODO-5.50 API: `POST /api/deliveries/:deliveryId/pass`.
- [x] TODO-5.51 Data: delivery status `passed`, `passedAt`, pass included in same-worry redelivery exclusion metadata and human delivery accounting; immediate replacement delivery metadata/attempt log distinguishes pass replacement from Round 1/Round 2 additive rematch.
- [x] TODO-5.52 UI: left swipe or clear button in answer feed; immediate local removal after success.
- [x] TODO-5.53 Rules: server-only status update.
- [x] TODO-5.54 Tests: active only, ownership, feed removal, author receives no pass signal, immediate replacement success, replacement shortfall, replacement exclusion policy, replacement push failure no rollback, counter correctness, and idempotency.
- [x] TODO-5.55 Manual verification: pass disappears; author sees no pass signal.
- [x] TODO-5.56 Explicit non-goals: Phase 6 does not create Round 1/Round 2 additive rematch batches, does not branch the rematch lineage, does not expose pass state to the author, and does not own invalid token cleanup/durable push-log hardening beyond the pass replacement push no-rollback invariant.
- [x] TODO-5.57 Deletion test: deleting pass module removes pass action and immediate replacement creation; matching exclusion tests fail if pass history is ignored.

### Slice 7: Feedback migration

- [x] TODO-5.58 Goal: feedback lives in `feedbacks/{replyId}` with immutable like/dislike semantics.
- [x] TODO-5.59 Files: `src/services/replyFeedback/*`, `server.ts`, my worries reply UI, my page liked-comment UI.
- [x] TODO-5.60 API: `POST /api/replies/:replyId/feedback`.
- [x] TODO-5.61 Data: deterministic feedback doc, reply summary fields, helpedCount transaction.
- [x] TODO-5.62 Rules: deny direct feedback/helpedCount writes.
- [x] TODO-5.63 Tests: one-time immutable feedback, deterministic ID, AI reply like excluded, example like included, dislike hides reply, comment visibility, no comment push, like push only.
- [x] TODO-5.64 Manual verification: like increments count once; dislike hides; comments visibility correct.
- [x] TODO-5.65 Explicit non-goals: feedback cancellation/change.
- [x] TODO-5.66 Deletion test: deleting feedback module removes all ways to mutate feedback/helpedCount.

### Slice 8: Rematch job

- [x] TODO-5.67 Goal: additive 8-hour rematch creates more delivery opportunities without expiring existing active deliveries.
- [x] TODO-5.68 Files: `src/services/rematch/*`, `src/services/worryPublication/policy/recipientSelection.ts`, `server.ts`.
- [x] TODO-5.69 API/job: `POST /api/internal/rematch-due-deliveries`.
- [x] TODO-5.70 Data: `rematchRuns`, `jobLocks`, required `deliveryBatches/{batchId}` lineage, new delivery batch IDs/rounds, and worry metadata such as `lastRematchRunId`, `lastRematchBatchId`, `lastRematchCreatedAt`.
- [x] TODO-5.71 Semantics:
  - Rematch is evaluated per worry and per round, not independently for every historical batch.
  - Rematch rounds are linear per worry: Round 0 -> Round 1 -> Round 2. There is no branching rematch tree.
  - Round 0 is the initial 5-delivery batch.
  - Round 1, after 8 hours, creates replacements for unanswered slots in Round 0.
  - Round 2, after another 8 hours, creates replacements for unanswered slots in Round 1.
  - No Round 3 human rematch is created.
  - Existing active deliveries from earlier rounds remain `active`, remain in the answer feed, and remain answerable.
  - Earlier active deliveries do not spawn independent rematch branches.
  - The source batch for a rematch round is the previous round batch: Round 1 uses Round 0 as source; Round 2 uses Round 1 as source.
  - If no source batch exists for the next round, do not create rematch.
  - If the next round would be greater than 2, do not create rematch.
  - Rematch target size for the next round is `min(5 - answeredHumanDeliveryCountInSourceBatch, remainingHumanDeliveryCapacity, 5)`, with no rematch when that value is `<= 0`.
  - Immediate pass replacement is handled by Slice 6; this job does not retroactively fill pass slots as its primary responsibility.
  - Tradeoff: late answers from old recipients can make final human reply count exceed 5, but this preserves the PRD rule that old recipients remain answerable.
  - Read state and push failures do not affect answerability.
  - Existing recipients are excluded from future delivery batches for the same worry.
  - Passed users are excluded from future delivery batches for the same worry.
  - Answered users are already associated with the worry and must not receive duplicate delivery.
  - Never exceed `worries.humanDeliveryLimit == 15` total human deliveries across all batches.
- [x] TODO-5.72 Rematch batch sizing:
  - Initial publication always creates exactly 5 deliveries: 4 matched + 1 random.
  - A rematch run attempts to create another batch of up to 5 deliveries when PRD conditions are met.
  - Replacement random-slot policy must follow PRD 8.5 exactly for the source batch.
  - Look at the source batch's original random-slot delivery.
  - If that random-slot recipient has already answered, all replacement deliveries for the next round are matched.
  - If that random-slot recipient has not answered, exactly one replacement delivery for the next round is random and the rest are matched.
  - Full rematch batch target is therefore either 5 matched replacements, or 4 matched + 1 random, depending on whether the original random-slot recipient already answered.
  - If fewer than 5 human slots remain before the 15-cap, create only the remaining number.
  - If answered deliveries in the source batch reduce the needed slots below 5, create only the needed number.
  - If fewer eligible users exist than the target batch size, create only eligible non-duplicate deliveries and log the shortfall in `rematchRuns`.
  - Partial-batch random policy is still governed by PRD 8.5: include one random replacement only when the source batch random-slot recipient has not answered and `targetSize >= 1`; otherwise all partial replacements are matched.
  - Round 1 batch must reference Round 0 as `sourceBatchId`/`sourceBatchRound`; Round 2 batch must reference Round 1 as `sourceBatchId`/`sourceBatchRound`.
  - Affected files: `src/services/rematch/policy.ts`, recipient selection tests.
- [x] TODO-5.73 ActiveDeliveryCount strategy: `users/{uid}.activeDeliveryCount` is a required transactionally maintained server-owned counter from Slice 1. Rematch must check each selected new recipient still has `activeDeliveryCount < 10` inside the same transaction that creates deliveries, increment new recipients exactly once, and never decrement old recipients merely because additive rematch created deliveries elsewhere.
- [x] TODO-5.74 Tests: due selection, additive old-delivery behavior, partial/full batch random rules, exclusions, cap, idempotency, job lock, counter correctness, and no dependency on Phase 8 to create immediate pass replacements.
- [x] TODO-5.75 Manual verification: simulate timestamps and run job twice; old recipients can still answer after new deliveries are created.
- [x] TODO-5.76 Explicit non-goals: AI fallback creation.
- [x] TODO-5.77 Deletion test: deleting rematch job leaves pass/reply working but no additive delivery batches.

### Slice 9: AI fallback

- [x] TODO-5.78 Goal: one moderated AI reply only under exact 24-hour no-human-reply condition.
- [x] TODO-5.79 Files: `src/services/aiFallback/*`, `src/services/moderation/*`, `server.ts`.
- [x] TODO-5.80 API/job: `POST /api/internal/create-ai-fallbacks`.
- [x] TODO-5.81 Conditions: 24h since worry creation, human delivery limit exhausted, zero human replies stored, disliked human replies still count as human replies, no existing AI reply.
- [x] TODO-5.82 Late human replies: AI fallback must check current `worries.humanReplyCount`/`replies` at job time. A human reply submitted after 8 hours by an original recipient still blocks AI fallback because original deliveries do not expire.
- [x] TODO-5.83 AI fallback does not require original deliveries to expire; they do not expire under the PRD.
- [x] TODO-5.84 Data/UI: `replies.isAiGenerated`, `worries.hasAiReply`, `aiReplyId`, moderation log; AI reply looks like normal reply with no label.
- [x] TODO-5.85 Tests: condition matrix, moderation before save, no duplicates, notify author.
- [x] TODO-5.86 Manual verification: simulate no replies after 24h; verify one AI reply.
- [x] TODO-5.87 Explicit non-goals: professional counseling copy.
- [x] TODO-5.88 Deletion test: deleting AI fallback affects only no-reply fallback.

### Slice 10: Example worries

- [x] TODO-5.89 Goal: onboarding creates up to 5 realistic example deliveries once.
- [x] TODO-5.90 Files: `src/services/exampleWorries/*`, onboarding/profile code, answer feed, internal job route.
- [x] TODO-5.91 Data: `exampleWorrySeeds`, `worries.isExample`, `deliveries.isExample`, scheduled example feedback jobs.
- [x] TODO-5.92 Behavior: seeds selected by interests, max 5, created once, no UI example label, reply moderation, auto like after 5-15 minutes, no auto comment, helpedCount increases.
- [x] TODO-5.93 Tests: once/max 5, interest selection, no later additions on interest edit, delayed like, helpedCount.
- [x] TODO-5.94 Manual verification: new user completes onboarding and sees example worries.
- [x] TODO-5.95 Explicit non-goals: admin seed UI.
- [x] TODO-5.96 Deletion test: removing example module leaves real deliveries unaffected.

### Slice 11: UI navigation PRD alignment

- [x] TODO-5.97 Goal: UI matches PRD navigation and removes public-board impression.
- [x] TODO-5.98 Files: `src/App.tsx`; create components under `src/components` or feature folders only when reducing real complexity.
- [x] TODO-5.99 UI changes: first screen `답변하기`; bottom tabs `답변하기`, `나의 고민`, `마이페이지`; worry writing entry from `나의 고민`; decompose current inbox/settings/home concepts; More menu in My Page with notifications, guide, policy, logout, delete account; remove public-board-looking UI.
- [x] TODO-5.100 Tests/manual: authenticated first route, mobile bottom tabs, worry write entry, logout/delete account access.
- [x] TODO-5.101 Explicit non-goals: new visual brand overhaul unless needed for PRD clarity.
- [x] TODO-5.102 Deletion test: feature hooks own data behavior; UI components can be reorganized without changing server invariants.

### Slice 12: Input validation and copy

- [x] TODO-5.103 Goal: common validation and PRD moderation copy.
- [x] TODO-5.104 Files: create `src/services/validation/content.ts`; update publish/reply/feedback APIs and UI forms.
- [x] TODO-5.105 Rules: trim, non-empty, max 1000; remove current/implicit min 10 constraints if any exist.
- [x] TODO-5.106 Copy: moderation failure reason messages, high-risk help message, preserve drafts on failure.
- [x] TODO-5.107 Tests: validator unit tests, API validation, draft preservation UI/manual tests.
- [x] TODO-5.108 Explicit non-goals: rich text.
- [x] TODO-5.109 Deletion test: removing validator should cause API tests to fail across worry/reply/comment.

### Slice 13: Notifications

- [ ] TODO-5.110 Goal: PRD notification kinds only, with durable logs.
- [ ] TODO-5.111 Files: extract `server.ts` push helper to `src/services/notifications/*`, update `src/services/pushRegistration/*`, service worker files.
- [ ] TODO-5.112 Kinds: new worry, new reply, reply liked.
- [ ] TODO-5.113 Exclusions: no comment notification, no dislike notification.
- [ ] TODO-5.114 Behavior: invalid token cleanup; push failure logs and does not roll back core state; foreground duplication policy documented and tested where possible.
- [ ] TODO-5.115 Tests: pushLogs statuses, invalid token deletion, no rollback, no comment push.
- [ ] TODO-5.116 Manual verification: grant/deny notification permission, trigger each kind.
- [ ] TODO-5.117 Explicit non-goals: notification settings beyond PRD.
- [ ] TODO-5.118 Deletion test: deleting notification service leaves core mutations passing with push warnings/logs.

### Slice 14: Account deletion and inactive users

- [ ] TODO-5.119 Goal: soft delete and block future activity.
- [ ] TODO-5.120 Files: `src/services/userAccount/*`, `server.ts`, My Page UI.
- [ ] TODO-5.121 Data/API: `POST /api/users/me/delete`, `users.deleted`, push token cleanup.
- [ ] TODO-5.122 Behavior: keep existing content, exclude from matching and notifications, block app activity.
- [ ] TODO-5.123 Rules: deleted users cannot write profile/token docs if rules can detect deleted state.
- [ ] TODO-5.124 Tests: deletion idempotency, endpoint block, matching exclusion, token removal.
- [ ] TODO-5.125 Manual verification: deleted account cannot publish/reply/pass/feedback.
- [ ] TODO-5.126 Explicit non-goals: physical data erasure.
- [ ] TODO-5.127 Deletion test: removing userAccount module leaves no supported deletion path.

### Slice 15: Admin hiding and internal logs

- [ ] TODO-5.128 Goal: DB-manual hiding and operational audit coverage.
- [ ] TODO-5.129 Fields: `status: 'hidden'`, `hiddenAt`, `hiddenReason`, `hiddenBy` on worries/replies/deliveries.
- [ ] TODO-5.130 Read models: exclude hidden content everywhere.
- [ ] TODO-5.131 Logs: moderation, matching, pass, rematch, push, AI, example runs.
- [ ] TODO-5.132 Files: read model filters, rules, services that write logs.
- [ ] TODO-5.133 Tests: hidden worries/replies excluded, logs created for major paths.
- [ ] TODO-5.134 Manual verification: manually hide a worry/reply in Firestore and refresh UI.
- [ ] TODO-5.135 Explicit non-goals: full admin UI.
- [ ] TODO-5.136 Deletion test: hiding filters are centralized in read model policies, not scattered through view markup.

### Slice 16: Legacy `letters` removal

- [ ] TODO-5.137 Goal: remove old data model and close rules.
- [ ] TODO-5.138 Remove: `receiverId === 'public'`, `deleteLetter`, `letters` worry fallback, `letters` reply fallback, old bot schedule endpoint, old comment notification endpoint, client Firestore adapters that create/update `letters`.
- [ ] TODO-5.139 Rules: deny all `letters` reads/writes/deletes or remove match block.
- [ ] TODO-5.140 Tests: no imports/reference to `letters` outside migration tests; final rules hardening.
- [ ] TODO-5.141 Manual verification: app works with only PRD collections.
- [ ] TODO-5.142 Explicit non-goals: historical data migration if reset strategy is chosen.
- [ ] TODO-5.143 Deletion test: `rg "letters"` should show only documented archival/migration notes or zero runtime references.

### Slice 17: Documentation and operational setup

- [ ] TODO-5.144 Goal: operational docs match final PRD implementation.
- [ ] TODO-5.145 Update: `docs/matching_algorithm.md`, `README.md` or `docs/ops.md`, `.env` documentation for Firebase Admin/provider/internal job secret, local test commands, emulator/rules test setup, deploy notes for scheduled jobs.
- [ ] TODO-5.146 Tests/checks: docs mention all internal endpoints and required env vars.
- [ ] TODO-5.147 Explicit non-goals: broad product docs beyond implementation needs.
- [ ] TODO-5.148 Deletion test: a developer can implement/deploy using PRD + codebase + this TODO + ops docs.

## 6. Matching Policy Detail

- [x] TODO-6.1 Initial publication candidate eligibility: user exists, not author, not deleted, not inactive if `lastActive` remains a product signal, valid `gender`, valid `interests`, active delivery count `< 10`, has not already received this worry, push token not required. Missing `deleted` is not deleted; exclude only when `deleted === true` or the final explicit inactive/deleted marker is present.
- [x] TODO-6.2 Rematch candidate eligibility: user exists, not author, not deleted or inactive, valid `gender`, valid `interests`, active delivery count `< 10`, has not previously received this worry, and is not passed or answered for this worry. Missing `deleted` is not deleted; exclude only when `deleted === true` or the final explicit inactive/deleted marker is present.
- [x] TODO-6.3 Ranking for matched slots: category overlap desc, `helpedCount` desc, same gender as author first, random tie-break after those.
- [x] TODO-6.4 Random slot: same eligibility constraints, ignores overlap/helpedCount/gender ranking, no duplicate with matched slots.
- [x] TODO-6.5 Fallback if fewer than 5 eligible users:
  - Required choice for this implementation plan: fail publication with a clear server error during Slice 1.
  - Why: preserves the exact 5-delivery invariant and keeps tests strict.
  - Tradeoff: small test/user pools may be unable to publish until enough users exist.
  - Consequence: no partial worry, batch, delivery, counter, or push state is written.
  - Affected files: recipient selection tests, server publication error handling, API tests, and local seed/test-user setup.
- [x] TODO-6.6 Rematch exclusions: author, deleted/inactive users, users with `activeDeliveryCount >= 10`, all previous recipients for same worry, passed users, answered users; respect total 15 human delivery cap.
- [x] TODO-6.7 Rematch batch sizing:
  - Initial publication is fixed at exactly 5 deliveries: 4 matched + 1 random.
  - Later rematch batches are additive and may be partial.
  - Rematch rounds are linear per worry: Round 0 -> Round 1 -> Round 2.
  - There is no branching rematch tree; historical earlier batches do not independently spawn extra rematch branches.
  - Round 0 is the initial batch, Round 1 uses Round 0 as source, and Round 2 uses Round 1 as source.
  - No human rematch is created after Round 2.
  - `sourceBatchId` and `sourceBatchRound` identify the source batch used for target sizing and PRD 8.5 random-slot replacement.
  - Needed-slot formula for the next round is `min(5 - answeredHumanDeliveryCountInSourceBatch, remainingHumanDeliveryCapacity, 5)`.
  - If no source batch exists for the next round, or if the next round would be greater than 2, do not create rematch.
  - Replacement random-slot policy must follow PRD 8.5 exactly:
    - Look at the source batch's original random-slot delivery.
    - If that random-slot recipient has already answered, replacement slots are matched-only.
    - If that random-slot recipient has not answered, exactly one replacement slot is random and the rest are matched.
  - If remaining human capacity is less than 5 or answered deliveries in the source batch reduce the needed slots, create only that lower number.
  - If eligible users are scarce, create only non-duplicate eligible deliveries and log the shortfall.
  - Partial batches still follow PRD 8.5: one random only when the source batch random-slot recipient has not answered and `targetSize >= 1`; otherwise matched-only.
  - Never exceed 15 human deliveries and never deliver the same worry to the same user twice.
- [x] TODO-6.8 Snapshot fields: recipient gender/interests/helpedCount, author gender, matching categories, overlap count, selection type, batch ID/round/slot.
- [x] TODO-6.9 ActiveDeliveryCount source decision: `users/{uid}.activeDeliveryCount` is a transactionally maintained server-owned counter; query-based active delivery counting is not allowed as the production eligibility source.
- [x] TODO-6.10 ActiveDeliveryCount publication increment: initial publication checks selected recipients have `activeDeliveryCount < 10` inside the creation transaction and increments selected recipients exactly once.
- [x] TODO-6.11 ActiveDeliveryCount reply decrement: replying transitions an active delivery to `answered` and decrements the recipient's `activeDeliveryCount` exactly once.
- [x] TODO-6.12 ActiveDeliveryCount pass decrement: passing transitions an active delivery to `passed` and decrements the passer's `activeDeliveryCount` exactly once.
- [x] TODO-6.13 ActiveDeliveryCount rematch semantics: old active deliveries remain counted after additive rematch, rematch checks new recipients have `activeDeliveryCount < 10` inside the creation transaction, and rematch increments only newly created delivery recipients.
- [ ] TODO-6.14 ActiveDeliveryCount hidden decrement: hiding an active delivery decrements the recipient's `activeDeliveryCount` exactly once.
- [x] TODO-6.15 ActiveDeliveryCount non-decrement events: read marking, push failure, and additive rematch creation elsewhere do not decrement `activeDeliveryCount`.
- [x] TODO-6.16 ActiveDeliveryCount idempotency: deterministic delivery IDs, status preconditions, and transaction reads prevent double-increment and double-decrement on retry paths.
- [x] TODO-6.17 ActiveDeliveryCount rules protection: Firestore rules forbid all client writes to `activeDeliveryCount`.
- [x] TODO-6.18 Initial matching tests: exactly 5 initial deliveries, 4 matched + 1 random, fewer-than-5 failure with no partial writes, tie-breaks, active delivery limit, and initial redelivery prevention.
- [x] TODO-6.19 Rematch matching tests: duplicate-recipient exclusion, additive rematch cap 15, passed/answered exclusion, and PRD 8.5 random-slot behavior.
- [x] TODO-6.20 Counter tests for publication: publish increments selected recipients, rejects recipients with `activeDeliveryCount >= 10`, and does not change counters when fewer than 5 eligible recipients exist.
- [ ] TODO-6.21 Counter tests for reply/pass/hidden: answered, passed, and hidden active deliveries decrement exactly once.
- [x] TODO-6.22 Counter tests for rematch/idempotency: rematch increments only new recipients, read marking/push failure/additive rematch elsewhere do not decrement, and retries never double-increment or double-decrement.
- [x] TODO-6.23 Immediate pass replacement eligibility:
  - Replacement recipient must not be the passing user, worry author, any previous recipient of the same worry, any previous passer, any user who already replied, a deleted/inactive user, a user at `activeDeliveryCount >= 10`, a user who would exceed `worries.humanDeliveryLimit`, or any user excluded by normal matching policy.
  - Missing `deleted` is treated as not deleted until Phase 14 introduces the final deletion lifecycle.
  - If no eligible replacement exists, pass still succeeds, original delivery remains `passed`, no duplicate/self-redelivery is created, shortfall is logged, and the author receives no pass signal.
  - Evidence: `src/services/deliveries/firestoreRepository.test.ts` covers final transaction rechecks for candidates who become repliers after the broad scan, candidates who receive a same-worry delivery after the broad scan, all ranked candidates failing final recheck, read-before-write ordering, and cap exhaustion becoming true before transaction commit.
- [x] TODO-6.24 ActiveDeliveryCount immediate pass replacement semantics:
  - Replacement active delivery creation increments the replacement recipient's `activeDeliveryCount` exactly once.
  - Replacement delivery creation increments the worry's human delivery accounting exactly once when that accounting is stored separately from delivery docs.
  - If replacement succeeds, global net active count may remain unchanged: passer decremented once, replacement recipient incremented once.
  - If replacement shortfall occurs, only the passer decrement happens.
  - Repeated pass calls return the recorded result and never double-decrement or double-increment.
  - Evidence: `src/services/deliveries/firestoreRepository.test.ts` covers replacement success counters, shortfall counters, missing-passer-user retry idempotency, cap exhaustion, and malformed `humanDeliveryCount` fallback count derived inside the transaction.

## 7. Firestore Rules Final Design

- [x] TODO-7.1 Helper functions: `signedIn()`, `isSelf(uid)`, `isNotDeletedSelf()`, `isWorryAuthor(worryId)`, `isDeliveryRecipient(deliveryId)`, `deliveryIdFor(worryId, uid)`, `hasDeliveryForWorry(worryId)`. During transition, `isNotDeletedSelf()` treats missing `deleted` as not deleted and blocks only explicit `deleted === true`.
- [x] TODO-7.2 `users/{uid}`: own reads only; own safe profile field writes only; forbid `helpedCount`, `activeDeliveryCount`, `deleted`, example state, other-user access, and delete.
- [x] TODO-7.3 Rules tests must prove clients cannot create, update, or delete `activeDeliveryCount`; only server transactions may change it.
- [x] TODO-7.4 `users/{uid}/fcmTokens/{tokenId}`: own reads/writes/deletes during transition; server cleans invalid tokens.
- [x] TODO-7.5 Transition `worries/{worryId}` rules: reads only for author or recipient with matching delivery; writes server only; no public read.
- [x] TODO-7.6 Transition `deliveries/{deliveryId}` rules: recipient reads own delivery; author may read limited metadata if needed; writes server only.
- [x] TODO-7.7 Reply `replies/{replyId}` rules: reads for replier or worry author; writes server only.
- [x] TODO-7.8 Feedback `feedbacks/{feedbackId}` rules: publisher reads own feedback, replier reads only likes and like comments, and writes are server only.
- [ ] TODO-7.9 Admin/hidden rules: hidden/admin-only state is filtered in read models and denied by rules where possible.
- [x] TODO-7.10 Initial log rules: `moderationLogs` and `pushLogs` client reads/writes denied.
- [x] TODO-7.11 Rematch operational collection rules: `jobLocks` and `rematchRuns` client reads/writes denied when introduced.
- [x] TODO-7.12 AI fallback operational collection rules: `aiFallbackRuns` client reads/writes denied when introduced.
- [x] TODO-7.13 Example operational collection rules: `exampleWorrySeeds` and scheduled/example feedback jobs client reads/writes denied when introduced.
- [x] TODO-7.14 Legacy `letters` transition rules: deny worry create and delete while preserving only minimum legacy read/reply paths needed during migration.
- [ ] TODO-7.15 Legacy `letters` final rules: deny all runtime reads/writes/deletes or remove the match block after runtime code no longer depends on `letters`.
- [x] TODO-7.16 Firestore rules limitation:
  - Recipient reading worry via delivery existence is easiest with deterministic delivery IDs.
  - Do not store broad `recipientUids` on worry solely for rules unless needed; it risks leaking delivery audience and complicating updates.
  - Prefer delivery snapshots/read model for answer feed to reduce cross-document rules complexity.
- [x] TODO-7.17 Pass replacement operational collection rules: if `passReplacementAttempts` or an equivalent operation record is introduced, client reads/writes are denied when introduced.

## 8. Migration / Data Reset Strategy

- [x] TODO-8.1 Recommended plan: temporary read fallback then reset test data.
  - Why: current `letters` documents are duplicated per recipient and mix worries, replies, bot replies, feedback, and public worries; a perfect migration is more expensive than MVP data warrants.
  - Tradeoff: historical test data may be discarded or archived.
  - Affected files: `homeWorryFeed`, `replyMailbox`, migration/ops docs.
- [x] TODO-8.2 During transition: new worries write only to `worries`/`deliveries`; feed adapters read new data first and legacy `letters` second.
- [x] TODO-8.3 Avoid duplicate worries: if any backfill is attempted, exclude legacy `letters` with `publicationGroupId` known to have a matching `worries` doc; if no backfill, new publications should not duplicate.
- [ ] TODO-8.4 Remove old bot replies: stop `/api/schedule-bot-reply`; ignore/archive `letters` replies where `senderId` starts with `bot_`.
- [ ] TODO-8.5 Remove public worries: remove `receiverId === 'public'` inclusion; optionally export/delete legacy public test docs outside app runtime.
- [ ] TODO-8.6 Verify no legacy write path remains with `rg "collection\\([^)]*'letters'|doc\\([^)]*'letters'|letters" src server.ts firestore.rules`.

## 9. Test Plan

### Unit Policy Tests

- [x] TODO-9.1 Moderation normalization preserves raw/valid/invalid/matching categories.
- [x] TODO-9.2 Reason code mapping and high-risk help message.
- [x] TODO-9.3 Input validator trims, rejects empty, rejects >1000, allows short content.
- [x] TODO-9.4 Recipient selection exactly 5, 4 matched + 1 random, and returns a publish-blocking shortfall when fewer than 5 eligible recipients exist.
- [x] TODO-9.5 Active delivery `< 10`, author/deleted/existing-recipient exclusion, and missing `deleted` treated as not deleted.
- [x] TODO-9.6 Rematch additive batch sizing, PRD 8.5 random-slot replacement semantics, duplicate-recipient exclusion, and 15 cap.
- [x] TODO-9.7 Feedback visibility and helpedCount eligibility.

### Server Use-Case Tests

- [x] TODO-9.8 Publish rejected worry creates moderation log only.
- [x] TODO-9.9 Publish approved worry creates one worry, one Round 0 `deliveryBatches/{batchId}` with no source batch, and five Round 0 deliveries; fewer-than-5 eligible recipients fails with no partial state.
- [x] TODO-9.10 Worry publication push failure creates push log and does not roll back.
- [x] TODO-9.11 Reply publication push failure creates push log and does not roll back.
- [x] TODO-9.12 Feedback push failure creates push log and does not roll back.
- [x] TODO-9.13 Reply publication creates one reply and sets delivery answered.
- [x] TODO-9.14 Publish increments each selected recipient's `activeDeliveryCount` exactly once.
- [x] TODO-9.15 Reply transitions active delivery to answered and decrements recipient `activeDeliveryCount` exactly once.
- [x] TODO-9.16 Pass transitions own active delivery to passed, removes it from the passer's feed, decrements passer `activeDeliveryCount` exactly once, and exposes no pass signal to the author.
- [ ] TODO-9.17 Admin/system hide of an active delivery decrements recipient `activeDeliveryCount` exactly once.
- [x] TODO-9.18 Feedback creates deterministic doc and increments helpedCount once.
- [ ] TODO-9.19 Account deletion soft deletes and removes tokens.

### API Tests

- [x] TODO-9.20 Worry publication API rejects missing/invalid auth and ignores body-supplied uid.
- [x] TODO-9.21 Reply publication API rejects missing/invalid auth and ignores body-supplied uid.
- [x] TODO-9.22 Read-state APIs reject missing/invalid auth and ignore body-supplied uid.
- [x] TODO-9.23 Pass API rejects missing/invalid auth, ignores body-supplied uid, rejects passing someone else's delivery, and rejects answered/hidden non-passable deliveries.
- [x] TODO-9.24 Feedback API rejects missing/invalid auth and ignores body-supplied uid.
- [ ] TODO-9.25 Account deletion API rejects missing/invalid auth and ignores body-supplied uid.
- [ ] TODO-9.26 Deleted users are blocked from all user endpoints; users with a missing `deleted` field are not blocked before Phase 14.
- [ ] TODO-9.27 API responses use correct status/error shape for validation, ownership, conflicts, and provider failures.
- [x] TODO-9.28 Rematch internal job requires internal auth.
- [x] TODO-9.29 AI fallback internal job requires internal auth.
- [x] TODO-9.30 Example feedback internal job requires internal auth.

### Firestore Rules Tests

- [x] TODO-9.31 No client direct source-of-truth writes to worries/deliveries/initial batches/logs.
- [x] TODO-9.32 No client direct source-of-truth writes to replies.
- [x] TODO-9.33 No client direct source-of-truth writes to feedbacks.
- [x] TODO-9.34 No client direct source-of-truth writes to operational collections.
- [x] TODO-9.35 Own profile safe fields allowed; server-owned fields denied.
- [x] TODO-9.36 Client writes to `users/{uid}.activeDeliveryCount` are denied.
- [x] TODO-9.37 Recipient can read own delivery and allowed worry surface.
- [x] TODO-9.38 Non-recipient cannot read other delivery/worry.
- [x] TODO-9.39 Replier cannot read dislike feedback/comment.
- [ ] TODO-9.40 Legacy `letters` writes denied in final state.

### Read Model Tests

- [x] TODO-9.41 Active delivery appears in answer feed.
- [x] TODO-9.42 Answered deliveries are excluded from answer feed.
- [x] TODO-9.43 Passed deliveries are excluded from answer feed.
- [ ] TODO-9.44 Hidden deliveries are excluded from answer feed.
- [x] TODO-9.45 Existing active delivery remains visible and answerable after rematch creates additional deliveries.
- [x] TODO-9.46 My worries list includes own worries.
- [x] TODO-9.47 My worries list includes unread reply count after read state exists.
- [x] TODO-9.48 Replies written by me shown in My Page.
- [x] TODO-9.49 Disliked reply hidden from publisher but not deleted.
- [x] TODO-9.50 Read state private.

### Job / Idempotency Tests

- [x] TODO-9.51 Rematch job repeat does not duplicate deliveries.
- [x] TODO-9.52 Job lock prevents overlapping runs.
- [x] TODO-9.53 No same user redelivery for same worry.
- [x] TODO-9.54 Round 1 is created from Round 0 after 8 hours.
- [x] TODO-9.55 Round 2 is created from Round 1 after another 8 hours.
- [x] TODO-9.56 No Round 3 human rematch is created.
- [x] TODO-9.57 Historical earlier batches do not independently spawn extra branches.
- [x] TODO-9.58 Round 1 references Round 0 as source batch.
- [x] TODO-9.59 Round 2 references Round 1 as source batch.
- [x] TODO-9.60 Rematch creates additional deliveries without changing old delivery status.
- [x] TODO-9.61 PRD 8.5 random-slot policy is evaluated against the source batch, not the whole worry and not every historical batch.
- [x] TODO-9.62 Rematch creates matched-only replacements when the source batch's random-slot recipient has already answered.
- [x] TODO-9.63 Rematch creates exactly one random replacement when `targetSize >= 1` and the source batch's random-slot recipient has not answered.
- [x] TODO-9.64 A user who already received the worry is excluded from later batches.
- [x] TODO-9.65 Passed user is excluded from later batches.
- [x] TODO-9.66 Answered user is excluded from later batches.
- [x] TODO-9.67 Total human delivery count never exceeds 15.
- [x] TODO-9.68 Existing active deliveries from previous rounds remain answerable after later rounds are created.
- [x] TODO-9.69 `activeDeliveryCount` is not decremented merely because rematch occurred.
- [ ] TODO-9.70 `activeDeliveryCount` is decremented only on answered/passed/hidden.
- [x] TODO-9.71 Read marking and push failure do not decrement `activeDeliveryCount`.
- [x] TODO-9.72 Rematch increments `activeDeliveryCount` for newly created delivery recipients.
- [x] TODO-9.73 Publication/rematch reject recipients with `activeDeliveryCount >= 10` inside the creation transaction.
- [x] TODO-9.74 Publication retry paths do not double-increment `activeDeliveryCount`.
- [ ] TODO-9.75 Reply/pass/hide retry paths do not double-decrement `activeDeliveryCount`.
- [x] TODO-9.76 Rematch retry paths do not double-increment or double-decrement `activeDeliveryCount`.
- [x] TODO-9.77 AI fallback only when 24h, delivery cap exhausted, zero human replies, no existing AI.
- [x] TODO-9.78 AI fallback does not trigger if any human reply exists, including a reply submitted after 8 hours by an original recipient.
- [x] TODO-9.79 AI fallback does not require all original deliveries to expire, because they do not expire.
- [x] TODO-9.80 Example worries created once/max 5.
- [x] TODO-9.81 Example feedback delayed, no comment, helpedCount increments.
- [x] TODO-9.97 Pass replacement creates one immediate active delivery when an eligible user exists, with pass-replacement metadata and no Round 1/Round 2 rematch batch.
- [x] TODO-9.98 Pass replacement shortfall creates no replacement delivery, creates no duplicate/self-redelivery, logs the shortfall, and still leaves the original delivery passed.
- [x] TODO-9.99 Pass replacement excludes previous recipients, previous passers, repliers, deleted/inactive users, the author, the passer, and users excluded by normal matching policy.
- [x] TODO-9.100 Pass replacement counter behavior is correct for success and shortfall, and repeated pass calls do not double-decrement, double-increment, or create duplicate replacements.
- [x] TODO-9.101 Replacement-recipient push failure creates/logs a warning path and does not roll back the pass transition or replacement delivery creation.

### UI Integration / Manual Tests

- [x] TODO-9.82 First screen is `답변하기`.
- [x] TODO-9.83 Bottom tabs match PRD.
- [x] TODO-9.84 Worry write starts from `나의 고민`.
- [x] TODO-9.85 Moderation failure preserves draft and shows reason/help copy.
- [x] TODO-9.86 Happy path publish -> receive -> read.
- [x] TODO-9.87 Happy path reply -> author reads.
- [x] TODO-9.88 Happy path like.
- [x] TODO-9.89 Rejection path: unsafe worry not saved.
- [x] TODO-9.90 Rejection path: unsafe reply not saved.
- [x] TODO-9.91 Rejection path: unsafe feedback comment not saved.
- [x] TODO-9.92 Pass manual simulation, including immediate replacement success and no-eligible-recipient shortfall.
- [x] TODO-9.93 Additive rematch manual simulation, including old active deliveries remaining answerable.
- [x] TODO-9.94 AI fallback manual simulation, including old active deliveries remaining answerable.
- [ ] TODO-9.95 Notification permission granted/denied behavior.
- [ ] TODO-9.96 Account deletion blocks future activity.

## 10. Final Verification Checklist

- [ ] TODO-10.1 Run `npm test`.
- [ ] TODO-10.2 Run `npm run lint`.
- [ ] TODO-10.3 Run `npm run build`.
- [ ] TODO-10.4 Run Firestore rules tests. Recommended command to add: `npm run test:rules`.
- [ ] TODO-10.5 Manual happy paths: onboarding, example creation, publish worry, receive delivery, read, reply, author read, like.
- [ ] TODO-10.6 Manual rejection paths: empty/overlong worry/reply/comment and moderation rejection preserve draft.
- [ ] TODO-10.7 Manual pass/additive rematch/AI fallback simulations, including immediate pass replacement success, pass replacement shortfall, and original recipient answering after rematch.
- [ ] TODO-10.8 Security verification: no client source-of-truth writes, no other-user reads, deleted user blocked.
- [ ] TODO-10.9 Legacy path removal verification: no runtime `letters` writes, no public worry feed, old bot schedule endpoint removed, final rules deny `letters`.

## 11. Risk Register

- [x] TODO-11.1 Firestore rules complexity:
  - Risk: cross-document read checks are hard to reason about.
  - Mitigation: deterministic delivery IDs and delivery snapshots; rules tests for every read/write surface.
- [x] TODO-11.2 Race conditions around active delivery counts:
  - Risk: stale transaction reads or non-idempotent retry paths can exceed 10 or corrupt counters; additive rematch makes the counter more important because old active deliveries remain answerable.
  - Mitigation: transactionally maintained `activeDeliveryCount` from Slice 1, deterministic delivery IDs, status preconditions, and concurrency/idempotency tests. Query-based counts are not allowed as the production eligibility source.
- [x] TODO-11.3 Additive rematch can accumulate old active deliveries for inactive users:
  - Risk: answer feeds may grow toward the 10-active limit if users ignore worries.
  - Mitigation: enforce `activeDeliveryCount < 10`, provide pass UX, use optional ordering/aging UI for readability, but do not expire answerability unless the PRD changes.
- [x] TODO-11.4 Rematch scheduled job idempotency:
  - Risk: retries duplicate additive delivery batches.
  - Mitigation: job locks, deterministic delivery IDs, previous-recipient exclusion, status preconditions, idempotency tests.
- [x] TODO-11.5 Example scheduled job idempotency:
  - Risk: retries duplicate example likes.
  - Mitigation: deterministic jobs, per-user example state, status preconditions, and idempotency tests.
- [x] TODO-11.6 Rematch branching from historical batches:
  - Risk: if historical batches are scanned independently, rematch can over-create deliveries beyond the intended Round 0 -> Round 1 -> Round 2 flow.
  - Mitigation: required `deliveryBatches` with `sourceBatchId`/`sourceBatchRound`, job idempotency, tests for no branching, and max 15 cap.
- [x] TODO-11.7 AI fallback with late human replies:
  - Risk: fallback job may create AI after an original recipient answers late unless it checks current reply state at execution time.
  - Mitigation: query/transactionally verify zero human replies immediately before saving AI reply; disliked human replies still count as human replies.
- [ ] TODO-11.8 Legacy `letters` compatibility causing duplicate data:
  - Risk: users see both new and old versions.
  - Mitigation: one-way new writes, isolated fallback, reset strategy, Slice 16 hard removal.
- [ ] TODO-11.9 Notification failure ambiguity:
  - Risk: users think delivery failed when only push failed.
  - Mitigation: core transaction commits before push, pushLogs, UI success based on core state.
- [x] TODO-11.10 Moderation provider malformed responses:
  - Risk: unsafe or uncategorized content saved.
  - Mitigation: normalize strictly, retry once, fail closed with moderation log.
- [x] TODO-11.11 UI regressions due to `App.tsx` size:
  - Risk: navigation changes break unrelated flows.
  - Mitigation: extract feature components only around real screens/hooks; keep server behavior covered by tests.
- [ ] TODO-11.12 Test brittleness:
  - Risk: random matching and timestamps make flaky tests.
  - Mitigation: inject clock/random/id factories; test observable invariants.
- [x] TODO-11.13 Strict initial 5-recipient publication:
  - Risk: early MVP testing can fail to publish if the test pool has fewer than 5 eligible human recipients.
  - Mitigation: document seed/test-user requirements, return a clear server error, and verify no partial state is written on shortfall.

## 12. Output Requirements

- [x] TODO-12.1 This TODO is a single Markdown document at `docs/TODO.md`.
- [x] TODO-12.2 It is concrete and actionable.
- [x] TODO-12.3 It uses checkboxes and success criteria.
- [x] TODO-12.4 It does not implement code and does not claim tests pass.
- [x] TODO-12.5 It includes all deferred PRD slices.
- [x] TODO-12.6 It avoids unresolved `TBD`; where a decision is required, it recommends a default, explains why, states tradeoff, and lists affected files.
- [x] TODO-12.7 It uses deletion-test framing: new modules hide complexity behind small public interfaces, `App.tsx` does not own server policy, and tests focus on observable PRD invariants.
