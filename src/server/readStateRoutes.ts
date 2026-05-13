import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { createRequireActiveFirebaseAuth, type ActiveAuthenticatedRequest } from './auth';
import {
  createReadStateService,
  type ServerMarkDeliveryReadResult,
  type ServerMarkRepliesForWorryReadResult,
} from '../services/readState/server';

type ReadStateService = ReturnType<typeof createReadStateService>;

function sendDeliveryReadResult(res: express.Response, result: ServerMarkDeliveryReadResult) {
  if (result.status === 'read') {
    res.status(200).json(result);
    return;
  }

  if (result.status === 'forbidden') {
    res.status(403).json({ error: { code: result.code, message: result.message } });
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

  res.status(500).json({ error: { code: result.code, message: result.message, details: result.details } });
}

function sendRepliesReadResult(res: express.Response, result: ServerMarkRepliesForWorryReadResult) {
  if (result.status === 'read') {
    res.status(200).json(result);
    return;
  }

  if (result.status === 'validation_error') {
    res.status(400).json({ error: { code: result.code, message: result.message } });
    return;
  }

  if (result.status === 'forbidden') {
    res.status(403).json({ error: { code: result.code, message: result.message } });
    return;
  }

  if (result.status === 'not_found') {
    res.status(404).json({ error: { code: result.code, message: result.message } });
    return;
  }

  res.status(500).json({ error: { code: result.code, message: result.message, details: result.details } });
}

function registerUnavailableRoutes(app: express.Express) {
  const handler = (_req: express.Request, res: express.Response) => {
    res.status(500).json({
      error: {
        code: 'firebase_unavailable',
        message: 'Firebase Admin is not initialized.',
      },
    });
  };

  app.post('/api/deliveries/:deliveryId/read', handler);
  app.post('/api/worries/:worryId/replies/read', handler);
}

export function registerReadStateRoutes(app: express.Express, deps: {
  db: Firestore | null;
  auth: Auth;
  service?: ReadStateService;
}): void {
  if (!deps.db) {
    registerUnavailableRoutes(app);
    return;
  }

  const service = deps.service ?? createReadStateService({ db: deps.db });
  const requireAuth = createRequireActiveFirebaseAuth({ auth: deps.auth, db: deps.db });

  app.post('/api/deliveries/:deliveryId/read', requireAuth, async (req, res) => {
    try {
      const authReq = req as ActiveAuthenticatedRequest;
      const result = await service.markDeliveryRead({
        recipientUid: authReq.auth.uid,
        deliveryId: req.params.deliveryId,
      });
      sendDeliveryReadResult(res, result);
    } catch (error) {
      console.error('Server delivery read-state failed:', error);
      res.status(500).json({
        error: {
          code: 'transaction_aborted',
          message: '읽음 상태 저장 중 문제가 발생했습니다.',
        },
      });
    }
  });

  app.post('/api/worries/:worryId/replies/read', requireAuth, async (req, res) => {
    try {
      const authReq = req as ActiveAuthenticatedRequest;
      const result = await service.markRepliesForWorryRead({
        authorUid: authReq.auth.uid,
        worryId: req.params.worryId,
        body: req.body,
      });
      sendRepliesReadResult(res, result);
    } catch (error) {
      console.error('Server reply read-state failed:', error);
      res.status(500).json({
        error: {
          code: 'transaction_aborted',
          message: '답장 읽음 상태 저장 중 문제가 발생했습니다.',
        },
      });
    }
  });
}
