import type express from 'express';
import type { Request } from 'express';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

export interface AuthenticatedRequest extends Request {
  auth: { uid: string };
  authorProfile: {
    uid: string;
    gender: string;
    interests: string[];
    deleted?: boolean;
  };
}

export interface ActiveAuthenticatedRequest extends Request {
  auth: { uid: string };
  userRecord: {
    uid: string;
    deleted?: boolean;
  };
}

function authError(res: express.Response, status: 401 | 403, code: string, message: string) {
  res.status(status).json({ error: { code, message } });
}

export function parseBearerToken(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function hasCompletePublicationProfile(data: FirebaseFirestore.DocumentData | undefined): data is {
  gender: string;
  interests: string[];
  deleted?: boolean;
} {
  return typeof data?.gender === 'string'
    && (data.gender.trim() === 'male' || data.gender.trim() === 'female')
    && Array.isArray(data.interests)
    && data.interests.some((interest: unknown) => typeof interest === 'string' && interest.trim().length > 0);
}

export function createRequireFirebaseAuth(deps: {
  auth: Pick<Auth, 'verifyIdToken'>;
  db: Firestore;
}): express.RequestHandler {
  return async (req, res, next) => {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      authError(res, 401, 'auth_missing', '로그인이 필요합니다.');
      return;
    }

    let decoded;
    try {
      decoded = await deps.auth.verifyIdToken(token);
    } catch {
      authError(res, 401, 'auth_invalid', '로그인 정보를 확인할 수 없습니다.');
      return;
    }

    const uid = decoded.uid;
    const userDoc = await deps.db.collection('users').doc(uid).get();
    const data = userDoc.data();

    if (data?.deleted === true) {
      authError(res, 403, 'user_deleted', '삭제된 계정입니다.');
      return;
    }

    if (!hasCompletePublicationProfile(data)) {
      authError(res, 403, 'profile_incomplete', '고민을 보내려면 프로필 설정이 필요합니다.');
      return;
    }

    const authReq = req as AuthenticatedRequest;
    authReq.auth = { uid };
    authReq.authorProfile = {
      uid,
      gender: data.gender.trim(),
      interests: data.interests
        .filter((interest: unknown): interest is string => typeof interest === 'string' && interest.trim().length > 0)
        .map((interest: string) => interest.trim()),
      deleted: data.deleted,
    };

    next();
  };
}

export function createRequireActiveFirebaseAuth(deps: {
  auth: Pick<Auth, 'verifyIdToken'>;
  db: Firestore;
}): express.RequestHandler {
  return async (req, res, next) => {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      authError(res, 401, 'auth_missing', '로그인이 필요합니다.');
      return;
    }

    let decoded;
    try {
      decoded = await deps.auth.verifyIdToken(token);
    } catch {
      authError(res, 401, 'auth_invalid', '로그인 정보를 확인할 수 없습니다.');
      return;
    }

    const uid = decoded.uid;
    const userDoc = await deps.db.collection('users').doc(uid).get();
    const data = userDoc.data();

    if (data?.deleted === true) {
      authError(res, 403, 'user_deleted', '삭제된 계정입니다.');
      return;
    }

    const authReq = req as ActiveAuthenticatedRequest;
    authReq.auth = { uid };
    authReq.userRecord = {
      uid,
      deleted: data?.deleted,
    };

    next();
  };
}
