import type express from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import { hideContent, type AdminHideTargetType, type HideContentResult } from '../services/adminHiding';
import { requireInternalJobSecret } from './internalAuth';

type AdminHidingService = {
  hideContent(params: {
    db: Firestore;
    targetType: AdminHideTargetType;
    targetId: string;
    hiddenReason: string;
    hiddenBy: string;
  }): Promise<HideContentResult>;
};

function parseBody(body: unknown): (
  | {
    status: 'ok';
    targetType: AdminHideTargetType;
    targetId: string;
    hiddenReason: string;
    hiddenBy: string;
  }
  | { status: 'invalid' }
) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'invalid' };
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).every(key => ['targetType', 'targetId', 'hiddenReason', 'hiddenBy'].includes(key))) {
    return { status: 'invalid' };
  }
  if (input.targetType !== 'worry' && input.targetType !== 'delivery' && input.targetType !== 'reply') {
    return { status: 'invalid' };
  }
  if (typeof input.targetId !== 'string' || input.targetId.trim().length === 0) return { status: 'invalid' };
  if (typeof input.hiddenReason !== 'string' || input.hiddenReason.trim().length === 0) return { status: 'invalid' };
  if (typeof input.hiddenBy !== 'string' || input.hiddenBy.trim().length === 0) return { status: 'invalid' };

  return {
    status: 'ok',
    targetType: input.targetType,
    targetId: input.targetId,
    hiddenReason: input.hiddenReason,
    hiddenBy: input.hiddenBy,
  };
}

function sendResult(res: express.Response, result: HideContentResult): void {
  if (result.status === 'hidden') {
    res.status(200).json(result);
    return;
  }

  if (result.status === 'not_found') {
    res.status(404).json({ error: { code: result.code, message: result.message } });
    return;
  }

  if (result.status === 'conflict') {
    res.status(409).json({ error: { code: result.code, message: result.message } });
    return;
  }

  res.status(500).json({
    error: {
      code: result.code,
      message: result.message,
      details: result.details,
    },
  });
}

export function registerAdminHidingRoutes(app: express.Express, deps: {
  db: Firestore | null;
  service?: AdminHidingService;
}): void {
  if (!deps.db) {
    app.post('/api/internal/admin/hide-content', requireInternalJobSecret, (_req, res) => {
      res.status(503).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  const service = deps.service ?? { hideContent };
  app.post('/api/internal/admin/hide-content', requireInternalJobSecret, async (req, res) => {
    const body = parseBody(req.body);
    if (body.status === 'invalid') {
      res.status(400).json({
        error: {
          code: 'invalid_body',
          message: 'Request body must contain targetType, targetId, hiddenReason, and hiddenBy only.',
        },
      });
      return;
    }

    try {
      sendResult(res, await service.hideContent({
        db: deps.db as Firestore,
        targetType: body.targetType,
        targetId: body.targetId,
        hiddenReason: body.hiddenReason,
        hiddenBy: body.hiddenBy,
      }));
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'transaction_aborted',
          message: '숨김 처리 중 문제가 발생했습니다.',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });
}
