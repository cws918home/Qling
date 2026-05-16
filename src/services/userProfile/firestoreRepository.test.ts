import test from 'node:test';
import assert from 'node:assert/strict';
import type { NicknameReservationRepository } from './types';

type Reservation = {
  uid: string;
  nickname: string;
  normalizedNickname: string;
};

function createMemoryRepository(options: {
  readonly failNextReserve?: boolean;
} = {}): NicknameReservationRepository & {
  readonly reservations: Map<string, Reservation>;
  readonly profiles: Map<string, unknown>;
} {
  const reservations = new Map<string, Reservation>();
  const profiles = new Map<string, unknown>();
  let failNextReserve = options.failNextReserve === true;

  return {
    reservations,
    profiles,
    async reserveNickname(params) {
      if (failNextReserve) {
        failNextReserve = false;
        return {
          status: 'conflict',
          code: 'transaction_conflict',
          message: '동시에 요청이 들어왔어요. 다시 시도해주세요.',
        };
      }

      const existing = reservations.get(params.normalizedNickname);
      if (existing && existing.uid !== params.uid) {
        return {
          status: 'duplicate',
          code: 'nickname_taken',
          message: '이미 사용 중인 닉네임이에요.',
        };
      }

      const existingProfile = profiles.get(params.uid) as { normalizedNickname?: string } | undefined;
      if (existingProfile?.normalizedNickname && existingProfile.normalizedNickname !== params.normalizedNickname) {
        return {
          status: 'conflict',
          code: 'normalized_name_conflict',
          message: '이미 다른 닉네임 예약이 있어요. 다시 시도해주세요.',
        };
      }

      reservations.set(params.normalizedNickname, params);
      return { status: 'available', ...params };
    },
    async completeOnboarding(params) {
      const reservation = reservations.get(params.normalizedNickname);
      if (!reservation) {
        return {
          status: 'reservation_missing',
          code: 'nickname_reservation_missing',
          message: '닉네임 중복 확인을 먼저 완료해주세요.',
        };
      }
      if (reservation.uid !== params.uid) {
        return {
          status: 'reservation_conflict',
          code: 'nickname_reservation_conflict',
          message: '닉네임 예약 정보가 일치하지 않아요. 다시 확인해주세요.',
        };
      }
      profiles.set(params.uid, params);
      return { status: 'completed', profile: params };
    },
  };
}

test('duplicate reservation rejects another uid for the same normalized nickname', async () => {
  const repo = createMemoryRepository();
  assert.equal((await repo.reserveNickname({ uid: 'u1', nickname: 'QLING', normalizedNickname: 'qling' })).status, 'available');

  assert.deepEqual(await repo.reserveNickname({ uid: 'u2', nickname: 'qling', normalizedNickname: 'qling' }), {
    status: 'duplicate',
    code: 'nickname_taken',
    message: '이미 사용 중인 닉네임이에요.',
  });
});

test('normalized-name conflict rejects changing an already completed profile nickname', async () => {
  const repo = createMemoryRepository();
  await repo.reserveNickname({ uid: 'u1', nickname: 'QLING', normalizedNickname: 'qling' });
  await repo.completeOnboarding({
    uid: 'u1',
    nickname: 'QLING',
    normalizedNickname: 'qling',
    gender: 'female',
    age: 20,
    interests: ['워라밸'],
  });

  assert.deepEqual(await repo.reserveNickname({ uid: 'u1', nickname: '라미', normalizedNickname: '라미' }), {
    status: 'conflict',
    code: 'normalized_name_conflict',
    message: '이미 다른 닉네임 예약이 있어요. 다시 시도해주세요.',
  });
});

test('transaction conflict maps to retry-compatible conflict status', async () => {
  const repo = createMemoryRepository({ failNextReserve: true });

  assert.deepEqual(await repo.reserveNickname({ uid: 'u1', nickname: '라미', normalizedNickname: '라미' }), {
    status: 'conflict',
    code: 'transaction_conflict',
    message: '동시에 요청이 들어왔어요. 다시 시도해주세요.',
  });
});

test('concurrent race has exactly one available reservation for a normalized nickname', async () => {
  const repo = createMemoryRepository();
  const [first, second] = await Promise.all([
    repo.reserveNickname({ uid: 'u1', nickname: '라미', normalizedNickname: '라미' }),
    repo.reserveNickname({ uid: 'u2', nickname: '라미', normalizedNickname: '라미' }),
  ]);

  assert.deepEqual([first.status, second.status].sort(), ['available', 'duplicate']);
  assert.equal(repo.reservations.get('라미')?.uid, 'u1');
});

test('completion requires a matching normalized nickname reservation', async () => {
  const repo = createMemoryRepository();
  assert.equal((await repo.completeOnboarding({
    uid: 'u1',
    nickname: '라미',
    normalizedNickname: '라미',
    gender: 'female',
    age: 20,
    interests: ['워라밸'],
  })).status, 'reservation_missing');

  await repo.reserveNickname({ uid: 'u2', nickname: '라미', normalizedNickname: '라미' });
  assert.equal((await repo.completeOnboarding({
    uid: 'u1',
    nickname: '라미',
    normalizedNickname: '라미',
    gender: 'female',
    age: 20,
    interests: ['워라밸'],
  })).status, 'reservation_conflict');
});
