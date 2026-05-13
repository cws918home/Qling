import type express from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { requireInternalJobSecret } from './internalAuth';
import { rematchDueDeliveries, type RematchDueDeliveriesResult } from '../services/rematch';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type RematchService = {
  rematchDueDeliveries(params: {
    now?: Date;
    dryRun?: boolean;
    limit?: number;
  }): Promise<RematchDueDeliveriesResult>;
};

function parseBody(body: unknown): (
  | { status: 'ok'; now?: Date; dryRun?: boolean; limit?: number }
  | { status: 'invalid' }
) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'invalid' };
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).every(key => ['now', 'dryRun', 'limit'].includes(key))) return { status: 'invalid' };

  let now: Date | undefined;
  if ('now' in input) {
    if (typeof input.now !== 'string') return { status: 'invalid' };
    now = new Date(input.now);
    if (Number.isNaN(now.getTime())) return { status: 'invalid' };
  }

  let dryRun: boolean | undefined;
  if ('dryRun' in input) {
    if (typeof input.dryRun !== 'boolean') return { status: 'invalid' };
    dryRun = input.dryRun;
  }

  let limit: number | undefined;
  if ('limit' in input) {
    if (typeof input.limit !== 'number' || !Number.isInteger(input.limit) || input.limit <= 0 || input.limit > MAX_LIMIT) return { status: 'invalid' };
    limit = input.limit;
  }

  return { status: 'ok', now, dryRun, limit };
}

function sendResult(res: express.Response, result: RematchDueDeliveriesResult): void {
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

  if (result.status === 'lock_busy') {
    res.status(409).json(result);
    return;
  }

  res.status(200).json(result);
}

export function registerRematchRoutes(app: express.Express, deps: {
  db: Firestore | null;
  messaging: Messaging | null;
  service?: RematchService;
}): void {
  if (!deps.db) {
    app.post('/api/internal/rematch-due-deliveries', requireInternalJobSecret, (_req, res) => {
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
    rematchDueDeliveries: ({ now, dryRun, limit }) => rematchDueDeliveries({
      db: deps.db as Firestore,
      messaging: deps.messaging,
      now,
      dryRun,
      limit: limit ?? DEFAULT_LIMIT,
    }),
  };

  app.post('/api/internal/rematch-due-deliveries', requireInternalJobSecret, async (req, res) => {
    const body = parseBody(req.body);
    if (body.status === 'invalid') {
      res.status(400).json({
        error: {
          code: 'invalid_body',
          message: 'Request body must be an object with optional now, dryRun, and limit fields.',
        },
      });
      return;
    }

    try {
      const result = await service.rematchDueDeliveries({
        now: body.now,
        dryRun: body.dryRun,
        limit: body.limit,
      });
      sendResult(res, result);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'transaction_aborted',
          message: '재매칭 작업 중 문제가 발생했습니다.',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
}
