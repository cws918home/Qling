import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { createRequireActiveFirebaseAuth, type ActiveAuthenticatedRequest } from './auth';
import { submitReplyFeedbackOnServer } from '../services/replyFeedback/serverFeedback';
import type { ServerReplyFeedbackResult } from '../services/replyFeedback/types';
import type { SimpleProvider } from './moderationResponses';

function sendFeedbackResult(res: express.Response, result: ServerReplyFeedbackResult) {
  if (result.status === 'saved' || result.status === 'rejected') {
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

export function registerFeedbackRoutes(app: express.Express, deps: {
  db: Firestore | null;
  auth: Auth;
  moderationProvider: SimpleProvider;
  submit?: typeof submitReplyFeedbackOnServer;
}): void {
  if (!deps.db) {
    app.post('/api/replies/:replyId/feedback', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  const submit = deps.submit ?? submitReplyFeedbackOnServer;
  app.post(
    '/api/replies/:replyId/feedback',
    createRequireActiveFirebaseAuth({ auth: deps.auth, db: deps.db }),
    async (req, res) => {
      try {
        const authReq = req as ActiveAuthenticatedRequest;
        const result = await submit({
          db: deps.db as Firestore,
          moderationProvider: deps.moderationProvider,
          publisherUid: authReq.auth.uid,
          replyId: req.params.replyId,
          type: req.body?.type,
          comment: req.body?.comment,
        });

        sendFeedbackResult(res, result);
      } catch (error) {
        console.error('Server reply feedback failed:', error);
        res.status(500).json({
          error: {
            code: 'transaction_aborted',
            message: '피드백 저장 중 문제가 발생했습니다.',
          },
        });
      }
    }
  );
}
