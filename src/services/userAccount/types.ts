export type DeleteMyAccountResult = {
  status: 'deleted';
  deletedTokenCount: number;
};

export type UserAccountClock = {
  now(): unknown;
};

export type UserAccountRepository = {
  softDeleteUser(params: {
    uid: string;
    deletedAt: unknown;
    updatedAt: unknown;
  }): Promise<void>;
  deletePushTokens(params: { uid: string }): Promise<{ deletedCount: number }>;
};
