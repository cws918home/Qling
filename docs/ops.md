# Qling Operations Guide

## Source Of Truth

- `docs/PRD.md`: product behavior and final policy.
- `docs/TODO.md`: implementation checklist and phase evidence requirements.
- `docs/phase.md`: phase ownership reference.
- `docs/matching_algorithm.md`: implemented matching/rematch/AI fallback policy.

## Local Setup

Prerequisite: Node.js.

```sh
npm install
npm run dev
```

`npm run dev` starts the Express server from `server.ts` and serves the Vite PWA through Vite middleware in development.

## Required Env And Config

Environment variables:

- `FIREBASE_SERVICE_ACCOUNT`: Firebase Admin service account JSON.
- `OPENAI_API_KEY`: OpenAI API key used by moderation and AI fallback provider calls.
- `INTERNAL_JOB_SECRET`: bearer token for internal scheduled/admin endpoints.

`firebase-applet-config.json` must include:

- `projectId`
- `appId`
- `apiKey`
- `authDomain`
- `firestoreDatabaseId`
- `storageBucket`
- `messagingSenderId`

## Verification Commands

```sh
npm test
npm run lint
npm run build
npm run test:rules
```

Firestore rules use the emulator configured in `firebase.json`:

- Firestore emulator port: `8080`.
- Rules command: `firebase emulators:exec --only firestore "tsx --test \"src/**/*.rules.test.ts\""` via `npm run test:rules`.

## Scheduled Jobs

Internal scheduled/admin endpoints require:

```http
Authorization: Bearer ${INTERNAL_JOB_SECRET}
Content-Type: application/json
```

Examples:

```sh
curl -X POST http://localhost:3000/api/internal/rematch-due-deliveries \
  -H "Authorization: Bearer ${INTERNAL_JOB_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"now":"2026-05-14T00:00:00.000Z","limit":10}'
```

```sh
curl -X POST http://localhost:3000/api/internal/create-ai-fallbacks \
  -H "Authorization: Bearer ${INTERNAL_JOB_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"dryRun":true,"now":"2026-05-14T00:00:00.000Z","limit":10}'
```

```sh
curl -X POST http://localhost:3000/api/internal/create-example-feedbacks \
  -H "Authorization: Bearer ${INTERNAL_JOB_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"now":"2026-05-14T00:00:00.000Z","limit":10}'
```

```sh
curl -X POST http://localhost:3000/api/internal/admin/hide-content \
  -H "Authorization: Bearer ${INTERNAL_JOB_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{"targetType":"worry","targetId":"worry1","hiddenReason":"policy","hiddenBy":"operator"}'
```

`dryRun` is supported by rematch and AI fallback jobs only. `now` and `limit` are supported by rematch, AI fallback, and example feedback jobs.

## User Endpoints

Authenticated user-facing endpoints use Firebase auth bearer tokens:

- `POST /api/worries/publish`
- `POST /api/deliveries/:deliveryId/replies`
- `POST /api/deliveries/:deliveryId/read`
- `POST /api/worries/:worryId/replies/read`
- `POST /api/deliveries/:deliveryId/pass`
- `POST /api/replies/:replyId/feedback`
- `POST /api/users/me/example-worries`
- `POST /api/users/me/delete`

## Deployment Notes

Deploy the Express server in `server.ts` with the required environment variables. In production, `server.ts` serves the built Vite assets from `dist`; run `npm run build` before deploying static assets with the server.

Scheduled jobs should call the internal endpoints with `Authorization: Bearer ${INTERNAL_JOB_SECRET}`. Do not expose internal endpoints without that bearer header.

## New Developer Checklist

- Read `docs/PRD.md`, `docs/TODO.md`, `docs/phase.md`, and `docs/matching_algorithm.md`.
- Verify `FIREBASE_SERVICE_ACCOUNT`, `OPENAI_API_KEY`, and `INTERNAL_JOB_SECRET`.
- Verify `firebase-applet-config.json` includes `projectId`, `appId`, `apiKey`, `authDomain`, `firestoreDatabaseId`, `storageBucket`, and `messagingSenderId`.
- Run `npm install`.
- Run `npm run dev`.
- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run test:rules`.
- Confirm the scheduled-job request shapes and `Authorization: Bearer ${INTERNAL_JOB_SECRET}` examples above.
- Confirm deployment uses the Express server in `server.ts`.

## Non-Goals

- No broad product manual.
- No historical legacy migration unless separately chosen.
- No admin dashboard.
- No broad privacy export/delete workflow beyond the current soft-delete MVP.
