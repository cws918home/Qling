import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { deleteAllPushTokensForUser } from '../notifications';
import type { UserAccountClock, UserAccountRepository } from './types';

export function createServerTimestampClock(): UserAccountClock {
  return {
    now: () => FieldValue.serverTimestamp(),
  };
}

export function createFirestoreUserAccountRepository(params: {
  db: Firestore;
}): UserAccountRepository {
  return {
    async softDeleteUser(input) {
      await params.db.collection('users').doc(input.uid).set({
        deleted: true,
        deletedAt: input.deletedAt,
        updatedAt: input.updatedAt,
      }, { merge: true });
    },
    deletePushTokens: input => deleteAllPushTokensForUser({
      db: params.db,
      uid: input.uid,
    }),
  };
}
