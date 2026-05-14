import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { parseBearerToken } from './auth';
import { deleteMyAccount } from '../services/userAccount';
import {
  createFirestoreUserAccountRepository,
  createServerTimestampClock,
} from '../services/userAccount/firestoreRepository';
import type { UserAccountClock, UserAccountRepository } from '../services/userAccount/types';

function deletionAuthError(res: express.Response, status: 401, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

async function requireDeletionAuth(req: express.Request, res: express.Response, auth: Pick<Auth, 'verifyIdToken'>) {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    deletionAuthError(res, 401, 'auth_missing', '로그인이 필요합니다.');
    return null;
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    deletionAuthError(res, 401, 'auth_invalid', '로그인 정보를 확인할 수 없습니다.');
    return null;
  }
}

export function registerUserAccountRoutes(app: express.Express, deps: {
  db: Firestore | null;
  auth: Pick<Auth, 'verifyIdToken'>;
  repository?: UserAccountRepository;
  clock?: UserAccountClock;
  deleteAccount?: typeof deleteMyAccount;
}): void {
  if (!deps.db && !deps.repository) {
    app.post('/api/users/me/delete', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    return;
  }

  app.post('/api/users/me/delete', async (req, res) => {
    const uid = await requireDeletionAuth(req, res, deps.auth);
    if (!uid) return;

    if (req.body?.confirm !== true) {
      res.status(400).json({
        error: {
          code: 'confirmation_required',
          message: '계정 삭제 확인이 필요합니다.',
        },
      });
      return;
    }

    try {
      const repository = deps.repository ?? createFirestoreUserAccountRepository({ db: deps.db as Firestore });
      const clock = deps.clock ?? createServerTimestampClock();
      const deleteAccount = deps.deleteAccount ?? deleteMyAccount;
      await deleteAccount({ uid, repository, clock });
      res.status(200).json({ status: 'deleted' });
    } catch (error) {
      console.error('Account deletion failed:', error);
      res.status(500).json({
        error: {
          code: 'account_deletion_failed',
          message: '계정 삭제 처리 중 문제가 발생했습니다.',
        },
      });
    }
  });
}
