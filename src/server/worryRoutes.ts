import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import { createRequireFirebaseAuth, type AuthenticatedRequest } from './auth';
import {
  publishWorryOnServer,
  type WorryModerationProvider,
} from '../services/worryPublication/server';

function sendPublicationResult(res: express.Response, result: Awaited<ReturnType<typeof publishWorryOnServer>>) {
  if (result.status === 'published') {
    res.status(200).json(result);
    return;
  }

  if (result.status === 'rejected') {
    const { targetId: _targetId, ...body } = result;
    res.status(200).json(body);
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

  res.status(500).json({ error: { code: result.code, message: result.message, details: result.details } });
}

export function registerWorryRoutes(app: express.Express, deps: {
  db: Firestore | null;
  messaging: Messaging | null;
  auth: Auth;
  moderationProvider: WorryModerationProvider;
}): void {
  if (!deps.db) {
    app.post('/api/worries/publish', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  app.post(
    '/api/worries/publish',
    createRequireFirebaseAuth({ auth: deps.auth, db: deps.db }),
    async (req, res) => {
      try {
        const authReq = req as AuthenticatedRequest;
        const result = await publishWorryOnServer({
          db: deps.db as Firestore,
          messaging: deps.messaging,
          author: {
            uid: authReq.authorProfile.uid,
            gender: authReq.authorProfile.gender,
            interests: authReq.authorProfile.interests,
          },
          content: req.body?.content,
          moderationProvider: deps.moderationProvider,
        });

        sendPublicationResult(res, result);
      } catch (error) {
        console.error('Server worry publication failed:', error);
        res.status(500).json({
          error: {
            code: 'transaction_aborted',
            message: '고민 전달 중 문제가 발생했습니다.',
          },
        });
      }
    }
  );
}
