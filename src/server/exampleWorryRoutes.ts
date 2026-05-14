import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { createRequireActiveFirebaseAuth, type ActiveAuthenticatedRequest } from './auth';
import { requireInternalJobSecret } from './internalAuth';
import {
  createDueExampleFeedbacks,
  createExamplesForUser,
  type CreateDueExampleFeedbacksResult,
  type CreateExamplesForUserResult,
} from '../services/exampleWorries';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type ExampleWorryService = {
  createExamplesForUser(params: { uid: string }): Promise<CreateExamplesForUserResult>;
  createDueExampleFeedbacks(params: { now?: Date; limit?: number }): Promise<CreateDueExampleFeedbacksResult>;
};

function parseCreateExamplesBody(body: unknown): { status: 'ok' } | { status: 'invalid' } {
  if (body === undefined || body === null) return { status: 'ok' };
  if (typeof body !== 'object' || Array.isArray(body)) return { status: 'invalid' };
  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.length === 0) return { status: 'ok' };
  if (keys.every(key => key === 'uid')) return { status: 'ok' };
  return { status: 'invalid' };
}

function parseJobBody(body: unknown): (
  | { status: 'ok'; now?: Date; limit?: number }
  | { status: 'invalid' }
) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'invalid' };
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).every(key => ['now', 'limit'].includes(key))) return { status: 'invalid' };

  let now: Date | undefined;
  if ('now' in input) {
    if (typeof input.now !== 'string') return { status: 'invalid' };
    now = new Date(input.now);
    if (Number.isNaN(now.getTime())) return { status: 'invalid' };
  }

  let limit: number | undefined;
  if ('limit' in input) {
    if (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit <= 0 || input.limit > MAX_LIMIT) {
      return { status: 'invalid' };
    }
    limit = input.limit;
  }

  return { status: 'ok', now, limit };
}

function sendCreateExamplesResult(res: express.Response, result: CreateExamplesForUserResult): void {
  if (result.status === 'server_error') {
    res.status(result.code === 'firebase_unavailable' ? 503 : 500).json({
      error: {
        code: result.code,
        message: result.message,
        details: result.details,
      },
    });
    return;
  }
  res.status(200).json(result);
}

function sendJobResult(res: express.Response, result: CreateDueExampleFeedbacksResult): void {
  if (result.status === 'server_error') {
    res.status(result.code === 'firebase_unavailable' ? 503 : 500).json({
      error: {
        code: result.code,
        message: result.message,
        details: result.details,
      },
    });
    return;
  }
  res.status(200).json(result);
}

export function registerExampleWorryRoutes(app: express.Express, deps: {
  db: Firestore | null;
  auth: Auth;
  service?: ExampleWorryService;
}): void {
  if (!deps.db) {
    app.post('/api/users/me/example-worries', (_req, res) => {
      res.status(503).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    app.post('/api/internal/create-example-feedbacks', requireInternalJobSecret, (_req, res) => {
      res.status(503).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  const service = deps.service ?? {
    createExamplesForUser: ({ uid }) => createExamplesForUser({ uid, db: deps.db }),
    createDueExampleFeedbacks: ({ now, limit }) => createDueExampleFeedbacks({ now, limit, db: deps.db }),
  };

  app.post(
    '/api/users/me/example-worries',
    createRequireActiveFirebaseAuth({ auth: deps.auth, db: deps.db }),
    async (req, res) => {
      const body = parseCreateExamplesBody(req.body);
      if (body.status === 'invalid') {
        res.status(400).json({
          error: {
            code: 'invalid_body',
            message: 'Request body must be empty or contain only ignored uid.',
          },
        });
        return;
      }

      try {
        const authReq = req as ActiveAuthenticatedRequest;
        sendCreateExamplesResult(res, await service.createExamplesForUser({ uid: authReq.auth.uid }));
      } catch (error) {
        res.status(500).json({
          error: {
            code: 'transaction_aborted',
            message: 'Example worries could not be created.',
            details: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }
  );

  app.post('/api/internal/create-example-feedbacks', requireInternalJobSecret, async (req, res) => {
    const body = parseJobBody(req.body);
    if (body.status === 'invalid') {
      res.status(400).json({
        error: {
          code: 'invalid_body',
          message: 'Request body must be an object with optional now and limit fields.',
        },
      });
      return;
    }

    try {
      sendJobResult(res, await service.createDueExampleFeedbacks({
        now: body.now,
        limit: body.limit ?? DEFAULT_LIMIT,
      }));
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'transaction_aborted',
          message: 'Example feedback job failed.',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
}
