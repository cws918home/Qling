import {
  FieldValue,
  type Firestore,
} from 'firebase-admin/firestore';
import type {
  CompleteOnboardingResult,
  NicknameReservationRepository,
  NicknameReservationResult,
  UserProfileWriteModel,
} from './types';

function profileData(params: UserProfileWriteModel, timestamp: unknown) {
  return {
    uid: params.uid,
    nickname: params.nickname,
    normalizedNickname: params.normalizedNickname,
    gender: params.gender,
    age: params.age,
    interests: [...params.interests],
    createdAt: timestamp,
    updatedAt: timestamp,
    lastActive: timestamp,
  };
}

export function createUserProfileFirestoreRepository(params: {
  readonly db: Firestore;
}): NicknameReservationRepository {
  const { db } = params;

  return {
    async reserveNickname({ uid, nickname, normalizedNickname }): Promise<NicknameReservationResult> {
      return db.runTransaction(async transaction => {
        const reservationRef = db.collection('nicknameReservations').doc(normalizedNickname);
        const userRef = db.collection('users').doc(uid);
        const [reservationDoc, userDoc] = await Promise.all([
          transaction.get(reservationRef),
          transaction.get(userRef),
        ]);

        const existingReservation = reservationDoc.data();
        if (reservationDoc.exists && existingReservation?.uid !== uid) {
          return {
            status: 'duplicate' as const,
            code: 'nickname_taken',
            message: '이미 사용 중인 닉네임이에요.',
          };
        }

        const existingUser = userDoc.data();
        if (
          typeof existingUser?.normalizedNickname === 'string'
          && existingUser.normalizedNickname !== normalizedNickname
        ) {
          return {
            status: 'conflict' as const,
            code: 'normalized_name_conflict',
            message: '이미 다른 닉네임 예약이 있어요. 다시 시도해주세요.',
          };
        }

        transaction.set(reservationRef, {
          uid,
          nickname,
          normalizedNickname,
          createdAt: existingReservation?.createdAt ?? FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        return {
          status: 'available' as const,
          uid,
          nickname,
          normalizedNickname,
        };
      });
    },

    async completeOnboarding(params): Promise<CompleteOnboardingResult> {
      return db.runTransaction(async transaction => {
        const reservationRef = db.collection('nicknameReservations').doc(params.normalizedNickname);
        const userRef = db.collection('users').doc(params.uid);
        const reservationDoc = await transaction.get(reservationRef);
        const reservation = reservationDoc.data();

        if (!reservationDoc.exists) {
          return {
            status: 'reservation_missing' as const,
            code: 'nickname_reservation_missing',
            message: '닉네임 중복 확인을 먼저 완료해주세요.',
          };
        }
        if (reservation?.uid !== params.uid) {
          return {
            status: 'reservation_conflict' as const,
            code: 'nickname_reservation_conflict',
            message: '닉네임 예약 정보가 일치하지 않아요. 다시 확인해주세요.',
          };
        }

        const timestamp = FieldValue.serverTimestamp();
        transaction.set(userRef, profileData(params, timestamp), { merge: true });

        return {
          status: 'completed' as const,
          profile: params,
        };
      });
    },
  };
}
