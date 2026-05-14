import type {
  DeleteMyAccountResult,
  UserAccountClock,
  UserAccountRepository,
} from './types';

export async function deleteMyAccount(params: {
  uid: string;
  repository: UserAccountRepository;
  clock: UserAccountClock;
}): Promise<DeleteMyAccountResult> {
  const deletedAt = params.clock.now();
  await params.repository.softDeleteUser({
    uid: params.uid,
    deletedAt,
    updatedAt: deletedAt,
  });

  const cleanup = await params.repository.deletePushTokens({ uid: params.uid });
  return {
    status: 'deleted',
    deletedTokenCount: cleanup.deletedCount,
  };
}
