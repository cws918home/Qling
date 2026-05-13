# Phase 1 Implementation Report

Target baseline commit: `6a069e733862f76cc85bc29415f659f2c539550f`

Phase: Server-Owned Worry Publication

## Summary

Phase 1 is implemented as the runtime transition from browser-owned legacy `letters` worry publication to authenticated server-owned PRD publication through `POST /api/worries/publish`.

The Phase 1 Firestore repository uses a temporary correctness-first broad user scan in `fetchRecipientCandidates({ authorUid, minimumCandidateCount, limit })`, then leaves all final eligibility and ranking in `recipientSelection.ts`. No `lastActive` freshness cutoff is introduced.

Firestore emulator infrastructure is not present in this repo. Transaction behavior is verified with a deterministic fake transaction harness in `src/services/worryPublication/server/firestoreRepository.test.ts`.

Manual verification evidence is represented by deterministic unit/fake integration tests:

- valid publication creates one canonical worry, one Round 0 batch, five deliveries, one moderation log, and post-commit push logs
- rejected moderation creates a moderation log only
- fewer than five eligible humans creates no partial core state
- recipient feed can render PRD deliveries without requiring push permission or legacy fallback

## Commands

- `npm test`: passed, 157 tests.
- `npm run lint`: passed.
- `npm run build`: passed. Vite reported the existing large chunk warning.

## Files Changed

- `server.ts`
- `src/App.tsx`
- `src/server/auth.ts`
- `src/server/auth.test.ts`
- `src/server/moderationProvider.ts`
- `src/server/worryRoutes.ts`
- `src/server/worryRoutes.test.ts`
- `src/services/worryPublication/apiClient.ts`
- `src/services/worryPublication/apiClient.test.ts`
- `src/services/worryPublication/server/*`
- `src/services/homeWorryFeed/*`
- `docs/TODO.md`
- `docs/phase1-implementation-report.md`

## Evidence Matrix

| TODO ID | Checked? | Evidence |
| --- | --- | --- |
| TODO-1.1 | yes | `src/App.tsx#publishWorry` calls `publishWorryViaApi`; `apiClient.test.ts` proves only `{ content }` plus bearer token; `server/worryRoutes.ts` owns PRD publish path; legacy `letters` writer remains only under legacy publication module. |
| TODO-1.11 | yes | `usePrdAnswerFeed.ts`, `prdPolicy.ts`, `useLegacyLettersAnswerFeedFallback.ts`; `prdPolicy.test.ts` proves active PRD deliveries appear and legacy fallback is isolated/suppressed when PRD exists. |
| TODO-1.23 | yes | `validation.ts`; `validation.test.ts` covers trim, empty, too-long, invalid type. |
| TODO-1.26 | yes | `publishWorry.ts` calls `moderateWorryForPublication` before building/writing user-visible docs; `publishWorry.test.ts` covers provider invalid/error no core state. |
| TODO-1.31 | yes | `moderation.ts` preserves raw/valid/invalid/matching categories; `moderation.test.ts` covers invalid-category preservation and `잡담` fallback. |
| TODO-1.32 | yes | `recipientSelection.ts` enforces exactly 5, 4 matched + 1 random; `recipientSelection.test.ts` and `publishWorry.test.ts` cover shortfall no writes. |
| TODO-1.33 | yes | `isEligiblePhase1HumanCandidate` excludes `activeDeliveryCount >= 10`; `firestoreRepository.test.ts` proves transaction-time over-limit abort. |
| TODO-1.43 | yes | `publishWorry.ts` calls push after repository commit; `publishWorry.test.ts` proves push logs after commit and push failure still returns published. |
| TODO-1.61 | yes | Deep modules: `server/auth.ts`, `server/moderationProvider.ts`, `worryPublication/server/*`, `homeWorryFeed/prdPolicy.ts`; tests verify policy behavior, not wrapper calls only. |
| TODO-2.15 | yes | `buildWorry` in `publishWorry.ts` writes required `worries/{worryId}` fields; `publishWorry.test.ts` asserts canonical worry creation path. |
| TODO-2.20 | yes | `worries` write model is canonical source for content/category state in `publishWorry.ts`; PRD feed reads worry content from `worries` in `usePrdAnswerFeed.ts`. |
| TODO-2.21 | yes | Recipient reads display data via `deliveries` plus per-doc `worries` load in `usePrdAnswerFeed.ts`; no public board PRD read path added. |
| TODO-2.22 | yes | PRD worry writes use Admin repository `firestoreRepository.ts`; client publish wrapper only POSTs API request. |
| TODO-2.23 | yes | No client update/delete PRD worry path added; write model is created only during server publication. |
| TODO-2.24 | yes | `App.tsx` no longer imports/calls `publishWorryWithProductionAdapters`; new publication creates PRD docs, not `letters`. |
| TODO-2.25 | yes | `buildDeliveries` uses deterministic IDs `${worryId}_${recipientUid}`; `publishWorry.test.ts` and `firestoreRepository.test.ts` verify duplicate deterministic delivery abort. |
| TODO-2.26 | yes | `DeliveryWriteModel.status` is `'active'`; feed policy excludes answered/passed/hidden fields; Phase 1 does not add rematched status. |
| TODO-2.27 | yes | `DeliveryWriteModel` in `types.ts` and `buildDeliveries` include required Round 0 fields and snapshots; `publishWorry.test.ts` checks `authorGenderSnapshot`. |
| TODO-2.33 | yes | `deliveries` are written by `commitInitialWorryPublication`; answer feed uses `deliveries` as answerability source. |
| TODO-2.34 | yes | `usePrdAnswerFeed.ts` queries only `recipientUid == profile.uid`; read receipts are not implemented in Phase 1. |
| TODO-2.35 | yes | Delivery writes occur only in Admin repository transaction; browser has no PRD delivery write path. |
| TODO-2.36 | yes | Phase 1 creates only active deliveries and excludes answered/passed/hidden from feed; no non-monotonic transition code added. |
| TODO-2.37 | yes | New publication creates canonical `deliveries` instead of per-recipient `letters`; legacy letters fallback is read-only and explicitly named. |
| TODO-2.57 | yes | `buildModerationLog` writes target type/id, uid, content, status, reason, category arrays, provider/model, timestamps; rejected targetId is generated worryId. |
| TODO-2.62 | yes | `moderation.ts` defines/maps Phase 1 reason codes; `moderation.test.ts` covers conservative mapping. |
| TODO-2.63 | yes | Moderation logs are written for approved/rejected audit; tests cover category preservation and rejected moderation log-only behavior. |
| TODO-2.64 | yes | Moderation logs are written only through server repository; no client read/write module added. |
| TODO-2.65 | yes | Phase 1 writes permanent moderation log documents and does not add deletion lifecycle code. |
| TODO-2.66 | yes | `pushLogs.ts` writes `kind`, `targetUid`, `sourceId`, `sourceType`, status, token summary, error fields, createdAt; `pushLogs.test.ts` covers statuses. |
| TODO-2.70 | yes | `pushLogs.ts` is new-worry push attempt audit source; old notify route is not called by PRD publish. |
| TODO-2.71 | yes | Push logs are written only by server push service; no client push-log write/read path added. |
| TODO-2.72 | yes | Push logs are append-only operational records in Phase 1; no deletion/TTL code added. |
| TODO-2.75 | yes | `buildBatch` creates Round 0 `deliveryBatches` with target/created/matched/random counts and `reason: 'initial'`; `publishWorry.test.ts` checks Round 0. |
| TODO-3.1 | yes | `src/server/auth.ts` created. |
| TODO-3.2 | yes | `createRequireFirebaseAuth` verifies bearer ID token, loads `users/{uid}`, blocks `deleted === true`, attaches verified profile. |
| TODO-3.3 | yes | `auth.test.ts` covers missing bearer, invalid token, body uid ignored, deleted blocked, missing deleted allowed, incomplete profile blocked. |
| TODO-3.4 | yes | `worryRoutes.ts` reads request body `{ content }`; `apiClient.test.ts` proves wrapper sends only content. |
| TODO-3.5 | yes | `registerWorryRoutes` installs auth middleware; `auth.test.ts` and `worryRoutes.test.ts` cover signed-in/onboarded profile behavior. |
| TODO-3.6 | yes | `publishWorryOnServer` validates trim/non-empty/max 1000 before provider/writes; `validation.test.ts`. |
| TODO-3.7 | yes | `firestoreRepository.ts#commitInitialWorryPublication` runs a transaction for canonical docs/counters; `firestoreRepository.test.ts` covers abort/no partial writes. |
| TODO-3.8 | yes | Route maps published/rejected/validation/provider/server results to documented status codes in `worryRoutes.ts`. |
| TODO-3.9 | yes | `worryRoutes.test.ts` proves route passes verified author profile and ignores body uid/authorUid/gender/interests. |
| TODO-3.10 | yes | `server.ts` registers `/api/worries/publish`; PRD publish path does not call `/api/process-worry`, `/api/notify-new-worry`, or `/api/schedule-bot-reply`. |
| TODO-4.1 | yes | Auth server module public interface is `parseBearerToken`, `createRequireFirebaseAuth`, `AuthenticatedRequest`. |
| TODO-4.2 | yes | Auth tests cover observable middleware behavior in `auth.test.ts`. |
| TODO-4.3 | yes | Auth module hides Firebase Auth/user-doc lookup external dependency and owns deleted/profile policy. |
| TODO-4.4 | yes | Moderation provider extracted to `server/moderationProvider.ts`; legacy `/api/process-worry` can keep using it. |
| TODO-4.5 | yes | `moderation.ts` normalizes provider output and retries once; provider module contains no Express logic. |
| TODO-4.6 | yes | `moderation.test.ts` covers approved/rejected/provider invalid/provider error/category preservation. |
| TODO-4.7 | yes | Server worry publication deep module under `worryPublication/server/*` owns validation, moderation normalization, selection, repository, push. |
| TODO-4.8 | yes | Public API `publishWorryOnServer` in `publishWorry.ts` matches Phase 1 use case. |
| TODO-4.9 | yes | `publishWorry.test.ts`, `recipientSelection.test.ts`, `firestoreRepository.test.ts`, `pushLogs.test.ts`. |
| TODO-4.10 | yes | Repository port in `types.ts` hides Admin Firestore mechanics and supports deterministic transaction tests. |
| TODO-4.11 | yes | Fake transaction harness in `firestoreRepository.test.ts` verifies repository behavior without emulator. |
| TODO-4.12 | yes | Answer-feed module added for `답변하기` read model: `usePrdAnswerFeed.ts`, `prdPolicy.ts`. |
| TODO-4.13 | yes | Public hook `useAnswerFeedWithLegacyFallback` returns delivery items joined with worry display fields. |
| TODO-4.14 | yes | Existing `homeWorryFeed` split into PRD policy/hook and explicit legacy fallback hook. |
| TODO-4.15 | yes | `prdPolicy.test.ts` covers active deliveries and answered/passed/hidden/non-recipient exclusions. |
| TODO-4.16 | yes | `prdPolicy.test.ts` proves PRD feed works with empty legacy fallback and PRD items suppress legacy fallback. |
| TODO-5.1 | yes | End-to-end use case in `publishWorryOnServer`; happy/shortfall/rejection tests in `publishWorry.test.ts`. |
| TODO-5.2 | yes | Files inspected and touched: `server.ts`, `App.tsx`, `worryPublication/*`, `homeWorryFeed/*`, moderation/server modules; Firestore rules intentionally untouched. |
| TODO-5.3 | yes | Created server publication/Admin repository, auth route, client API wrapper, answer feed modules. |
| TODO-5.4 | yes | Write models for `worries`, `deliveries`, `deliveryBatches`, `moderationLogs`, `pushLogs` in server module. |
| TODO-5.5 | yes | New endpoint added; old process/notify/bot routes remain legacy and are not called by PRD publication. |
| TODO-5.6 | yes | `App.tsx#publishWorry` calls API wrapper; answer feed reads PRD first and legacy only when PRD empty. |
| TODO-5.7 | yes | Runtime direct browser publication write removed; Firestore rules hardening not changed and remains Phase 2. |
| TODO-5.8 | yes | Required tests added across validation, moderation, selection, publish, repository, route, client, feed. |
| TODO-5.9 | yes | Manual-equivalent verification via fake harness: valid creates one worry/batch/five deliveries/mod log/push logs; feed displays delivery without token; rejection and shortfall no partial core state. |
| TODO-5.10 | yes | No reply migration, pass/rematch/AI/examples, bottom-tab rebuild, or rules hardening implemented. |
| TODO-5.11 | yes | Deletion-test equivalent: `apiClient.test.ts` plus `App.tsx` import removal show browser has only API path for PRD worry publish. |
| TODO-6.1 | yes | `isEligiblePhase1HumanCandidate` excludes author/deleted/inactive/disabled/bot/over-limit; push token is not a candidate field; tests cover missing deleted/count. |
| TODO-6.3 | yes | `selectInitialWorryRecipients` ranks overlap, helpedCount, same gender, random tie-break; `recipientSelection.test.ts`. |
| TODO-6.4 | yes | Random slot selected from remaining eligible humans and excludes matched duplicates; `recipientSelection.test.ts`. |
| TODO-6.5 | yes | Shortfall returns server error before writes; `publishWorry.test.ts` covers fewer than five eligible humans. |
| TODO-6.8 | yes | `DeliveryWriteModel`/`buildDeliveries` snapshot recipient gender/interests/helpedCount, author gender, categories, overlap, selection type, batch/round/slot. |
| TODO-6.9 | yes | Eligibility uses `users/{uid}.activeDeliveryCount`; transaction increments server-owned counter in repository. |
| TODO-6.10 | yes | `firestoreRepository.ts` rechecks selected recipients and increments once; `firestoreRepository.test.ts` proves over-limit abort and exact increments. |
| TODO-6.18 | yes | `recipientSelection.test.ts`, `publishWorry.test.ts`, and `firestoreRepository.test.ts` cover 5/4+1, shortfall, tie-breaks, active limit, duplicate deterministic delivery. |
| TODO-6.20 | yes | `firestoreRepository.test.ts` covers increment once, over-limit reject, no counter change on abort. |
| TODO-8.2 | yes | New worries write only PRD docs; `useAnswerFeedWithLegacyFallback` reads PRD first, legacy only if no PRD. |
| TODO-8.3 | yes | No backfill attempted; new publications do not create legacy letters, so no duplicate legacy/PRD publication is produced. |
| TODO-9.1 | yes | `moderation.test.ts` covers raw/valid/invalid/matching preservation. |
| TODO-9.4 | yes | `recipientSelection.test.ts` covers exact 5, 4 matched, 1 random; `publishWorry.test.ts` covers shortfall. |
| TODO-9.5 | yes | `recipientSelection.test.ts` covers active limit, author/deleted/bot exclusions, missing deleted/count semantics. |
| TODO-9.8 | yes | `publishWorry.test.ts` covers rejected moderation creates moderation log only with generated targetId. |
| TODO-9.9 | yes | `publishWorry.test.ts` covers approved canonical docs and shortfall no partial state; repository test covers transaction writes. |
| TODO-9.10 | yes | `publishWorry.test.ts` and `pushLogs.test.ts` cover failed/skipped/sent push logs and no rollback. |
| TODO-9.14 | yes | `firestoreRepository.test.ts` proves selected recipients increment exactly once. |
| TODO-9.20 | yes | `auth.test.ts` and `worryRoutes.test.ts` cover missing/invalid auth and body identity ignored. |
| TODO-9.41 | yes | `prdPolicy.test.ts` proves active PRD delivery appears with worry content and identity fields. |
| TODO-9.74 | yes | Deterministic delivery duplicate abort in `firestoreRepository.test.ts` prevents retry double-increment/double-delivery. |
| TODO-11.10 | yes | `moderation.ts` strict normalization/retry; `moderation.test.ts` covers malformed provider retry and fail-closed. |
| TODO-11.13 | yes | Strict five-recipient policy in `recipientSelection.ts`; `publishWorry.test.ts` documents clear shortfall server error/no partial writes. |

## Phase 2 Boundary

No Phase 2+ TODO IDs were checked. Firestore rules hardening remains Phase 2.

## Confirmations

- New worry publication no longer creates `letters`.
- Runtime PRD worry publication goes through `POST /api/worries/publish`.
- Server derives uid/profile from Firebase ID token and ignores body uid/authorUid/profile fields.
- PRD answer feed works without legacy fallback.
- Legacy fallback is explicitly named and isolated.
