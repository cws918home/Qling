# Qling PRD Alignment Phase Plan

This is the executable implementation plan for bringing the current codebase into alignment with `docs/PRD.md`.

- Product baseline: `docs/PRD.md`
- Implementation checklist: `docs/TODO.md`
- Execution order and checkbox ownership: this file

A developer should be able to work phase-by-phase using only these three documents. Each TODO checkbox is owned by exactly one phase in this plan. Do not check a TODO item until the owning phase's verification criteria pass.

## Phase Rules

- Complete phases in order.
- A phase may only check TODO items that are fully implemented and verified by the end of that phase.
- Transition rules are not final rules. Final legacy denial is completed only in Phase 16.
- Runtime behavior and Firestore security are separate verification surfaces. For example, Phase 1 removes runtime direct Firestore worry publication, while Phase 2 proves Firestore rules deny direct client writes.
- Final verification in Phase 18 only closes the final checklist.

## Phase 0: Baseline Confirmation

### Goal

Confirm the starting point and planning artifacts before changing runtime behavior.

### Work

- Read `docs/PRD.md` and `docs/TODO.md`.
- Confirm the documented current architecture mismatches still describe the codebase.
- Confirm the TODO document is a concrete, actionable checklist and does not claim implementation has already passed.

### TODO Checkboxes Completed In This Phase

- `## 0. Current Architecture Summary`: all checkboxes.
- `## 8. Migration / Data Reset Strategy`: `Recommended plan: temporary read fallback then reset test data`.
- `## 12. Output Requirements`: all checkboxes.

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
- Create the auth middleware needed by this endpoint, including deleted-user blocking for this endpoint.
- Move runtime worry publication out of client Firestore writes.
- Add shared server validation for worry content: trim, non-empty, max 1000.
- Normalize moderation/category output and preserve raw/valid/invalid/matching categories.
- Create one `worries/{worryId}`, one Round 0 `deliveryBatches/{batchId}`, five `deliveries/{deliveryId}` where possible, one moderation log, and best-effort push logs.
- Maintain `activeDeliveryCount` transactionally for initial delivery recipients.
- Add answer-feed read model for active PRD deliveries with an explicitly named legacy `letters` fallback.
- Add new-worry notification support needed by publication; push failure must not roll back the core transaction.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: worry publication mutation boundary; answer feed read path; worry content validation; worry moderation; category preservation; initial matching; initial delivery active limit; worry publication push failure; `App.tsx` excludes matching/moderation/transaction/push policy for worry publication.
- `### Architecture Safeguard: UI Extraction Before the Navigation Slice`: all checkboxes.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to `worryPublication`, `moderation`, and `answerFeed`; slice deletion test; observable tests for this slice.
- `## 2. Final Firestore Data Model`: `worries/{worryId}` core publication fields, source of truth, read/write access, lifecycle, and legacy replacement; `deliveries/{deliveryId}` deterministic ID recommendation, status type, core delivery fields, source of truth, write access, lifecycle, and replacement of legacy per-recipient worry letters; `moderationLogs/{logId}` worry moderation log fields, reason codes, source of truth, access, and lifecycle; `pushLogs/{pushLogId}` new-worry push log fields, source of truth, access, and lifecycle; `deliveryBatches/{batchId}` Round 0 fields.
- `## 3. API Surface`: Auth Middleware; Worry Publication endpoint.
- `## 4. Server Modules and File-Level Plan`: `worryPublication`; `moderation` for worry moderation/category normalization; `homeWorryFeed / answerFeed` items needed for active PRD deliveries and fallback isolation.
- `## 5. Implementation Slices`: `Slice 1: Server-owned worry publication`, except its Firestore rules denial is completed in Phase 2.
- `## 6. Matching Policy Detail`: candidate eligibility for initial publication; ranking; random slot; fewer-than-5 fallback; snapshot fields; initial activeDeliveryCount strategy for publication; initial matching tests and publication counter tests.
- `## 8. Migration / Data Reset Strategy`: `During transition`; `Avoid duplicate worries`.
- `## 9. Test Plan`: moderation normalization; recipient selection; active delivery eligibility for initial publication; publish rejected/approved tests; push failure does not roll back for worry publication; publish increments activeDeliveryCount; publish API auth/body validation; active delivery appears in answer feed.
- `## 11. Risk Register`: moderation provider malformed responses; notification failure ambiguity for new-worry publication; test brittleness mitigations for initial matching.

### Verification Criteria

- Happy path creates one worry, one Round 0 batch, and five delivery docs with 4 matched plus 1 random recipient where enough eligible users exist.
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
- Keep only required temporary legacy `letters` read/reply paths.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: Firestore ownership for initial PRD collections; Firestore rules invariant for initial PRD collections; Firestore rules invariant for profile/token surfaces.
- `## 5. Implementation Slices`: `Slice 2: Firestore rules first hardening`.
- `## 7. Firestore Rules Final Design`: helper functions needed for transition; `users/{uid}`; activeDeliveryCount rules test; `users/{uid}/fcmTokens/{tokenId}` transition access; transition `worries/{worryId}` rules; transition `deliveries/{deliveryId}` rules; initial log rules; legacy `letters` transition rules; Firestore rules limitation notes.
- `## 9. Test Plan`: rules tests for direct write denial to worries/deliveries/logs; own profile safe fields; server-owned fields denied; activeDeliveryCount client write denied; recipient can read own delivery and allowed worry surface; non-recipient cannot read other delivery/worry.
- `## 11. Risk Register`: Firestore rules complexity for initial PRD collections.

### Verification Criteria

- App still loads and uses the Phase 1 publish path.
- Rules tests prove clients cannot directly create/update/delete `worries`, `deliveries`, initial `deliveryBatches`, `moderationLogs`, or `pushLogs`.
- Rules tests prove users can write only narrow own profile/token fields and cannot mutate `helpedCount`, `activeDeliveryCount`, `deleted`, or other server-owned fields.

### Explicit Non-Goals / Deferred Work

- Reply, feedback, operational job, hidden/admin, and final `letters` rules are completed when those collections or behaviors become real.

## Phase 3: Server-Owned Reply Publication

### Goal

Create exactly one moderated reply per delivery through a server endpoint.

### Work

- Implement `POST /api/deliveries/:deliveryId/replies`.
- The API path uses `deliveryId`; the stored reply document ID is deterministic from the delivery ID, usually `replies/{deliveryId}`; the response may still return `replyId`.
- Add shared server validation for reply content: trim, non-empty, max 1000.
- Moderate replies before saving.
- In one transaction, create the moderation log and reply, set delivery status to `answered`, update worry human reply state, and decrement `activeDeliveryCount` exactly once.
- Add new-reply notification support; push failure must not roll back the reply transaction.
- Add reply Firestore rules.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: reply publication mutation boundary; Firestore ownership for replies; reply content validation; reply moderation; same-worry redelivery exclusion metadata for answered deliveries; one reply per delivery; reply publication push failure; Firestore rules invariant for replies; `App.tsx` excludes reply transaction/push policy.
- `## 2. Final Firestore Data Model`: `replies/{replyId}` deterministic ID recommendation, core human reply fields, source of truth, write access, lifecycle, and replacement of legacy `letters` replies; reply moderation log fields.
- `## 3. API Surface`: Reply Publication endpoint.
- `## 4. Server Modules and File-Level Plan`: `replyPublication`.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to `replyPublication`.
- `## 5. Implementation Slices`: `Slice 3: Reply migration`.
- `## 7. Firestore Rules Final Design`: Reply `replies/{replyId}` rules.
- `## 9. Test Plan`: reply publication creates one reply and sets delivery answered; reply decrements activeDeliveryCount exactly once; reply API validation/ownership/conflict tests; no runtime writes to `letters`; new-reply push failure does not roll back.

### Verification Criteria

- A recipient can reply once to an active delivery.
- Repeating the same submitted content can return the existing deterministic reply success; submitting different content for the same delivery returns `409`.
- Answered or hidden deliveries cannot receive a new reply.
- No runtime PRD reply path creates a `letters` reply.
- Rules tests prove the browser cannot create or mutate `replies` directly.

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
- Keep any legacy `letters` reply fallback isolated behind an explicitly named adapter.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: my worries and reply mailbox read paths.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to `replyMailbox` / `myWorries`.
- `## 4. Server Modules and File-Level Plan`: `replyMailbox / myWorries` purpose, public interface, files, tests for authored/received/written replies, and deletion test for legacy mailbox fallback.
- `## 5. Implementation Slices`: `Slice 4: My worries and reply mailbox migration`.
- `## 9. Test Plan`: my worries list includes own worries; replies written by me shown in My Page; read model tests for received replies and isolated legacy fallback.

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
- Store `deliveries.readAt` and `replies.readByAuthorAt` only through server endpoints.
- Update answer feed and my-worries UI/read hooks to emphasize unread items for the current user only.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: read-state mutation boundary.
- `## 2. Final Firestore Data Model`: delivery `readAt` field and reply `readByAuthorAt` field.
- `## 3. API Surface`: Answer Feed Read State; My Worries Replies Read State.
- `## 4. Server Modules and File-Level Plan`: `replyMailbox / myWorries` read-state extension.
- `## 5. Implementation Slices`: `Slice 5: Read state`.
- `## 9. Test Plan`: read-state API ownership/idempotency tests; later replies remain unread; read state private; read marking does not decrement activeDeliveryCount.

### Verification Criteria

- Opening a delivered worry clears only the recipient's unread emphasis.
- Opening replies clears only the worry author's unread reply emphasis.
- Read fields are not exposed as public read receipts to the other party.
- Clients cannot set read fields directly.

### Explicit Non-Goals / Deferred Work

- Read state does not affect answerability.
- Read state does not create rematch, feedback, or notification behavior.

## Phase 6: Pass Delivery

### Goal

Allow recipients to pass active deliveries without creating immediate replacement deliveries.

### Work

- Implement `POST /api/deliveries/:deliveryId/pass`.
- Transition active deliveries to `passed`.
- Decrement recipient `activeDeliveryCount` exactly once.
- Remove passed deliveries from the recipient's answer feed.
- Record enough state so the same user is excluded from future deliveries for the same worry.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: pass mutation boundary; same-worry redelivery exclusion metadata for passed deliveries; pass idempotency.
- `## 2. Final Firestore Data Model`: delivery pass fields.
- `## 3. API Surface`: Pass endpoint.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to the `pass` side of `pass / rematch`.
- `## 4. Server Modules and File-Level Plan`: `pass / rematch` pass purpose, pass interface, pass file, pass tests, and pass deletion behavior.
- `## 5. Implementation Slices`: `Slice 6: Pass`.
- `## 6. Matching Policy Detail`: passed-user exclusion; activeDeliveryCount decrement on passed.
- `## 9. Test Plan`: pass transition; activeDeliveryCount decrement on pass; feed removal; same-worry redelivery exclusion; pass idempotency and ownership tests.
- `## 11. Risk Register`: additive rematch inactive-user risk mitigation through pass UX and activeDeliveryCount limit.

### Verification Criteria

- Passing an active delivery removes it from the feed.
- Repeating pass does not double-decrement.
- Answered or hidden deliveries return conflict.
- The author receives no pass signal.
- Pass does not create replacement deliveries.

### Explicit Non-Goals / Deferred Work

- Additive replacement delivery creation is Phase 8 rematch job only.

## Phase 7: Feedback Migration

### Goal

Implement deterministic, immutable feedback with correct helpedCount, visibility, and notification semantics.

### Work

- Implement `POST /api/replies/:replyId/feedback`.
- Store feedback in deterministic `feedbacks/{replyId}` or an equivalent deterministic document keyed by the reply ID.
- Validate feedback comments: trim, non-empty when submitted, max 1000.
- Moderate feedback comments before saving.
- Enforce one immutable like/dislike choice per reply.
- Allow one later like comment only if PRD/TODO delayed-comment rule applies and no comment exists.
- Increment helpedCount exactly once for eligible human and example likes.
- Do not increment helpedCount for AI reply likes.
- Hide disliked replies from the publisher view without deleting replies.
- Expose likes and like comments to repliers; do not expose dislikes or dislike comments to repliers.
- Send reply-liked push where PRD allows it; comments and dislikes must not trigger push.
- Add feedback Firestore rules.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: feedback mutation boundary; my page read path for like/comment state visible to replier; Firestore ownership for feedback; feedback comment validation; feedback comment moderation; one immutable feedback per reply; helpedCount invariant; feedback push failure; Firestore rules invariant for feedback; `App.tsx` excludes helpedCount/feedback policy.
- `## 2. Final Firestore Data Model`: `feedbacks/{feedbackId}` all checkboxes; feedback summary fields on `replies/{replyId}`; feedback comment moderation log fields.
- `## 3. API Surface`: Feedback endpoint.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to `replyFeedback`.
- `## 4. Server Modules and File-Level Plan`: `replyFeedback`.
- `## 4. Server Modules and File-Level Plan`: `replyMailbox / myWorries` feedback/admin extension only for disliked filtering.
- `## 5. Implementation Slices`: `Slice 7: Feedback migration`.
- `## 7. Firestore Rules Final Design`: Feedback `feedbacks/{feedbackId}` rules; replier dislike/comment denial.
- `## 9. Test Plan`: feedback visibility/helpedCount unit tests; feedback deterministic doc and helpedCount once; AI like excluded; example like included; dislike hidden but not deleted; comment visibility; no comment push; no dislike push; like push only; replier cannot read dislike feedback/comment.

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

Create additive human delivery batches after 8-hour timeouts without expiring existing active deliveries.

### Work

- Implement `POST /api/internal/rematch-due-deliveries` with internal auth.
- Add job locks and rematch run records.
- Maintain linear batch lineage: Round 0 -> Round 1 -> Round 2.
- Use the previous round as the source batch and apply PRD 8.5 random-slot replacement.
- Exclude author, deleted users, users at active delivery limit, all previous recipients, passed users, and answered users.
- Never exceed 15 human deliveries.
- Increment activeDeliveryCount for newly created recipients exactly once.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: rematch job mutation boundary; Firestore ownership for rematch operational collections; rematch delivery limits; rematch job idempotency.
- `## 2. Final Firestore Data Model`: worry rematch metadata fields; delivery rematch fields; `jobLocks/{jobName}`; `rematchRuns/{runId}`; `deliveryBatches/{batchId}` rematch lineage fields.
- `## 3. API Surface`: `POST /api/internal/rematch-due-deliveries`; internal job tests for rematch.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to the `rematch` side of `pass / rematch`.
- `## 4. Server Modules and File-Level Plan`: `pass / rematch` rematch interface, files, tests, and deletion behavior.
- `## 5. Implementation Slices`: `Slice 8: Rematch job`.
- `## 6. Matching Policy Detail`: all rematch exclusions; all rematch batch sizing rules; activeDeliveryCount rematch strategy; rematch tests; counter tests for rematch.
- `## 7. Firestore Rules Final Design`: operational collection rules for jobLocks and rematchRuns.
- `## 9. Test Plan`: all rematch job/idempotency tests; no Round 3; no branching; source batch references; old deliveries remain answerable; activeDeliveryCount rematch increment/decrement invariants; publication/rematch reject recipients at limit.
- `## 11. Risk Register`: race conditions around active delivery counts; rematch scheduled job idempotency; rematch branching risk.

### Verification Criteria

- Round 1 is created from Round 0 after 8 hours.
- Round 2 is created from Round 1 after another 8 hours.
- No Round 3 is created.
- Historical earlier batches do not independently spawn branches.
- Existing active deliveries remain answerable after rematch.
- Total human deliveries never exceed 15.
- Running the job twice does not duplicate deliveries.

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

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: AI fallback job mutation boundary; AI reply moderation; AI fallback idempotency.
- `## 2. Final Firestore Data Model`: AI fallback fields on `worries/{worryId}`; AI reply fields on `replies/{replyId}`; AI reply moderation log fields; `aiFallbackRuns/{runId}`.
- `## 3. API Surface`: `POST /api/internal/create-ai-fallbacks`; internal job tests for AI fallback.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to `aiFallback`.
- `## 4. Server Modules and File-Level Plan`: `aiFallback`.
- `## 5. Implementation Slices`: `Slice 9: AI fallback`.
- `## 9. Test Plan`: all AI fallback condition, late human reply, moderation, duplicate prevention, and notification tests.
- `## 11. Risk Register`: AI fallback with late human replies.

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

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: example feedback job mutation boundary; Firestore ownership for example operational collections; example reply moderation; example job idempotency.
- `## 2. Final Firestore Data Model`: example/onboarding fields on users; example fields on worries, deliveries, and replies; example reply moderation log fields; `exampleWorrySeeds/{seedId}`; `scheduledJobs/{jobId}` or `exampleFeedbackJobs/{jobId}`.
- `## 3. API Surface`: `POST /api/internal/create-example-feedbacks`; seed/admin utility endpoint decision; internal job tests for examples.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to `exampleWorries`.
- `## 4. Server Modules and File-Level Plan`: `exampleWorries`.
- `## 5. Implementation Slices`: `Slice 10: Example worries`.
- `## 7. Firestore Rules Final Design`: operational collection rules for example seeds and scheduled/example feedback jobs.
- `## 9. Test Plan`: example worries once/max 5; interest selection; no later additions on interest edit; delayed like; no comment; helpedCount increment.
- `## 11. Risk Register`: example scheduled job idempotency.

### Verification Criteria

- A new onboarded user receives at most five example deliveries once.
- Example selection uses interests and does not create later additions after interest edits.
- Example feedback creates one delayed like, no comment, and increments helpedCount.

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

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: `App.tsx` limited to view composition plus service hooks/API wrappers.
- `## 5. Implementation Slices`: `Slice 11: UI navigation PRD alignment`.
- `## 9. Test Plan`: first screen; bottom tabs; worry write starts from my worries; happy path UI flow through publish -> receive -> read -> reply -> author reads -> like.
- `## 11. Risk Register`: UI regressions due to `App.tsx` size.

### Verification Criteria

- Authenticated users land on `답변하기`.
- The three PRD bottom tabs are the only bottom tabs.
- No screen looks like a public board.
- More actions live in My Page.

### Explicit Non-Goals / Deferred Work

- Visual brand overhaul is not part of this phase.
- Actual account deletion endpoint is Phase 14; this phase only places the entry point if needed.

## Phase 12: Validation Copy and Draft Preservation

### Goal

Polish content validation UX and moderation copy after server validation already exists on write endpoints.

### Work

- Centralize any remaining duplicated validation UI around the shared server policy.
- Ensure moderation failure reason messages match PRD reason codes.
- Add high-risk help message behavior.
- Preserve drafts on validation/moderation failure.

### TODO Checkboxes Completed In This Phase

- `## 5. Implementation Slices`: `Slice 12: Input validation and copy`.
- `## 9. Test Plan`: input validator trims/rejects empty/rejects >1000/allows short content; moderation failure preserves draft; empty/overlong rejection path; unsafe worry/reply/comment not saved.

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

### TODO Checkboxes Completed In This Phase

- `## 2. Final Firestore Data Model`: notification setting fields on users; all `users/{uid}/fcmTokens/{tokenId}` checkboxes; new-reply push log fields; reply-liked push log fields; push hardening status fields.
- `## 5. Implementation Slices`: `Slice 13: Notifications`.
- `## 9. Test Plan`: pushLogs statuses; invalid token deletion; no rollback; no comment push; no dislike push; notification permission granted/denied manual behavior.

### Verification Criteria

- Supported notification kinds are only new worry, new reply, and reply liked.
- Invalid tokens are deleted or marked according to the TODO policy.
- Comment and dislike notifications are absent.
- Push failure never rolls back publication, reply, or feedback.

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

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: account deletion mutation boundary; completed auth/deleted-user blocking across all user endpoints.
- `## 2. Final Firestore Data Model`: user core profile fields, account deletion fields, client-writable fields, server-owned fields, source of truth, read access, lifecycle, and legacy replacement.
- `## 3. API Surface`: Account Deletion endpoint.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: apply deep-module guardrails to `userAccount`.
- `## 4. Server Modules and File-Level Plan`: `userAccount`.
- `## 5. Implementation Slices`: `Slice 14: Account deletion and inactive users`.
- `## 9. Test Plan`: account deletion soft deletes and removes tokens; deleted users blocked; matching excludes deleted; account deletion manual behavior.

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
- Ensure major paths have operational audit coverage: moderation, matching, pass, rematch, push, AI, and example runs.
- Add hidden/admin-only rules where possible.

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: Firestore rules invariant for hidden/admin-only data.
- `## 2. Final Firestore Data Model`: hidden/deleted-author fields on worries, hidden delivery fields, and hidden reply fields.
- `## 5. Implementation Slices`: `Slice 15: Admin hiding and internal logs`.
- `## 7. Firestore Rules Final Design`: Admin/hidden rules.
- `## 9. Test Plan`: hidden worries/replies excluded; admin/system hide decrements activeDeliveryCount once; logs created for major paths; manual hide verification.

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

### TODO Checkboxes Completed In This Phase

- `## 1. Target PRD Architecture`: final source-of-truth mutation boundary; temporary legacy read fallbacks removed; final Firestore ownership; final legacy rules invariant; `App.tsx` excludes legacy migration decisions.
- `## 5. Implementation Slices`: `Slice 16: Legacy letters removal`.
- `## 7. Firestore Rules Final Design`: Legacy `letters` final rules.
- `## 8. Migration / Data Reset Strategy`: remove old bot replies; remove public worries; verify no legacy write path remains.
- `## 9. Test Plan`: final legacy `letters` rules test; no runtime `letters` references outside archival/migration documentation.
- `## 11. Risk Register`: legacy `letters` compatibility causing duplicate data.

### Verification Criteria

- Runtime `rg "letters"` shows no application dependency, allowing archival/migration documentation mentions only.
- The app works with only PRD collections.
- Final rules deny legacy `letters` runtime reads/writes/deletes.
- Old bot schedule and old comment notification endpoints are removed.

### Explicit Non-Goals / Deferred Work

- Historical data migration is not required if the reset/archive strategy is chosen.

## Phase 17: Operational Documentation

### Goal

Make operational docs match the final PRD implementation.

### Work

- Update matching algorithm documentation.
- Update README or create/update `docs/ops.md`.
- Document Firebase Admin, moderation provider, internal job secret, env vars, local test commands, emulator/rules test setup, and deploy notes for scheduled jobs.

### TODO Checkboxes Completed In This Phase

- `## 5. Implementation Slices`: `Slice 17: Documentation and operational setup`.
- `### Architecture Safeguard: Deep Modules and Interface Guardrails`: final verification that no shallow adapter/interface was added merely for file-boundary crossing, meaningful seams are documented, each slice has a deletion test or equivalent observable-behavior removal check, and implemented tests focus on observable PRD behavior.
- `## 11. Risk Register`: test brittleness mitigation is documented through clock/random/id factory guidance and test command documentation.

### Verification Criteria

- A new developer can run, test, and deploy using `docs/PRD.md`, code, `docs/TODO.md`, `docs/phase.md`, and ops docs.
- Docs mention all internal endpoints and required environment variables.

### Explicit Non-Goals / Deferred Work

- Broad product documentation beyond implementation and operations is not required.

## Phase 18: Final Verification

### Goal

Run the final verification checklist after all implementation phases are complete.

### Work

- Run full automated checks.
- Run final manual happy, rejection, rematch, AI fallback, notification, deletion, security, and legacy-removal paths.

### TODO Checkboxes Completed In This Phase

- `## 10. Final Verification Checklist`: all checkboxes.

### Verification Criteria

- `npm test` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Firestore rules tests pass.
- Manual happy paths pass: onboarding, example creation, publish worry, receive delivery, read, reply, author read, like.
- Manual rejection paths pass: empty/overlong worry/reply/comment and moderation rejection preserve draft.
- Manual pass/additive rematch/AI fallback simulations pass, including original recipient answering after rematch.
- Security verification passes: no client source-of-truth writes, no other-user reads, deleted user blocked.
- Legacy removal verification passes: no runtime `letters` writes, no public worry feed, old bot schedule endpoint removed, final rules deny `letters`.

### Explicit Non-Goals / Deferred Work

- This phase does not own implementation work. The coverage matrix below assigns every TODO section and subsection to a concrete phase.

## TODO Coverage Matrix

| TODO Section / Subsection | Completed In |
| --- | --- |
| `## 0. Current Architecture Summary` | Phase 0 |
| `## 1`: worry publication boundary | Phase 1 |
| `## 1`: reply publication boundary | Phase 3 |
| `## 1`: read-state boundary | Phase 5 |
| `## 1`: pass boundary | Phase 6 |
| `## 1`: feedback boundary | Phase 7 |
| `## 1`: rematch job boundary | Phase 8 |
| `## 1`: AI fallback job boundary | Phase 9 |
| `## 1`: example feedback job boundary | Phase 10 |
| `## 1`: account deletion boundary | Phase 14 |
| `## 1`: final source-of-truth and legacy boundaries | Phase 16 |
| `## 1`: answer feed read path | Phase 1 |
| `## 1`: my worries/reply mailbox read paths | Phase 4 |
| `## 1`: my page feedback-visible read path | Phase 7 |
| `## 1`: temporary fallback removal | Phase 16 |
| `## 1`: initial Firestore ownership/rules invariants | Phase 2 |
| `## 1`: reply ownership/rules invariants | Phase 3 |
| `## 1`: feedback ownership/rules invariants | Phase 7 |
| `## 1`: rematch operational ownership | Phase 8 |
| `## 1`: AI fallback operational ownership | Phase 9 |
| `## 1`: example operational ownership | Phase 10 |
| `## 1`: hidden/admin-only rules invariant | Phase 15 |
| `## 1`: worry validation, worry moderation, categories, initial matching, initial active limit | Phase 1 |
| `## 1`: reply validation, reply moderation, answered-delivery redelivery metadata | Phase 3 |
| `## 1`: feedback comment validation and moderation | Phase 7 |
| `## 1`: AI reply moderation | Phase 9 |
| `## 1`: example reply moderation | Phase 10 |
| `## 1`: one reply per delivery | Phase 3 |
| `## 1`: passed-delivery redelivery metadata | Phase 6 |
| `## 1`: rematch delivery limits | Phase 8 |
| `## 1`: feedback/helpedCount | Phase 7 |
| `## 1`: pass idempotency | Phase 6 |
| `## 1`: rematch idempotency | Phase 8 |
| `## 1`: AI fallback idempotency | Phase 9 |
| `## 1`: example job idempotency | Phase 10 |
| `## 1`: worry publication push failure | Phase 1 |
| `## 1`: reply publication push failure | Phase 3 |
| `## 1`: feedback push failure | Phase 7 |
| Architecture safeguards: UI extraction | Phase 1 |
| Architecture safeguards: deep-module guardrails by module | Phases 1, 3, 4, 6, 7, 8, 9, 10, 14 |
| Architecture safeguards: no shallow interfaces, meaningful seams, observable tests | Phase 17 |
| `## 2`: user core/deletion fields and user lifecycle | Phase 14 |
| `## 2`: user example fields | Phase 10 |
| `## 2`: user notification fields and `users/{uid}/fcmTokens/{tokenId}` | Phase 13 |
| `## 2`: worry core publication fields/access/lifecycle | Phase 1 |
| `## 2`: worry rematch fields | Phase 8 |
| `## 2`: worry AI fallback fields | Phase 9 |
| `## 2`: worry example fields | Phase 10 |
| `## 2`: worry hidden/deleted-author fields | Phase 15 |
| `## 2`: delivery core fields/access/lifecycle | Phase 1 |
| `## 2`: delivery read-state field | Phase 5 |
| `## 2`: delivery pass fields | Phase 6 |
| `## 2`: delivery rematch fields | Phase 8 |
| `## 2`: delivery example fields | Phase 10 |
| `## 2`: delivery hidden fields | Phase 15 |
| `## 2`: reply core fields/access/lifecycle | Phase 3 |
| `## 2`: reply read-state field | Phase 5 |
| `## 2`: reply feedback summary fields | Phase 7 |
| `## 2`: reply AI fields | Phase 9 |
| `## 2`: reply example fields | Phase 10 |
| `## 2`: reply hidden fields | Phase 15 |
| `## 2`: `feedbacks/{feedbackId}` | Phase 7 |
| `## 2`: worry moderation logs and common moderation reason/access/lifecycle | Phase 1 |
| `## 2`: reply moderation logs | Phase 3 |
| `## 2`: feedback comment moderation logs | Phase 7 |
| `## 2`: AI reply moderation logs | Phase 9 |
| `## 2`: example reply moderation logs | Phase 10 |
| `## 2`: new-worry push logs | Phase 1 |
| `## 2`: new-reply and reply-liked push logs plus hardening statuses | Phase 13 |
| `## 2`: rematch operational collections | Phase 8 |
| `## 2`: AI fallback operational collections | Phase 9 |
| `## 2`: example operational collections | Phase 10 |
| `## 3`: Auth Middleware | Phase 1; full endpoint coverage Phase 14 |
| `## 3`: Worry Publication | Phase 1 |
| `## 3`: Answer Feed Read State | Phase 5 |
| `## 3`: Pass | Phase 6 |
| `## 3`: Reply Publication | Phase 3 |
| `## 3`: My Worries Replies Read State | Phase 5 |
| `## 3`: Feedback | Phase 7 |
| `## 3`: Account Deletion | Phase 14 |
| `## 3`: Internal Jobs | Rematch Phase 8; AI Phase 9; examples Phase 10 |
| `## 4`: worry/moderation/answer modules | Phase 1 |
| `## 4`: reply publication | Phase 3 |
| `## 4`: reply mailbox / my worries | Phase 4; read extension Phase 5; feedback/admin extensions Phases 7/15 |
| `## 4`: reply feedback | Phase 7 |
| `## 4`: pass / rematch | Pass Phase 6; rematch Phase 8 |
| `## 4`: AI fallback | Phase 9 |
| `## 4`: example worries | Phase 10 |
| `## 4`: user account | Phase 14 |
| `## 5`: Slice 1 through Slice 17 | Phases 1 through 17 respectively |
| `## 6`: initial matching | Phase 1 |
| `## 6`: pass/answered/hidden active count decrements | Phases 3, 6, 15 |
| `## 6`: rematch sizing/exclusions/cap/counter tests | Phase 8 |
| `## 7`: transition rules | Phase 2 |
| `## 7`: reply rules | Phase 3 |
| `## 7`: feedback rules | Phase 7 |
| `## 7`: operational rules | Phases 8, 9, 10 |
| `## 7`: admin/hidden rules | Phase 15 |
| `## 7`: final legacy rules | Phase 16 |
| `## 8`: reset strategy | Phase 0 |
| `## 8`: transition reads and duplicate avoidance | Phase 1 |
| `## 8`: old bot/public worry removal and no-legacy-write verification | Phase 16 |
| `## 9`: Unit policy tests | Phases 1, 7, 8, 12 |
| `## 9`: Server use-case tests | Phases 1, 3, 6, 7, 14, 15 |
| `## 9`: API tests | Phases 1, 3, 5, 6, 7, 8, 9, 10, 14 |
| `## 9`: Firestore rules tests | Phases 2, 3, 7, 15, 16 |
| `## 9`: Read model tests | Phases 1, 4, 5, 7, 8, 15 |
| `## 9`: Job/idempotency tests | Phases 8, 9, 10 |
| `## 9`: UI/manual tests | Phases 11, 12, 13, 14, 18 |
| `## 10. Final Verification Checklist` | Phase 18 |
| `## 11. Risk Register`: Firestore rules complexity | Phase 2 |
| `## 11`: race conditions around active delivery counts | Phase 8 |
| `## 11`: additive rematch can accumulate old active deliveries | Phase 6 |
| `## 11`: rematch scheduled job idempotency | Phase 8 |
| `## 11`: example scheduled job idempotency | Phase 10 |
| `## 11`: rematch branching | Phase 8 |
| `## 11`: AI fallback with late human replies | Phase 9 |
| `## 11`: legacy `letters` compatibility | Phase 16 |
| `## 11`: notification failure ambiguity | Phase 13 |
| `## 11`: moderation provider malformed responses | Phase 1 |
| `## 11`: UI regressions due to `App.tsx` size | Phase 11 |
| `## 11`: test brittleness | Phase 17 |
| `## 12. Output Requirements` | Phase 0 |
