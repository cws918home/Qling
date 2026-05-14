export function withAuthProfileUid<T extends object>(
  profileData: T,
  authUid: string
): T & { uid: string } {
  return {
    ...profileData,
    uid: authUid,
  };
}
