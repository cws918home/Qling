import { selectExampleSeeds } from './policy';
import { createExampleWorriesFirestoreRepository } from './firestoreRepository';
import type { CreateExamplesForUserParams, CreateExamplesForUserResult } from './types';

export async function createExamplesForUser(
  params: CreateExamplesForUserParams
): Promise<CreateExamplesForUserResult> {
  if (!params.repository && !params.db) {
    return {
      status: 'server_error',
      code: 'firebase_unavailable',
      message: 'Firebase Admin is not initialized.',
    };
  }

  const repository = params.repository ?? createExampleWorriesFirestoreRepository({ db: params.db! });

  try {
    const profile = await repository.readUserProfile(params.uid);
    if (!profile) {
      return {
        status: 'server_error',
        code: 'profile_missing',
        message: 'User profile is required before creating examples.',
      };
    }
    if (profile.exampleWorriesCreatedAt) {
      return {
        status: 'idempotent',
        uid: params.uid,
        worryIds: [],
        deliveryIds: profile.exampleDeliveryIds ?? [],
        seedIds: profile.exampleWorrySeedIds ?? [],
      };
    }

    const seeds = await repository.listSelectableSeeds();
    const selected = selectExampleSeeds({
      seeds,
      interests: profile.interests,
    });
    return await repository.createExamplesOnce({
      uid: params.uid,
      seeds: selected,
      now: params.now ?? new Date(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'profile_missing') {
      return {
        status: 'server_error',
        code: 'profile_missing',
        message: 'User profile is required before creating examples.',
      };
    }
    return {
      status: 'server_error',
      code: 'transaction_aborted',
      message: 'Example worries could not be created.',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
