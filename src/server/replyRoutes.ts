import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { createRequireActiveFirebaseAuth, type ActiveAuthenticatedRequest } from './auth';
import {
  createReplyPublicationService,
  type ReplyModerationProvider,
  type ServerPublishReplyResult,
} from '../services/replyPublication/server';

type ReplyPublicationService = ReturnType<typeof createReplyPublicationService>;

function sendReplyResult(res: express.Response, result: ServerPublishReplyResult) {
  if (result.status === 'published' || result.status === 'rejected') {
    res.status(200).json(result);
    return;
  }

  if (result.status === 'validation_error') {
    res.status(400).json({ error: { code: result.code, message: result.message } });
    return;
  }

  if (result.status === 'provider_error') {
    res.status(502).json({ error: { code: result.code, message: result.message, details: result.details } });
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

export function registerReplyRoutes(app: express.Express, deps: {
  db: Firestore | null;
  messaging: Messaging | null;
  auth: Auth;
  moderationProvider: ReplyModerationProvider;
  service?: ReplyPublicationService;
}): void {
  if (!deps.db) {
    app.post('/api/deliveries/:deliveryId/replies', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  const service = deps.service ?? createReplyPublicationService({
    db: deps.db,
    messaging: deps.messaging,
    moderationProvider: deps.moderationProvider,
  });

  app.post(
    '/api/deliveries/:deliveryId/replies',
    createRequireActiveFirebaseAuth({ auth: deps.auth, db: deps.db }),
    async (req, res) => {
      try {
        const authReq = req as ActiveAuthenticatedRequest;
        const result = await service.publishReplyForDelivery({
          replierUid: authReq.auth.uid,
          deliveryId: req.params.deliveryId,
          content: req.body?.content,
        });

        sendReplyResult(res, result);
      } catch (error) {
        console.error('Server reply publication failed:', error);
        res.status(500).json({
          error: {
            code: 'transaction_aborted',
            message: '답장 저장 중 문제가 발생했습니다.',
          },
        });
      }
    }
  );
}
