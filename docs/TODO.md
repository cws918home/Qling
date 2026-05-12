# Qling PRD Full Implementation TODO

This document expands `docs/PRD.md` into a development-ready implementation plan based on the current codebase. It intentionally does not implement code. Every slice should be testable against observable PRD behavior, and every new module should own real policy rather than moving code from `src/App.tsx` into shallow wrappers.

Recommended default where this TODO makes a choice: prefer server-owned mutations, top-level PRD collections, query-backed read models during migration, and transactionally maintained counters only where PRD invariants need race protection.

## 0. Current Architecture Summary

- [ ] Current data model: `letters` is overloaded for both delivered worries (`type: 'worry'`) and replies (`type: 'reply'`). A worry publication creates multiple `letters` documents, one per receiver, instead of one canonical worry plus delivery documents.
- [ ] Current client-side Firestore writes exist in `src/App.tsx`, `src/services/worryPublication/adapters/firestore.ts`, `src/services/replyPublication/adapters.ts`, `src/services/replyFeedback/firestoreAdapters.ts`, `src/services/replyMailbox/production.ts`, and push token code. The browser can create/update/delete user-visible source-of-truth data.
- [ ] Current worry publication path: `src/App.tsx#publishWorry` calls `publishWorryWithProductionAdapters`, which uses `src/services/worryPublication/publishWorry.ts`. That runs client-side moderation via `/api/process-worry`, fetches active users from client Firestore, selects 3 recipients in `policy/recipientSelection.ts`, writes `letters` in `adapters/firestore.ts`, then calls notification/bot follow-ups.
- [ ] Current reply publication path: `src/App.tsx#sendReply` calls `publishReplyWithProductionAdapters`, which moderates through `/api/process-reply`, creates a `letters` reply document, then calls `/api/notify-new-reply`.
- [ ] Current feedback path: `src/App.tsx#giveFeedback` calls `submitReplyFeedbackWithProductionAdapters`, which updates `letters/{replyId}.feedback` and increments `users/{replierId}.helpedCount` from the client. Publisher comments are updated on the same `letters` reply through `publishPublisherComment`.
- [ ] Current home/answer feed path: `useHomeWorryFeed` queries all `letters` where `type == 'worry'`, then `selectVisibleHomeWorryFeed` includes `receiverId == profile.uid` and also legacy `receiverId == 'public'`.
- [ ] Current bot reply scheduling path: `server.ts` exposes `/api/schedule-bot-reply`, uses `setTimeout`, generates an AI-like reply after 4-8 minutes, writes a `letters` reply, and sends a push. This is not the PRD 24-hour AI fallback.
- [ ] Current Firestore rules weakness: `firestore.rules` allows every authenticated user to read/write/delete all `users` and all `letters`. There are no rules for `worries`, `deliveries`, `replies`, `feedbacks`, `moderationLogs`, or `pushLogs`.
- [ ] Current UI navigation mismatch with PRD: `App.tsx` uses views such as `home`, `write_worry`, `write_reply`, `inbox`, `my_replies`, `read_reply`, `read_my_reply`, and `settings`, with header inbox/settings affordances. PRD requires first screen `답변하기`, bottom tabs `답변하기 / 나의 고민 / 마이페이지`, worry writing from `나의 고민`, and More inside `마이페이지`.

## 1. Target PRD Architecture

- [ ] Worry publication mutation boundary is server-owned: browser submits to an authenticated endpoint, never supplies trusted `uid`, and no runtime PRD worry publication path writes `letters` or PRD source-of-truth collections directly from the client.
- [ ] Reply publication mutation boundary is server-owned: browser submits by delivery ID to an authenticated endpoint, stored reply ID is deterministic from delivery ID, and no runtime reply publication path creates `letters` replies.
- [ ] Read-state mutation boundary is server-owned: delivery and reply read markers are set only through authenticated endpoints and are not public read receipts.
- [ ] Pass mutation boundary is server-owned: pass status changes and `activeDeliveryCount` decrements happen only in an authenticated server transaction.
- [ ] Feedback mutation boundary is server-owned: like/dislike/comment writes and helpedCount changes happen only through an authenticated server transaction.
- [ ] Rematch job mutation boundary is server-owned: rematch runs are performed only by authenticated internal endpoints or server jobs.
- [ ] AI fallback job mutation boundary is server-owned: AI fallback runs are performed only by authenticated internal endpoints or server jobs.
- [ ] Example feedback job mutation boundary is server-owned: example creation and delayed example feedback are performed only by authenticated server endpoints or internal jobs.
- [ ] Account deletion mutation boundary is server-owned: delete requests use authenticated user identity, soft-delete the user, remove tokens, and block future user actions.
- [ ] Final source-of-truth mutation boundary is closed: after legacy removal, the browser cannot create or mutate `worries`, `deliveries`, `replies`, `feedbacks`, `moderationLogs`, `pushLogs`, operational job collections, or legacy `letters`.
- [ ] Answer feed read path reads active `deliveries` for the signed-in recipient plus enough worry display data, with any legacy fallback isolated behind an explicitly named adapter.
- [ ] My worries and reply mailbox read paths read `worries` authored by the signed-in user, `replies` for those worries, and replies written by the signed-in user, with legacy fallback isolated behind an explicitly named adapter.
- [ ] My page read path reads own profile, own written replies, and like/comment state visible to the replier.
- [ ] Temporary legacy read fallbacks are removed from runtime code.
- [ ] Firestore ownership for initial PRD collections is enforced: `worries`, `deliveries`, `moderationLogs`, `pushLogs`, and initial `deliveryBatches` are server-owned; clients keep only narrow profile/token writes and temporary legacy reads.
- [ ] Firestore ownership for replies is enforced: `replies` are server-owned and legacy reply write paths are not needed for PRD replies.
- [ ] Firestore ownership for feedback is enforced: `feedbacks` and helpedCount changes are server-owned.
- [ ] Firestore ownership for rematch operational collections is enforced.
- [ ] Firestore ownership for AI fallback operational collections is enforced.
- [ ] Firestore ownership for example operational collections is enforced.
- [ ] Final Firestore ownership is enforced: legacy `letters` runtime access is removed or fully denied.
- [ ] Server invariant for auth/deleted-user blocking is enforced for all user endpoints.
- [ ] Server invariant for worry content validation is enforced: trim, non-empty, max 1000.
- [ ] Server invariant for reply content validation is enforced: trim, non-empty, max 1000.
- [ ] Server invariant for feedback comment validation is enforced: trim, non-empty when submitted, max 1000.
- [ ] Server invariant for worry moderation is enforced before saving user-visible worries.
- [ ] Server invariant for reply moderation is enforced before saving user-visible replies.
- [ ] Server invariant for feedback comment moderation is enforced before saving user-visible feedback comments.
- [ ] Server invariant for AI reply moderation is enforced before saving AI replies.
- [ ] Server invariant for example reply moderation is enforced before saving example replies.
- [ ] Server invariant for category preservation is enforced for worry publication: raw, valid, invalid, and matching categories are stored.
- [ ] Server invariant for initial matching is enforced: exactly 5 initial human deliveries where possible, 4 matched plus 1 random.
- [ ] Server invariant for initial delivery active limit is enforced: selected initial recipients have `activeDeliveryCount < 10`.
- [ ] Server invariant for same-worry redelivery exclusion metadata is enforced when users pass or answer.
- [ ] Server invariant for rematch delivery limits is enforced: total human delivery cap `15`, active delivery limit `< 10`, and no redelivery of the same worry to the same user.
- [ ] Server invariant for one reply per delivery is enforced with deterministic reply IDs and idempotency/duplicate-content behavior.
- [ ] Server invariant for one immutable feedback per reply is enforced with deterministic feedback IDs and delayed like-comment rules.
- [ ] Server invariant for helpedCount is enforced: increments happen exactly once only for eligible human/example likes, and AI likes are excluded.
- [ ] Server invariant for pass idempotency is enforced by status preconditions.
- [ ] Server invariant for rematch job idempotency is enforced by deterministic IDs, job locks, and status preconditions.
- [ ] Server invariant for AI fallback idempotency is enforced by deterministic AI reply state and status preconditions.
- [ ] Server invariant for example job idempotency is enforced by per-user example state, deterministic jobs, and status preconditions.
- [ ] Server invariant for worry publication push failure is enforced: push failure never rolls back core worry publication.
- [ ] Server invariant for reply publication push failure is enforced: push failure never rolls back core reply publication.
- [ ] Server invariant for feedback push failure is enforced: push failure never rolls back core feedback mutation.
- [ ] Firestore rules invariant for initial PRD collections is enforced: clients cannot create/update/delete `worries`, `deliveries`, `moderationLogs`, `pushLogs`, or initial `deliveryBatches`.
- [ ] Firestore rules invariant for profile/token surfaces is enforced: users can read/write only narrow own profile fields and own push token docs during transition.
- [ ] Firestore rules invariant for replies is enforced: users can read only permitted reply surfaces and cannot write replies directly.
- [ ] Firestore rules invariant for feedback is enforced: publisher can read own feedback, replier can read only likes and like comments, and clients cannot write feedback directly.
- [ ] Firestore rules invariant for hidden/admin-only data is enforced: users cannot read moderation logs, push logs, operational logs, hidden content, or admin-only feedback comments.
- [ ] Firestore rules invariant for legacy removal is enforced: final rules deny legacy `letters` runtime reads/writes/deletes.
- [ ] `App.tsx` does not own matching, moderation interpretation, Firestore transaction rules, delivery status transitions, helpedCount changes, push dispatch, AI fallback, example scheduling, deletion blocking, or legacy migration decisions.
- [ ] `App.tsx` is limited to view composition plus calls to service hooks/API wrappers for PRD behavior.

### Architecture Safeguard: UI Extraction Before the Navigation Slice

- [ ] UI tab restructuring waits until Slice 11, but feature-level extraction is allowed earlier when it prevents `src/App.tsx` from growing worse.
- [ ] Allowed early extractions:
  - `AnswerFeed` component/hook.
  - `MyWorries` read hook.
  - `ReplyDetail` action hook.
  - API wrappers for server-owned mutation endpoints.
- [ ] Forbidden in UI code:
  - Matching policy.
  - Moderation interpretation.
  - Delivery status transition rules.
  - helpedCount or feedback invariants.
  - Thin pass-through components that add indirection without owning behavior.
- [ ] Extract only when it improves locality or testability. Do not move server policy into React components while waiting for the full tab restructure.

### Architecture Safeguard: Deep Modules and Interface Guardrails

- [ ] Do not create a new adapter/interface merely because a function call crosses a file boundary.
- [ ] Introduce a seam only when it hides an external dependency, enables deterministic tests, or owns a meaningful policy boundary.
- [ ] Prefer one deep module with a small public interface over many shallow wrappers.
- [ ] Apply deep-module guardrails to `worryPublication`, `moderation`, and `answerFeed`.
- [ ] Apply deep-module guardrails to `replyPublication`.
- [ ] Apply deep-module guardrails to `replyMailbox` / `myWorries`.
- [ ] Apply deep-module guardrails to `replyFeedback`.
- [ ] Apply deep-module guardrails to `pass` / `rematch`.
- [ ] Apply deep-module guardrails to `aiFallback`.
- [ ] Apply deep-module guardrails to `exampleWorries`.
- [ ] Apply deep-module guardrails to `userAccount`.
- [ ] Each slice includes a deletion test or equivalent observable-behavior removal check:
  - Deleting the new module removes a real PRD behavior.
  - Deleting a wrapper is not the only observable effect.
- [ ] Tests should focus on observable PRD behavior, not implementation details.

## 2. Final Firestore Data Model

Use server timestamps for all `createdAt`/`updatedAt` fields. Use `hiddenAt`/`hiddenReason` for DB-manual admin hiding; no admin UI is required.

### `users/{uid}`

- [ ] Core profile fields: `uid`, `gender: 'male' | 'female'`, `interests`, `helpedCount`, `activeDeliveryCount`, `createdAt`, `updatedAt`, `lastActive`, and profile activity fields (`lastSeenAt`).
- [ ] Example/onboarding fields: `onboardingCompletedAt`, `exampleWorriesCreatedAt`, `exampleWorrySeedIds`.
- [ ] Notification setting fields: `notificationPermission`, `isInstalledPWA`.
- [ ] Account deletion fields: `deleted`, `deletedAt`.
- [ ] Client-writable fields during transition: own `gender`, `interests`, `lastActive`, `notificationPermission`, `isInstalledPWA`.
- [ ] Server-owned fields: `helpedCount`, `activeDeliveryCount`, `deleted`, `deletedAt`, example creation state, and any counters.
- [ ] Source of truth: user profile and matching eligibility.
- [ ] Read access: own document only for clients; server can query all eligible users.
- [ ] Lifecycle: soft deleted only; content remains.
- [ ] Replaces legacy use: profile matching fields currently queried by the browser.

### `users/{uid}/fcmTokens/{tokenId}`

- [ ] Fields: `token`, `platform`, `userAgent`, `instanceId`, `notificationPermission`, `isInstalledPWA`, `createdAt`, `updatedAt`, `lastSeenAt`.
- [ ] Source of truth: push destinations for the user.
- [ ] Read/write access: own user during transition; invalid token deletion by server.
- [ ] Lifecycle: delete on invalid token or account deletion.

### `worries/{worryId}`

- [ ] Core publication fields: `authorUid`, `content`, `status: 'active'`, `rawCategories`, `validCategories`, `invalidCategories`, `matchingCategories`, `moderationLogId`, `initialDeliveryBatchId`, `initialDeliveryTargetCount: 5`, `humanDeliveryLimit: 15`, `humanDeliveryCount`, `humanReplyCount`, `hasHumanReply`, `createdAt`, `updatedAt`, `lastDeliveryCreatedAt`.
- [ ] Rematch metadata fields: `lastRematchRunId`, `lastRematchBatchId`, `lastRematchCreatedAt`.
- [ ] AI fallback fields: `hasAiReply`, `aiReplyId`, `aiFallbackCheckedAt`.
- [ ] Example fields: `isExample`, `exampleSeedId`, `exampleOwnerUid`.
- [ ] Hidden/deleted-author fields: `status: 'hidden' | 'deleted_author'`, `hiddenAt`, `hiddenReason`, `hiddenBy`.
- [ ] Source of truth: canonical worry content and moderation/category state.
- [ ] Read access: author can read; recipient reads via delivery/read model; no public board reads.
- [ ] Write access: server only.
- [ ] Lifecycle: immutable by users after publication; admin can hide by DB/manual server utility.
- [ ] Replaces legacy `letters` worry source-of-truth.

### `deliveries/{deliveryId}`

- [ ] Deterministic ID recommendation: `worryId_recipientUid`.
  - Recommended choice: use deterministic IDs.
  - Why: supports idempotency, prevents duplicate delivery to same user, and enables Firestore rules to prove a recipient may read a worry with `exists(/databases/$(database)/documents/deliveries/$(worryId + '_' + request.auth.uid))`.
  - Tradeoff: if Firestore rules string concatenation or ID length becomes awkward, keep deterministic IDs in code and denormalize feed display fields onto delivery docs.
  - Affected files: `src/services/worryPublication/serverPublication.ts`, `src/services/deliveries/*`, `firestore.rules`.
- [ ] Delivery status type:
  - `type DeliveryStatus = 'active' | 'answered' | 'passed' | 'hidden'`.
  - `active` means the recipient can answer.
  - 8-hour rematching does not change existing `active` deliveries.
  - `answered` means the recipient submitted a reply.
  - `passed` means the recipient explicitly passed.
  - `hidden` means admin/system hidden from user-visible surfaces.
  - Read state does not affect answerability.
  - Push failure does not affect answerability.
  - Do not include `rematched` as a normal terminal status. If a future admin/manual flow needs that concept, name and document it separately; normal 8-hour rematch is additive.
- [ ] Core delivery fields: `worryId`, `recipientUid`, `authorUid`, `status: 'active' | 'answered'`, `answeredAt`, `batchId`, `batchRound: 0`, `slotIndex`, `selectionType: 'matched' | 'random'`, `matchOverlapCount`, `matchCategoriesSnapshot`, `recipientInterestsSnapshot`, `recipientGenderSnapshot`, `recipientHelpedCountSnapshot`, `authorGenderSnapshot`, `isAiRecipient: false`, `createdAt`, `updatedAt`, `answerableUntil?: null`.
- [ ] Read-state field: `readAt`.
- [ ] Pass fields: `status: 'passed'`, `passedAt`.
- [ ] Rematch delivery fields: `batchRound: 1 | 2`, `rematchEligibleAfter`, `createdByRematchRunId`.
- [ ] Example delivery fields: `isExample`, `exampleSeedId`.
- [ ] Hidden delivery fields: `status: 'hidden'`, `hiddenAt`, `hiddenReason`.
- [ ] Source of truth: who may answer a worry and answer feed state.
- [ ] Read access: recipient can read own delivery; author may read delivery metadata without read receipts exposed in UI.
- [ ] Write access: server only.
- [ ] Lifecycle: statuses are monotonic except admin hide; `active` transitions only to `answered`, `passed`, or `hidden`. Rematch creates additional deliveries to other users and records batch/run metadata; it does not revoke answerability for existing active deliveries.
- [ ] Replaces legacy per-recipient worry `letters`.

### `replies/{replyId}`

- [ ] Deterministic ID recommendation: `deliveryId`, so one reply per delivery is enforced by create-if-absent.
- [ ] Core human reply fields: `deliveryId`, `worryId`, `authorUid`, `replierUid`, `content`, `status: 'active'`, `moderationLogId`, `createdAt`, `updatedAt`.
- [ ] Reply read-state field: `readByAuthorAt`.
- [ ] Feedback summary fields: `feedbackType`, `likedAt`, `dislikedAt`.
- [ ] AI/example reply fields: `isAiGenerated`, `isExampleReply`.
- [ ] Hidden reply fields: `status: 'hidden'`, `hiddenAt`, `hiddenReason`.
- [ ] Source of truth: final answer content.
- [ ] Read access: replier can read own replies; worry author can read replies to own worries except disliked replies hidden from publisher UI/read model.
- [ ] Write access: server only.
- [ ] Lifecycle: immutable by users; admin can hide.
- [ ] Replaces legacy `letters` replies.

### `feedbacks/{feedbackId}`

- [ ] Deterministic feedback ID policy: `feedbacks/{replyId}`.
  - Recommended choice: allow one later `comment` update only for `type == 'like'` when no comment exists.
  - Why: PRD allows delayed like comments but immutable like/dislike choice.
  - Tradeoff: feedback creation and like-comment update need separate server branches.
  - Affected files: `src/services/replyFeedback/*`, `server.ts`, `firestore.rules`.
- [ ] Fields: `replyId`, `worryId`, `deliveryId`, `publisherUid`, `replierUid`, `type: 'like' | 'dislike'`, `comment`, `commentVisibility: 'replier' | 'admin_only' | 'none'`, `commentModerationLogId`, `helpedCountApplied`, `isForAiReply`, `isForExampleReply`, `createdAt`, `updatedAt`.
- [ ] Source of truth: immutable like/dislike choice and optional moderated comment.
- [ ] Read access: publisher can read own feedback; replier can read likes and like comments only; dislike and dislike comments are admin-only.
- [ ] Write access: server only.
- [ ] Lifecycle: no cancel/change. Like comment may be added later once if absent; dislike comment cannot be added later after leaving.
- [ ] Replaces `letters.feedback` and `letters.publisherComment`.

### `moderationLogs/{logId}`

- [ ] Worry moderation log fields: `targetType: 'worry'`, `targetId`, `uid`, `originalContent`, `status: 'approved' | 'rejected' | 'invalid_provider_response' | 'provider_error'`, `reasonCode`, `userMessage`, `helpMessage`, `rawProviderResponse`, `rawCategories`, `validCategories`, `invalidCategories`, `matchingCategories`, `provider`, `model`, `createdAt`, `updatedAt`.
- [ ] Reply moderation log fields: `targetType: 'reply'` plus common moderation fields.
- [ ] Feedback comment moderation log fields: `targetType: 'feedback_comment'` plus common moderation fields.
- [ ] AI reply moderation log fields: `targetType: 'ai_reply'` plus common moderation fields.
- [ ] Example reply moderation log fields: `targetType: 'example_reply'` plus common moderation fields.
- [ ] Reason codes: `abuse_hate_profanity`, `sexual`, `self_harm_suicide`, `crime_violence_victim`, `personal_info`, `spam_promotion`, `empty`, `too_long`, `provider_invalid`.
- [ ] Source of truth: filtering and category audit.
- [ ] Read/write access: server/admin only.
- [ ] Lifecycle: permanent operational log.

### `pushLogs/{pushLogId}`

- [ ] New-worry push log fields: `kind: 'new_worry'`, `targetUid`, `sourceId`, `sourceType: 'worry' | 'delivery'`, `status: 'sent' | 'failed' | 'skipped_no_token'`, `tokenDocId`, `tokenSummary`, `errorCode`, `errorMessage`, `createdAt`.
- [ ] New-reply push log fields: `kind: 'new_reply'` plus common push log fields.
- [ ] Reply-liked push log fields: `kind: 'reply_liked'`, `sourceType: 'reply' | 'feedback'`, plus common push log fields.
- [ ] Push hardening status fields: `status: 'invalid_token_deleted' | 'skipped_deleted_user'`.
- [ ] Source of truth: push attempt audit.
- [ ] Read/write access: server/admin only.
- [ ] Lifecycle: operational log; optional TTL later.

### Optional Operational Collections

- [ ] `jobLocks/{jobName}`: `ownerId`, `lockedUntil`, `lastStartedAt`, `lastCompletedAt`, `updatedAt`; server only; prevents overlapping jobs.
- [ ] `rematchRuns/{runId}`: `startedAt`, `completedAt`, `status`, `dueCount`, `processedCount`, `createdDeliveryCount`, `error`; server/admin only.
- [ ] `deliveryBatches/{batchId}`:
  - Required for rematch correctness once Slice 8 is implemented.
  - Fields: `worryId`, `batchRound: 0 | 1 | 2`, `sourceBatchId?: string`, `sourceBatchRound?: 0 | 1`, `createdByRunId?: string`, `createdAt`, `targetCount`, `createdCount`, `matchedCount`, `randomCount`, `reason: 'initial' | 'rematch_timeout'`.
  - Round 0 batch is the initial 5-delivery batch and has no source batch.
  - Round 1 batch references Round 0 as `sourceBatchId`/`sourceBatchRound`.
  - Round 2 batch references Round 1 as `sourceBatchId`/`sourceBatchRound`.
  - The source batch is the relevant 5-slot batch used for PRD 8.5 random-slot replacement semantics.
  - Do not use batch lineage to expire old deliveries.
- [ ] `aiFallbackRuns/{runId}`: `startedAt`, `completedAt`, `status`, `checkedCount`, `createdReplyCount`, `error`; server/admin only.
- [ ] `exampleWorrySeeds/{seedId}`: `content`, `categories`, `status`, `createdAt`, `updatedAt`; server/admin write, server read.
- [ ] `scheduledJobs/{jobId}` or `exampleFeedbackJobs/{jobId}`: `kind`, `runAfter`, `status`, `replyId`, `targetUid`, `attempts`, `createdAt`, `updatedAt`; server only.

## 3. API Surface

All error responses should use `{ error: { code: string, message: string, details?: unknown } }`. Use `401` for missing/invalid auth, `403` for deleted/blocked users or ownership failures, `400` for validation, `404` for inaccessible targets, `409` for immutable/idempotency conflicts, and `500/502` for server/provider failures.

### Auth Middleware

- [ ] Create `src/server/auth.ts` or `src/services/userAccount/serverAuth.ts`.
- [ ] `requireFirebaseAuth` verifies `Authorization: Bearer <idToken>` with Firebase Admin Auth, attaches authenticated `uid`, never trusts `uid` from request body, and rejects `users/{uid}.deleted == true` for app activity.
- [ ] Tests: missing bearer, invalid token, body `uid` ignored, deleted user blocked.

### Worry Publication: `POST /api/worries/publish`

- [ ] Request body: `{ content: string }`.
- [ ] Auth: signed-in, not deleted, onboarded.
- [ ] Server validation: trim, non-empty, max 1000.
- [ ] Transaction boundary: moderation may run before transaction; transaction creates moderation log, worry, the initial Round 0 `deliveryBatches/{batchId}`, exactly 5 Round 0 deliveries, checks each selected recipient still has `activeDeliveryCount < 10`, increments each recipient's `activeDeliveryCount`, stores the Round 0 batch ID on `worries.initialDeliveryBatchId`, and fails without partial writes if any selected recipient no longer qualifies; push happens after commit; push logs happen after attempts.
- [ ] Response: `200 { status: 'published', worryId, deliveryIds, moderationLogId }` or `200 { status: 'rejected', reasonCode, userMessage, helpMessage?, moderationLogId }`.
- [ ] Idempotency: optional `Idempotency-Key`; if not implemented in Slice 1, document duplicate submissions as possible and keep UI submit disabled while pending.
- [ ] Tests: auth, validation, rejected moderation creates no worry/deliveries/batch, approved creates a Round 0 batch plus exactly 5 deliveries with 4/1 selection, push failure warning/log only.

### Answer Feed Read State: `POST /api/deliveries/:deliveryId/read`

- [ ] Request body: `{}`.
- [ ] Auth: signed-in delivery recipient, not deleted.
- [ ] Validation: delivery exists, `recipientUid == auth.uid`, not hidden.
- [ ] Transaction: if `readAt` absent, set `readAt` and `updatedAt`; no-op if already read.
- [ ] Response: `200 { status: 'read', deliveryId, readAt }`.
- [ ] Idempotency: repeat calls return current read state.
- [ ] Tests: recipient only, no author read receipt surface, idempotent.

### Pass: `POST /api/deliveries/:deliveryId/pass`

- [ ] Request body: `{}`.
- [ ] Auth: signed-in delivery recipient, not deleted.
- [ ] Validation: delivery exists and status is `active`; recommended default is examples may be passed and disappear but do not trigger rematch.
- [ ] Transaction: if delivery is still `active`, set `status: 'passed'`, `passedAt`, decrement recipient `activeDeliveryCount` exactly once, and write pass/rematch metadata.
- [ ] Response: `200 { status: 'passed', deliveryId }`.
- [ ] Idempotency: already passed returns `200`; answered or hidden returns `409`.
- [ ] Tests: active only, immediate feed removal, same user not redelivered, author not notified.

### Reply Publication: `POST /api/deliveries/:deliveryId/replies`

- [ ] Request body: `{ content: string }`.
- [ ] Auth: signed-in delivery recipient, not deleted.
- [ ] Validation: trim non-empty max 1000, active delivery, no existing `replies/{deliveryId}`.
- [ ] Transaction: moderation before transaction; create moderation log and `replies/{deliveryId}`; if delivery is still `active`, set delivery `answered`, increment worry human reply state for human replies, and decrement recipient `activeDeliveryCount` exactly once.
- [ ] Response: `200 { status: 'published', replyId }` or `200 { status: 'rejected', reasonCode, userMessage, helpMessage?, moderationLogId }`.
- [ ] Idempotency: deterministic reply ID makes duplicate create return existing success if content same; otherwise `409`.
- [ ] Tests: one reply per delivery, ownership, status transition, moderation rejection, best-effort push to author.

### My Worries Replies Read State: `POST /api/worries/:worryId/replies/read`

- [ ] Request body: `{ replyIds?: string[] }`; default marks all currently active replies to that worry.
- [ ] Auth: signed-in worry author, not deleted.
- [ ] Validation: worry exists and `authorUid == auth.uid`.
- [ ] Transaction/batch: set `readByAuthorAt` on unread visible replies existing at request time.
- [ ] Response: `200 { status: 'read', worryId, markedCount }`.
- [ ] Idempotency: repeat calls no-op.
- [ ] Tests: author only, later new replies remain unread, read state not visible to repliers.

### Feedback: `POST /api/replies/:replyId/feedback`

- [ ] Request body: `{ type: 'like' | 'dislike', comment?: string }`.
- [ ] Auth: signed-in worry author/publisher, not deleted.
- [ ] Validation: reply exists, reply belongs to publisher's worry, no existing feedback unless adding a first like comment under the allowed delayed-comment rule, comment trim/max 1000, comment moderation when present.
- [ ] Transaction: create `feedbacks/{replyId}`, set reply feedback summary, increment `users/{replierUid}.helpedCount` exactly once for eligible human likes, hide disliked reply from publisher read model.
- [ ] Response: `200 { status: 'saved', feedbackId, helpedCountApplied }`.
- [ ] Idempotency: same feedback repeat returns existing; different type returns `409`; delayed like comment update allowed once if no prior comment.
- [ ] Tests: one feedback, AI like excluded from helpedCount, dislike hidden, comments visibility, like push only.

### Account Deletion: `POST /api/users/me/delete`

- [ ] Request body: `{ confirm: true }`.
- [ ] Auth: signed-in user.
- [ ] Validation: confirmation required.
- [ ] Transaction/batch: set `users/{uid}.deleted = true`, `deletedAt`, `updatedAt`; remove push tokens; keep existing content.
- [ ] Response: `200 { status: 'deleted' }`.
- [ ] Idempotency: already deleted returns `200`.
- [ ] Tests: tokens removed, future endpoints blocked, matching excludes deleted, existing content preserved.

### Internal Jobs

- [ ] `POST /api/internal/rematch-due-deliveries`: internal auth; body `{ now?: string, dryRun?: boolean, limit?: number }`; scan worries/deliveries where fewer than enough human replies have arrived and additional delivery capacity remains; create additive delivery batches for new recipients; never change old active deliveries merely because 8 hours passed; cap total human deliveries at 15; use job lock and deterministic IDs.
- [ ] `POST /api/internal/create-ai-fallbacks`: internal auth; body `{ now?: string, dryRun?: boolean, limit?: number }`; create one moderated AI reply only after 24h, human delivery limit exhausted, zero human replies, and no existing AI reply.
- [ ] `POST /api/internal/create-example-feedbacks`: internal auth; body `{ now?: string, limit?: number }`; processes delayed example likes after 5-15 minutes.
- [ ] Seed/admin utility endpoint: avoid unless strictly necessary. Recommended default is seed `exampleWorrySeeds` by script/manual Firebase import, not public API.
- [ ] Tests: internal auth, dry run where supported, idempotent repeated calls, exact condition matrices.

## 4. Server Modules and File-Level Plan

### `worryPublication`

- [ ] Purpose: publish a moderated worry and create initial deliveries.
- [ ] Public interface: `publishWorryOnServer({ authorUid, content, idempotencyKey? })`.
- [ ] Internal dependencies: moderation, recipient selection, Firestore Admin adapter, push service, clock/id factory.
- [ ] Files to create/update: `src/services/worryPublication/serverPublication.ts`, `serverFirestore.ts`, `policy/recipientSelection.ts`, `adapters/http.ts`, `productionFactory.ts`, `types.ts`, `packages/domain/src/index.ts`, `server.ts`.
- [ ] Tests: `serverPublication.test.ts`, recipient selection tests, production factory tests, publish API tests.
- [ ] Deletion test: deleting `serverPublication.ts` and route binding removes all PRD publication behavior; client cannot recreate it through Firestore.

### `moderation`

- [ ] Purpose: normalize provider output, map reason codes/messages, preserve category evidence.
- [ ] Public interface: `moderateWorry`, `moderateReply`, `moderateFeedbackComment`, `moderateAiReply`, `normalizeWorryModeration`.
- [ ] Files: `src/services/moderation/normalize.ts`, `src/server/moderationResponses.ts`, optional `reasonCodes.ts`, provider prompts in `server.ts`.
- [ ] Tests: normalization, server response processing, malformed provider responses, high-risk help message.
- [ ] Deletion test: removing moderation module should make APIs fail closed, not save unmoderated content.

### `homeWorryFeed` / `answerFeed`

- [ ] Purpose: client read model for `답변하기`.
- [ ] Public interface: `useAnswerFeed({ user })` returns deliveries joined with worry display fields.
- [ ] Files: update or rename `src/services/homeWorryFeed/*`; create `src/services/answerFeed/*` if clearer; keep temporary `legacyLettersFallback.ts`.
- [ ] Tests: active deliveries, hidden/answered/passed exclusions, additive rematch leaves old active deliveries visible and answerable, legacy fallback isolation.
- [ ] Deletion test: deleting legacy fallback does not affect new delivery feed.

### `replyPublication`

- [ ] Purpose: create exactly one moderated reply for a delivery.
- [ ] Public interface: `publishReplyForDelivery({ replierUid, deliveryId, content })`.
- [ ] Files: `src/services/replyPublication/serverPublication.ts`, `serverFirestore.ts`, `adapters.ts`, `productionFactory.ts`, `server.ts`.
- [ ] Tests: one reply per delivery, delivery answered transaction, no `letters` creation.
- [ ] Deletion test: deleting module removes reply mutation API; client cannot write replies directly.

### `replyFeedback`

- [ ] Purpose: one immutable feedback per reply and helpedCount transaction.
- [ ] Public interface: `submitReplyFeedbackOnServer({ publisherUid, replyId, type, comment? })`.
- [ ] Files: `src/services/replyFeedback/serverFeedback.ts`, `serverFirestore.ts`, `submitReplyFeedback.ts`, `types.ts`, `production.ts`, `firestoreAdapters.ts`.
- [ ] Tests: deterministic ID, like/dislike behavior, comments visibility, push policy.
- [ ] Deletion test: deleting server feedback module removes feedback mutation; helpedCount cannot be changed from client.

### `replyMailbox` / `myWorries`

- [ ] Purpose: show worries authored by me, replies received for my worries, and replies written by me.
- [ ] Public interface: `useMyWorries`, `useRepliesForWorry`, `useMyGivenReplies`.
- [ ] Files: `src/services/replyMailbox/*`, new `src/services/myWorries/*`, `src/App.tsx` decomposition.
- [ ] Tests: authored worries, received replies, own written replies, and isolated legacy fallback behavior.
- [ ] Read-state extension: unread counts and unread emphasis are added by Slice 5 after read APIs exist.
- [ ] Feedback/admin extension: disliked and hidden filtering is completed by Slice 7 and Slice 15 after feedback and admin hiding exist.
- [ ] Deletion test: legacy mailbox deletion does not remove PRD mailbox behavior.

### `pass` / `rematch`

- [ ] Purpose: user pass and internal additive delivery job.
- [ ] Public interfaces: `passDelivery({ uid, deliveryId })`, `rematchDueDeliveries({ now, limit })`.
- [ ] Files: `src/services/deliveries/passDelivery.ts`, `src/services/rematch/rematchDueDeliveries.ts`, `src/services/rematch/policy.ts`, `server.ts`.
- [ ] Tests: delivery transitions, no redelivery, job idempotency, counters.
- [ ] Deletion test: deleting rematch module stops additive delivery batches without affecting reply publication or existing recipients' ability to answer.

### `aiFallback`

- [ ] Purpose: create one moderated AI reply only when PRD conditions are exactly met.
- [ ] Public interface: `createAiFallbacks({ now, limit })`.
- [ ] Files: `src/services/aiFallback/createAiFallbacks.ts`, `generateAiReply.ts`, `server.ts`.
- [ ] Tests: 24h, delivery cap exhausted, zero human replies, no duplicate AI.
- [ ] Deletion test: deleting module disables only fallback, not human replies.

### `exampleWorries`

- [ ] Purpose: seed up to 5 onboarding example deliveries and delayed likes.
- [ ] Public interfaces: `createExamplesForUser({ uid })`, `createDueExampleFeedbacks({ now })`.
- [ ] Files: `src/services/exampleWorries/createExamplesForUser.ts`, `seedAdapter.ts`, `createExampleFeedbacks.ts`, onboarding path in `server.ts` or profile API.
- [ ] Tests: once/max 5/interest selection/no UI label/delayed like.
- [ ] Deletion test: deleting examples leaves real delivery feed intact.

### `userAccount`

- [ ] Purpose: profile writes, activity blocking, soft deletion, push token cleanup.
- [ ] Public interfaces: `updateMyProfile`, `deleteMyAccount`, `assertActiveUser`.
- [ ] Files: `src/services/userAccount/*`, `src/services/pushRegistration/*`, `server.ts`.
- [ ] Tests: soft delete, matching exclusion, endpoint blocking.
- [ ] Deletion test: account deletion is isolated from content modules.

## 5. Implementation Slices

### Slice 1: Server-owned worry publication

- [ ] Goal: publish worry through authenticated server endpoint, preserving moderation/category evidence and creating the initial Round 0 delivery batch plus exactly 5 initial deliveries.
- [ ] Files to inspect: `docs/PRD.md`, `src/App.tsx`, `server.ts`, `firestore.rules`, `packages/domain/src/index.ts`, `src/services/worryPublication/*`, `src/services/homeWorryFeed/*`, `src/services/moderation/*`, `src/server/moderationResponses.ts`.
- [ ] Files to modify/create: server publication and Firestore Admin adapter under `src/services/worryPublication`, `server.ts` auth and `POST /api/worries/publish`, client wrapper in `adapters/http.ts`, production factory, home/answer feed, domain match types.
- [ ] Data model changes: add `worries`, `deliveries`, required `deliveryBatches` for Round 0 lineage, `moderationLogs`, `pushLogs`; keep legacy `letters`.
- [ ] API changes: new publish endpoint; `/api/process-worry`, `/api/notify-new-worry`, and `/api/schedule-bot-reply` become legacy/internal-to-be-removed paths.
- [ ] UI/read-path changes: `App.tsx#publishWorry` calls endpoint and shows `고민이 전달되었어요!`; answer feed reads new deliveries first with temporary `letters` fallback.
- [ ] Firestore rules dependency: runtime app code no longer performs PRD worry publication through direct Firestore writes in this slice; full Firestore rules denial for new PRD collections is completed in Slice 2.
- [ ] Tests: moderation normalization, recipient selection exactly 5 and 4/1, server publication transaction creates `deliveryBatches/{batchId}` with `batchRound: 0` and no source batch, API auth/body validation, feed read model with fallback.
- [ ] Manual verification: publish worry; verify one `worries` doc, five `deliveries`, one moderation log, push logs; recipient sees delivery without push permission.
- [ ] Explicit non-goals: no reply migration, no pass/rematch/AI/examples, no bottom-tab rebuild.
- [ ] Deletion test: if server publish route/module is removed, browser cannot publish PRD worries by direct Firestore writes.

### Slice 2: Firestore rules first hardening

- [ ] Goal: stop new client-created PRD source-of-truth data and reduce legacy blast radius.
- [ ] Modify: `firestore.rules`; add rules tests.
- [ ] Rules changes: deny client create/update/delete for PRD collections; deny `letters` worry creation; deny `letters` delete immediately; narrow `users` read/write; preserve only necessary temporary `letters` reply paths.
- [ ] Tests: direct write denial, own profile allowed, other user denied, legacy delete denied.
- [ ] Manual verification: app still loads and can use first-slice publish path.
- [ ] Explicit non-goals: final `letters` denial waits until Slice 16.
- [ ] Deletion test: removing legacy rules should fail only legacy tests, not PRD source-of-truth tests.

### Slice 3: Reply migration

- [ ] Goal: replies are created by server only; the API remains `POST /api/deliveries/:deliveryId/replies`, and the stored reply document ID is deterministic from `deliveryId` so one reply per delivery is enforceable.
- [ ] Files: `src/services/replyPublication/*`, `src/services/moderation/*`, `server.ts`, `src/App.tsx`, answer detail components.
- [ ] Data/API: add `POST /api/deliveries/:deliveryId/replies`.
- [ ] Transaction: create moderation log and `replies/{deliveryId}`, set delivery answered, update worry human reply state and counters.
- [ ] UI/read path: answer detail submits by delivery ID, not legacy worry letter ID.
- [ ] Rules: deny client reply creation; preserve legacy reply read fallback until Slice 4.
- [ ] Tests: moderation, deterministic reply ID, one reply per delivery, duplicate same-content idempotency, different-content duplicate rejection, answered status, notify author best-effort, no edit/delete, no writes to `letters`.
- [ ] Manual verification: recipient answers once; second attempt blocked; author gets new reply signal.
- [ ] Explicit non-goals: feedback migration, full my-worries UI.
- [ ] Deletion test: no `letters` reply creation path remains after this slice.

### Slice 4: My worries and reply mailbox migration

- [ ] Goal: PRD read models replace `letters` mailbox/inbox concepts.
- [ ] Files: `src/services/replyMailbox/*`, new `src/services/myWorries/*`, `src/App.tsx`.
- [ ] Data model: read `worries` by `authorUid` and `replies` by `worryId`/`replierUid`; do not require feedback summaries before Slice 7.
- [ ] UI/read path: my worries list, replies received, and replies written by me; unread reply emphasis waits for Slice 5, disliked filtering waits for Slice 7, and admin hidden filtering waits for Slice 15.
- [ ] Legacy fallback removal strategy: read both new `replies` and old `letters` replies behind one adapter, then remove fallback in Slice 16.
- [ ] Tests: my worries list, replies received, replies written, and legacy fallback isolation.
- [ ] Manual verification: author sees new replies; replier sees own written reply.
- [ ] Explicit non-goals: bottom tab redesign can wait until Slice 11.
- [ ] Deletion test: removing `letters` fallback leaves new replies visible.

### Slice 5: Read state

- [ ] Goal: private read emphasis for deliveries and replies.
- [ ] Files: `src/services/deliveries/readDelivery.ts`, `src/services/myWorries/markRepliesRead.ts`, feed/mailbox hooks, `server.ts`.
- [ ] API: `POST /api/deliveries/:deliveryId/read`, `POST /api/worries/:worryId/replies/read`.
- [ ] Data: `deliveries.readAt`, `replies.readByAuthorAt`.
- [ ] UI: answer tab emphasizes unread deliveries; my worries emphasizes unread replies; no "read by other party" copy.
- [ ] Rules: clients cannot set read fields directly.
- [ ] Tests: idempotency, ownership, later replies remain unread, read state private.
- [ ] Manual verification: opening detail removes own emphasis only.
- [ ] Explicit non-goals: public read receipts.
- [ ] Deletion test: removing read-state modules removes emphasis updates but not core publish/reply.

### Slice 6: Pass

- [ ] Goal: users can pass active deliveries and never receive the same worry again.
- [ ] Files: new `src/services/deliveries/passDelivery.ts`, answer feed UI, `server.ts`.
- [ ] API: `POST /api/deliveries/:deliveryId/pass`.
- [ ] Data: delivery status `passed`, `passedAt`, pass included in same-worry redelivery exclusion metadata and human delivery accounting.
- [ ] UI: left swipe or clear button in answer feed; immediate local removal after success.
- [ ] Rules: server-only status update.
- [ ] Tests: active only, ownership, feed removal, same worry recipient exclusion for rematch, idempotency.
- [ ] Manual verification: pass disappears; author sees no pass signal.
- [ ] Explicit non-goals: pass does not create immediate replacement deliveries; additive batch creation is handled only by Slice 8 rematch job.
- [ ] Deletion test: deleting pass module removes pass action; matching exclusion tests fail if pass history is ignored.

### Slice 7: Feedback migration

- [ ] Goal: feedback lives in `feedbacks/{replyId}` with immutable like/dislike semantics.
- [ ] Files: `src/services/replyFeedback/*`, `server.ts`, my worries reply UI, my page liked-comment UI.
- [ ] API: `POST /api/replies/:replyId/feedback`.
- [ ] Data: deterministic feedback doc, reply summary fields, helpedCount transaction.
- [ ] Rules: deny direct feedback/helpedCount writes.
- [ ] Tests: one-time immutable feedback, deterministic ID, AI reply like excluded, example like included, dislike hides reply, comment visibility, no comment push, like push only.
- [ ] Manual verification: like increments count once; dislike hides; comments visibility correct.
- [ ] Explicit non-goals: feedback cancellation/change.
- [ ] Deletion test: deleting feedback module removes all ways to mutate feedback/helpedCount.

### Slice 8: Rematch job

- [ ] Goal: additive 8-hour rematch creates more delivery opportunities without expiring existing active deliveries.
- [ ] Files: `src/services/rematch/*`, `src/services/worryPublication/policy/recipientSelection.ts`, `server.ts`.
- [ ] API/job: `POST /api/internal/rematch-due-deliveries`.
- [ ] Data: `rematchRuns`, `jobLocks`, required `deliveryBatches/{batchId}` lineage, new delivery batch IDs/rounds, and worry metadata such as `lastRematchRunId`, `lastRematchBatchId`, `lastRematchCreatedAt`.
- [ ] Semantics:
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
  - Tradeoff: late answers from old recipients can make final human reply count exceed 5, but this preserves the PRD rule that old recipients remain answerable.
  - Read state and push failures do not affect answerability.
  - Existing recipients are excluded from future delivery batches for the same worry.
  - Passed users are excluded from future delivery batches for the same worry.
  - Answered users are already associated with the worry and must not receive duplicate delivery.
  - Never exceed `worries.humanDeliveryLimit == 15` total human deliveries across all batches.
- [ ] Rematch batch sizing:
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
- [ ] ActiveDeliveryCount strategy: `users/{uid}.activeDeliveryCount` is a required transactionally maintained server-owned counter from Slice 1. Rematch must check each selected new recipient still has `activeDeliveryCount < 10` inside the same transaction that creates deliveries, increment new recipients exactly once, and never decrement old recipients merely because additive rematch created deliveries elsewhere.
- [ ] Tests: due selection, additive old-delivery behavior, partial/full batch random rules, exclusions, cap, idempotency, job lock, counter correctness.
- [ ] Manual verification: simulate timestamps and run job twice; old recipients can still answer after new deliveries are created.
- [ ] Explicit non-goals: AI fallback creation.
- [ ] Deletion test: deleting rematch job leaves pass/reply working but no additive delivery batches.

### Slice 9: AI fallback

- [ ] Goal: one moderated AI reply only under exact 24-hour no-human-reply condition.
- [ ] Files: `src/services/aiFallback/*`, `src/services/moderation/*`, `server.ts`.
- [ ] API/job: `POST /api/internal/create-ai-fallbacks`.
- [ ] Conditions: 24h since worry creation, human delivery limit exhausted, zero human replies stored, disliked human replies still count as human replies, no existing AI reply.
- [ ] Late human replies: AI fallback must check current `worries.humanReplyCount`/`replies` at job time. A human reply submitted after 8 hours by an original recipient still blocks AI fallback because original deliveries do not expire.
- [ ] AI fallback does not require original deliveries to expire; they do not expire under the PRD.
- [ ] Data/UI: `replies.isAiGenerated`, `worries.hasAiReply`, `aiReplyId`, moderation log; AI reply looks like normal reply with no label.
- [ ] Tests: condition matrix, moderation before save, no duplicates, notify author.
- [ ] Manual verification: simulate no replies after 24h; verify one AI reply.
- [ ] Explicit non-goals: professional counseling copy.
- [ ] Deletion test: deleting AI fallback affects only no-reply fallback.

### Slice 10: Example worries

- [ ] Goal: onboarding creates up to 5 realistic example deliveries once.
- [ ] Files: `src/services/exampleWorries/*`, onboarding/profile code, answer feed, internal job route.
- [ ] Data: `exampleWorrySeeds`, `worries.isExample`, `deliveries.isExample`, scheduled example feedback jobs.
- [ ] Behavior: seeds selected by interests, max 5, created once, no UI example label, reply moderation, auto like after 5-15 minutes, no auto comment, helpedCount increases.
- [ ] Tests: once/max 5, interest selection, no later additions on interest edit, delayed like, helpedCount.
- [ ] Manual verification: new user completes onboarding and sees example worries.
- [ ] Explicit non-goals: admin seed UI.
- [ ] Deletion test: removing example module leaves real deliveries unaffected.

### Slice 11: UI navigation PRD alignment

- [ ] Goal: UI matches PRD navigation and removes public-board impression.
- [ ] Files: `src/App.tsx`; create components under `src/components` or feature folders only when reducing real complexity.
- [ ] UI changes: first screen `답변하기`; bottom tabs `답변하기`, `나의 고민`, `마이페이지`; worry writing entry from `나의 고민`; decompose current inbox/settings/home concepts; More menu in My Page with notifications, guide, policy, logout, delete account; remove public-board-looking UI.
- [ ] Tests/manual: authenticated first route, mobile bottom tabs, worry write entry, logout/delete account access.
- [ ] Explicit non-goals: new visual brand overhaul unless needed for PRD clarity.
- [ ] Deletion test: feature hooks own data behavior; UI components can be reorganized without changing server invariants.

### Slice 12: Input validation and copy

- [ ] Goal: common validation and PRD moderation copy.
- [ ] Files: create `src/services/validation/content.ts`; update publish/reply/feedback APIs and UI forms.
- [ ] Rules: trim, non-empty, max 1000; remove current/implicit min 10 constraints if any exist.
- [ ] Copy: moderation failure reason messages, high-risk help message, preserve drafts on failure.
- [ ] Tests: validator unit tests, API validation, draft preservation UI/manual tests.
- [ ] Explicit non-goals: rich text.
- [ ] Deletion test: removing validator should cause API tests to fail across worry/reply/comment.

### Slice 13: Notifications

- [ ] Goal: PRD notification kinds only, with durable logs.
- [ ] Files: extract `server.ts` push helper to `src/services/notifications/*`, update `src/services/pushRegistration/*`, service worker files.
- [ ] Kinds: new worry, new reply, reply liked.
- [ ] Exclusions: no comment notification, no dislike notification.
- [ ] Behavior: invalid token cleanup; push failure logs and does not roll back core state; foreground duplication policy documented and tested where possible.
- [ ] Tests: pushLogs statuses, invalid token deletion, no rollback, no comment push.
- [ ] Manual verification: grant/deny notification permission, trigger each kind.
- [ ] Explicit non-goals: notification settings beyond PRD.
- [ ] Deletion test: deleting notification service leaves core mutations passing with push warnings/logs.

### Slice 14: Account deletion and inactive users

- [ ] Goal: soft delete and block future activity.
- [ ] Files: `src/services/userAccount/*`, `server.ts`, My Page UI.
- [ ] Data/API: `POST /api/users/me/delete`, `users.deleted`, push token cleanup.
- [ ] Behavior: keep existing content, exclude from matching and notifications, block app activity.
- [ ] Rules: deleted users cannot write profile/token docs if rules can detect deleted state.
- [ ] Tests: deletion idempotency, endpoint block, matching exclusion, token removal.
- [ ] Manual verification: deleted account cannot publish/reply/pass/feedback.
- [ ] Explicit non-goals: physical data erasure.
- [ ] Deletion test: removing userAccount module leaves no supported deletion path.

### Slice 15: Admin hiding and internal logs

- [ ] Goal: DB-manual hiding and operational audit coverage.
- [ ] Fields: `status: 'hidden'`, `hiddenAt`, `hiddenReason`, `hiddenBy` on worries/replies/deliveries.
- [ ] Read models: exclude hidden content everywhere.
- [ ] Logs: moderation, matching, pass, rematch, push, AI, example runs.
- [ ] Files: read model filters, rules, services that write logs.
- [ ] Tests: hidden worries/replies excluded, logs created for major paths.
- [ ] Manual verification: manually hide a worry/reply in Firestore and refresh UI.
- [ ] Explicit non-goals: full admin UI.
- [ ] Deletion test: hiding filters are centralized in read model policies, not scattered through view markup.

### Slice 16: Legacy `letters` removal

- [ ] Goal: remove old data model and close rules.
- [ ] Remove: `receiverId === 'public'`, `deleteLetter`, `letters` worry fallback, `letters` reply fallback, old bot schedule endpoint, old comment notification endpoint, client Firestore adapters that create/update `letters`.
- [ ] Rules: deny all `letters` reads/writes/deletes or remove match block.
- [ ] Tests: no imports/reference to `letters` outside migration tests; final rules hardening.
- [ ] Manual verification: app works with only PRD collections.
- [ ] Explicit non-goals: historical data migration if reset strategy is chosen.
- [ ] Deletion test: `rg "letters"` should show only documented archival/migration notes or zero runtime references.

### Slice 17: Documentation and operational setup

- [ ] Goal: operational docs match final PRD implementation.
- [ ] Update: `docs/matching_algorithm.md`, `README.md` or `docs/ops.md`, `.env` documentation for Firebase Admin/provider/internal job secret, local test commands, emulator/rules test setup, deploy notes for scheduled jobs.
- [ ] Tests/checks: docs mention all internal endpoints and required env vars.
- [ ] Explicit non-goals: broad product docs beyond implementation needs.
- [ ] Deletion test: a developer can implement/deploy using PRD + codebase + this TODO + ops docs.

## 6. Matching Policy Detail

- [ ] Candidate eligibility: user exists, not author, not deleted, not inactive if `lastActive` remains a product signal, valid `gender`, valid `interests`, active delivery count `< 10`, has not already received this worry, push token not required.
- [ ] Ranking for matched slots: category overlap desc, `helpedCount` desc, same gender as author first, random tie-break after those.
- [ ] Random slot: same eligibility constraints, ignores overlap/helpedCount/gender ranking, no duplicate with matched slots.
- [ ] Fallback if fewer than 5 eligible users:
  - Recommended choice: fail publication with a clear server error during Slice 1.
  - Why: preserves the exact 5-delivery invariant and keeps tests strict.
  - Tradeoff: small test/user pools may be unable to publish until enough users exist.
  - Affected files: recipient selection tests and server publication error handling.
- [ ] Rematch exclusions: author, deleted users, users with `activeDeliveryCount >= 10`, all previous recipients for same worry, passed users, answered users; respect total 15 human delivery cap.
- [ ] Rematch batch sizing:
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
- [ ] Snapshot fields: recipient gender/interests/helpedCount, author gender, matching categories, overlap count, selection type, batch ID/round/slot.
- [ ] ActiveDeliveryCount strategy:
  - Implementation decision: `users/{uid}.activeDeliveryCount` must be a transactionally maintained server-owned counter from Slice 1.
  - Query-based active delivery counting is not allowed as the production eligibility source.
  - `activeDeliveryCount` counts all active deliveries that remain answerable, including old deliveries after additive rematch.
  - Publication and rematch must check each selected recipient has `activeDeliveryCount < 10` inside the same transaction that creates the delivery.
  - Creating a new active delivery increments the recipient's `activeDeliveryCount` exactly once in that transaction.
  - Transitioning an active delivery to `answered`, `passed`, or `hidden` decrements the recipient's `activeDeliveryCount` exactly once.
  - Read marking, push failure, and additive rematch creation elsewhere do not decrement it.
  - Idempotent retry paths must not double-increment or double-decrement; use deterministic delivery IDs, status preconditions, and transaction reads.
  - Firestore rules must forbid all client writes to `activeDeliveryCount`.
  - Affected files: `users` model, publication/pass/reply/rematch/admin-hide transactions, Firestore rules, Firestore indexes.
- [ ] Tests: exactly 5 initial deliveries, 4 matched + 1 random, tie-breaks, active delivery limit, redelivery prevention, additive rematch cap 15, active count decrements only on answered/passed/hidden.
- [ ] Counter tests: publish increments selected recipients, rematch increments only new recipients, limit rejects recipients at `activeDeliveryCount >= 10`, read marking/push failure/additive rematch elsewhere do not decrement, and idempotent retries never double-increment or double-decrement.

## 7. Firestore Rules Final Design

- [ ] Helper functions: `signedIn()`, `isSelf(uid)`, `isNotDeletedSelf()`, `isWorryAuthor(worryId)`, `isDeliveryRecipient(deliveryId)`, `deliveryIdFor(worryId, uid)`, `hasDeliveryForWorry(worryId)`.
- [ ] `users/{uid}`: own reads only; own safe profile field writes only; forbid `helpedCount`, `activeDeliveryCount`, `deleted`, example state, other-user access, and delete.
- [ ] Rules tests must prove clients cannot create, update, or delete `activeDeliveryCount`; only server transactions may change it.
- [ ] `users/{uid}/fcmTokens/{tokenId}`: own reads/writes/deletes during transition; server cleans invalid tokens.
- [ ] Transition `worries/{worryId}` rules: reads only for author or recipient with matching delivery; writes server only; no public read.
- [ ] Transition `deliveries/{deliveryId}` rules: recipient reads own delivery; author may read limited metadata if needed; writes server only.
- [ ] Reply `replies/{replyId}` rules: reads for replier or worry author; writes server only.
- [ ] Feedback `feedbacks/{feedbackId}` rules: publisher reads own feedback, replier reads only likes and like comments, and writes are server only.
- [ ] Admin/hidden rules: hidden/admin-only state is filtered in read models and denied by rules where possible.
- [ ] Initial log rules: `moderationLogs` and `pushLogs` client reads/writes denied.
- [ ] Operational collection rules: job locks, rematch runs, AI fallback runs, example seeds, and scheduled/example feedback jobs client reads/writes denied when introduced.
- [ ] Legacy `letters` transition rules: deny worry create and delete while preserving only minimum legacy read/reply paths needed during migration.
- [ ] Legacy `letters` final rules: deny all runtime reads/writes/deletes or remove the match block after runtime code no longer depends on `letters`.
- [ ] Firestore rules limitation:
  - Recipient reading worry via delivery existence is easiest with deterministic delivery IDs.
  - Do not store broad `recipientUids` on worry solely for rules unless needed; it risks leaking delivery audience and complicating updates.
  - Prefer delivery snapshots/read model for answer feed to reduce cross-document rules complexity.

## 8. Migration / Data Reset Strategy

- [ ] Recommended plan: temporary read fallback then reset test data.
  - Why: current `letters` documents are duplicated per recipient and mix worries, replies, bot replies, feedback, and public worries; a perfect migration is more expensive than MVP data warrants.
  - Tradeoff: historical test data may be discarded or archived.
  - Affected files: `homeWorryFeed`, `replyMailbox`, migration/ops docs.
- [ ] During transition: new worries write only to `worries`/`deliveries`; feed adapters read new data first and legacy `letters` second.
- [ ] Avoid duplicate worries: if any backfill is attempted, exclude legacy `letters` with `publicationGroupId` known to have a matching `worries` doc; if no backfill, new publications should not duplicate.
- [ ] Remove old bot replies: stop `/api/schedule-bot-reply`; ignore/archive `letters` replies where `senderId` starts with `bot_`.
- [ ] Remove public worries: remove `receiverId === 'public'` inclusion; optionally export/delete legacy public test docs outside app runtime.
- [ ] Verify no legacy write path remains with `rg "collection\\([^)]*'letters'|doc\\([^)]*'letters'|letters" src server.ts firestore.rules`.

## 9. Test Plan

### Unit Policy Tests

- [ ] Moderation normalization preserves raw/valid/invalid/matching categories.
- [ ] Reason code mapping and high-risk help message.
- [ ] Input validator trims, rejects empty, rejects >1000, allows short content.
- [ ] Recipient selection exactly 5, 4 matched + 1 random.
- [ ] Active delivery `< 10`, author/deleted/existing-recipient exclusion.
- [ ] Rematch additive batch sizing, PRD 8.5 random-slot replacement semantics, duplicate-recipient exclusion, and 15 cap.
- [ ] Feedback visibility and helpedCount eligibility.

### Server Use-Case Tests

- [ ] Publish rejected worry creates moderation log only.
- [ ] Publish approved worry creates one worry, one Round 0 `deliveryBatches/{batchId}` with no source batch, and five Round 0 deliveries.
- [ ] Push failure creates push log and does not roll back.
- [ ] Reply publication creates one reply and sets delivery answered.
- [ ] Publish increments each selected recipient's `activeDeliveryCount` exactly once.
- [ ] Reply transitions active delivery to answered and decrements recipient `activeDeliveryCount` exactly once.
- [ ] Pass transitions active delivery to passed and decrements recipient `activeDeliveryCount` exactly once.
- [ ] Admin/system hide of an active delivery decrements recipient `activeDeliveryCount` exactly once.
- [ ] Feedback creates deterministic doc and increments helpedCount once.
- [ ] Account deletion soft deletes and removes tokens.

### API Tests

- [ ] Every user endpoint rejects missing/invalid auth.
- [ ] Every endpoint ignores body-supplied uid.
- [ ] Deleted users blocked.
- [ ] Correct status/error shape for validation, ownership, conflicts.
- [ ] Internal jobs require internal auth.

### Firestore Rules Tests

- [ ] No client direct source-of-truth writes to worries/deliveries/replies/feedbacks/logs.
- [ ] Own profile safe fields allowed; server-owned fields denied.
- [ ] Client writes to `users/{uid}.activeDeliveryCount` are denied.
- [ ] Recipient can read own delivery and allowed worry surface.
- [ ] Non-recipient cannot read other delivery/worry.
- [ ] Replier cannot read dislike feedback/comment.
- [ ] Legacy `letters` writes denied in final state.

### Read Model Tests

- [ ] Active delivery appears in answer feed.
- [ ] Answered/passed/hidden deliveries are excluded.
- [ ] Existing active delivery remains visible and answerable after rematch creates additional deliveries.
- [ ] My worries list includes own worries and unread reply count.
- [ ] Replies written by me shown in My Page.
- [ ] Disliked reply hidden from publisher but not deleted.
- [ ] Read state private.

### Job / Idempotency Tests

- [ ] Rematch job repeat does not duplicate deliveries.
- [ ] Job lock prevents overlapping runs.
- [ ] No same user redelivery for same worry.
- [ ] Round 1 is created from Round 0 after 8 hours.
- [ ] Round 2 is created from Round 1 after another 8 hours.
- [ ] No Round 3 human rematch is created.
- [ ] Historical earlier batches do not independently spawn extra branches.
- [ ] Round 1 references Round 0 as source batch.
- [ ] Round 2 references Round 1 as source batch.
- [ ] Rematch creates additional deliveries without changing old delivery status.
- [ ] PRD 8.5 random-slot policy is evaluated against the source batch, not the whole worry and not every historical batch.
- [ ] Rematch creates matched-only replacements when the source batch's random-slot recipient has already answered.
- [ ] Rematch creates exactly one random replacement when `targetSize >= 1` and the source batch's random-slot recipient has not answered.
- [ ] A user who already received the worry is excluded from later batches.
- [ ] Passed user is excluded from later batches.
- [ ] Answered user is excluded from later batches.
- [ ] Total human delivery count never exceeds 15.
- [ ] Existing active deliveries from previous rounds remain answerable after later rounds are created.
- [ ] `activeDeliveryCount` is not decremented merely because rematch occurred.
- [ ] `activeDeliveryCount` is decremented only on answered/passed/hidden.
- [ ] Read marking and push failure do not decrement `activeDeliveryCount`.
- [ ] Rematch increments `activeDeliveryCount` for newly created delivery recipients.
- [ ] Publication/rematch reject recipients with `activeDeliveryCount >= 10` inside the creation transaction.
- [ ] Idempotent retry paths do not double-increment or double-decrement `activeDeliveryCount`.
- [ ] AI fallback only when 24h, delivery cap exhausted, zero human replies, no existing AI.
- [ ] AI fallback does not trigger if any human reply exists, including a reply submitted after 8 hours by an original recipient.
- [ ] AI fallback does not require all original deliveries to expire, because they do not expire.
- [ ] Example worries created once/max 5.
- [ ] Example feedback delayed, no comment, helpedCount increments.

### UI Integration / Manual Tests

- [ ] First screen is `답변하기`.
- [ ] Bottom tabs match PRD.
- [ ] Worry write starts from `나의 고민`.
- [ ] Moderation failure preserves draft and shows reason/help copy.
- [ ] Happy path: publish -> receive -> read -> reply -> author reads -> like.
- [ ] Rejection path: unsafe worry/reply/comment not saved.
- [ ] Pass/additive rematch/AI fallback simulations, including old active deliveries remaining answerable.
- [ ] Notification permission granted/denied behavior.
- [ ] Account deletion blocks future activity.

## 10. Final Verification Checklist

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run Firestore rules tests. Recommended command to add: `npm run test:rules`.
- [ ] Manual happy paths: onboarding, example creation, publish worry, receive delivery, read, reply, author read, like.
- [ ] Manual rejection paths: empty/overlong worry/reply/comment and moderation rejection preserve draft.
- [ ] Manual pass/additive rematch/AI fallback simulations, including original recipient answering after rematch.
- [ ] Security verification: no client source-of-truth writes, no other-user reads, deleted user blocked.
- [ ] Legacy path removal verification: no runtime `letters` writes, no public worry feed, old bot schedule endpoint removed, final rules deny `letters`.

## 11. Risk Register

- [ ] Firestore rules complexity:
  - Risk: cross-document read checks are hard to reason about.
  - Mitigation: deterministic delivery IDs and delivery snapshots; rules tests for every read/write surface.
- [ ] Race conditions around active delivery counts:
  - Risk: stale transaction reads or non-idempotent retry paths can exceed 10 or corrupt counters; additive rematch makes the counter more important because old active deliveries remain answerable.
  - Mitigation: transactionally maintained `activeDeliveryCount` from Slice 1, deterministic delivery IDs, status preconditions, and concurrency/idempotency tests. Query-based counts are not allowed as the production eligibility source.
- [ ] Additive rematch can accumulate old active deliveries for inactive users:
  - Risk: answer feeds may grow toward the 10-active limit if users ignore worries.
  - Mitigation: enforce `activeDeliveryCount < 10`, provide pass UX, use optional ordering/aging UI for readability, but do not expire answerability unless the PRD changes.
- [ ] Rematch scheduled job idempotency:
  - Risk: retries duplicate additive delivery batches.
  - Mitigation: job locks, deterministic delivery IDs, previous-recipient exclusion, status preconditions, idempotency tests.
- [ ] Example scheduled job idempotency:
  - Risk: retries duplicate example likes.
  - Mitigation: deterministic jobs, per-user example state, status preconditions, and idempotency tests.
- [ ] Rematch branching from historical batches:
  - Risk: if historical batches are scanned independently, rematch can over-create deliveries beyond the intended Round 0 -> Round 1 -> Round 2 flow.
  - Mitigation: required `deliveryBatches` with `sourceBatchId`/`sourceBatchRound`, job idempotency, tests for no branching, and max 15 cap.
- [ ] AI fallback with late human replies:
  - Risk: fallback job may create AI after an original recipient answers late unless it checks current reply state at execution time.
  - Mitigation: query/transactionally verify zero human replies immediately before saving AI reply; disliked human replies still count as human replies.
- [ ] Legacy `letters` compatibility causing duplicate data:
  - Risk: users see both new and old versions.
  - Mitigation: one-way new writes, isolated fallback, reset strategy, Slice 16 hard removal.
- [ ] Notification failure ambiguity:
  - Risk: users think delivery failed when only push failed.
  - Mitigation: core transaction commits before push, pushLogs, UI success based on core state.
- [ ] Moderation provider malformed responses:
  - Risk: unsafe or uncategorized content saved.
  - Mitigation: normalize strictly, retry once, fail closed with moderation log.
- [ ] UI regressions due to `App.tsx` size:
  - Risk: navigation changes break unrelated flows.
  - Mitigation: extract feature components only around real screens/hooks; keep server behavior covered by tests.
- [ ] Test brittleness:
  - Risk: random matching and timestamps make flaky tests.
  - Mitigation: inject clock/random/id factories; test observable invariants.

## 12. Output Requirements

- [ ] This TODO is a single Markdown document at `docs/TODO.md`.
- [ ] It is concrete and actionable.
- [ ] It uses checkboxes and success criteria.
- [ ] It does not implement code and does not claim tests pass.
- [ ] It includes all deferred PRD slices.
- [ ] It avoids unresolved `TBD`; where a decision is required, it recommends a default, explains why, states tradeoff, and lists affected files.
- [ ] It uses deletion-test framing: new modules hide complexity behind small public interfaces, `App.tsx` does not own server policy, and tests focus on observable PRD invariants.
