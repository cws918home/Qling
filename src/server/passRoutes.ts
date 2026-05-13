import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { createRequireActiveFirebaseAuth, type ActiveAuthenticatedRequest } from './auth';
import {
  passDelivery,
  validatePassBody,
  type ServerPassDeliveryResult,
} from '../services/deliveries';

type PassDeliveryService = {
  passDelivery(params: { uid: string; deliveryId: string }): Promise<ServerPassDeliveryResult>;
};

function publicPassResult(result: Extract<ServerPassDeliveryResult, { status: 'passed' }>) {
  return {
    status: result.status,
    deliveryId: result.deliveryId,
    ...(result.replacementDeliveryId ? { replacementDeliveryId: result.replacementDeliveryId } : {}),
    replacementStatus: result.replacementStatus,
  };
}

function sendPassResult(res: express.Response, result: ServerPassDeliveryResult) {
  if (result.status === 'passed') {
    res.status(200).json(publicPassResult(result));
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

  if (result.status === 'conflict') {
    res.status(409).json({ error: { code: result.code, message: result.message } });
    return;
  }

  res.status(500).json({ error: { code: result.code, message: result.message, details: result.details } });
}

export function registerPassRoutes(app: express.Express, deps: {
  db: Firestore | null;
  messaging: Messaging | null;
  auth: Auth;
  service?: PassDeliveryService;
}): void {
  if (!deps.db) {
    app.post('/api/deliveries/:deliveryId/pass', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  const service = deps.service ?? {
    passDelivery: ({ uid, deliveryId }) => passDelivery({
      db: deps.db as Firestore,
      messaging: deps.messaging,
      uid,
      deliveryId,
    }),
  };

  app.post(
    '/api/deliveries/:deliveryId/pass',
    createRequireActiveFirebaseAuth({ auth: deps.auth, db: deps.db }),
    async (req, res) => {
      try {
        const validation = validatePassBody(req.body);
        if (validation.status === 'invalid') {
          sendPassResult(res, {
            status: 'validation_error',
            code: 'invalid_body',
            message: validation.message,
          });
          return;
        }

        const authReq = req as ActiveAuthenticatedRequest;
        const result = await service.passDelivery({
          uid: authReq.auth.uid,
          deliveryId: req.params.deliveryId,
        });

        sendPassResult(res, result);
      } catch (error) {
        console.error('Server delivery pass failed:', error);
        res.status(500).json({
          error: {
            code: 'transaction_aborted',
            message: '패스 처리 중 문제가 발생했습니다.',
          },
        });
      }
    }
  );
}
