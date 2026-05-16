import type express from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { createRequireActiveFirebaseAuth, type ActiveAuthenticatedRequest } from './auth';
import { completeOnboarding, reserveNickname } from '../services/userProfile/onboardingProfile';
import { validateAge, validateNickname, isValidGender, normalizeInterests } from '../services/userProfile/profileValidation';
import { createUserProfileFirestoreRepository } from '../services/userProfile/firestoreRepository';
import type { NicknameReservationRepository } from '../services/userProfile/types';

function sendServiceResult(res: express.Response, result: { status: string; code?: string; message?: string }) {
  if (result.status === 'available' || result.status === 'completed') {
    res.status(200).json(result);
    return;
  }
  if (result.status === 'duplicate') {
    res.status(409).json(result);
    return;
  }
  if (result.status === 'invalid') {
    res.status(400).json({ error: { code: result.code, message: result.message } });
    return;
  }
  res.status(409).json({ error: { code: result.code, message: result.message } });
}

export function registerUserProfileRoutes(app: express.Express, deps: {
  readonly db: Firestore | null;
  readonly auth: Pick<Auth, 'verifyIdToken'>;
  readonly repository?: NicknameReservationRepository;
}): void {
  if (!deps.db && !deps.repository) {
    app.post('/api/users/me/nickname-reservation', (_req, res) => {
      res.status(503).json({ error: { code: 'firebase_unavailable', message: 'Firebase Admin is not initialized.' } });
    });
    app.post('/api/users/me/onboarding-profile', (_req, res) => {
      res.status(503).json({ error: { code: 'firebase_unavailable', message: 'Firebase Admin is not initialized.' } });
    });
    return;
  }

  const requireAuth = createRequireActiveFirebaseAuth({
    auth: deps.auth,
    db: deps.db as Firestore,
  });

  const repository = deps.repository ?? createUserProfileFirestoreRepository({ db: deps.db as Firestore });

  app.post('/api/users/me/nickname-reservation', requireAuth, async (req, res) => {
    const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname : '';
    const authReq = req as ActiveAuthenticatedRequest;
    sendServiceResult(res, await reserveNickname({
      uid: authReq.auth.uid,
      nickname,
      repository,
    }));
  });

  app.post('/api/users/me/onboarding-profile', requireAuth, async (req, res) => {
    const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname : '';
    const nicknameValidation = validateNickname(nickname);
    const ageValidation = validateAge(String(req.body?.age ?? ''));
    const gender = typeof req.body?.gender === 'string' && isValidGender(req.body.gender) ? req.body.gender : '';
    const interests = normalizeInterests(Array.isArray(req.body?.interests) ? req.body.interests : []);

    if (!nicknameValidation.valid || !ageValidation.valid || !gender || interests.length === 0) {
      res.status(400).json({
        error: {
          code: 'invalid_profile',
          message: '온보딩 필수 입력값을 확인해주세요.',
        },
      });
      return;
    }

    const authReq = req as ActiveAuthenticatedRequest;
    sendServiceResult(res, await completeOnboarding({
      uid: authReq.auth.uid,
      draft: {
        nickname,
        gender,
        age: String(ageValidation.age),
        interests,
      },
      repository,
    }));
  });
}
