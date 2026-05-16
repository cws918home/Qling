export type DraftMap = Record<string, string>;

let storedDrafts: DraftMap = {};

export const WRITE_WORRY_DRAFT_KEY = 'write_worry';

export function replyDraftKey(deliveryId: string): string {
  return deliveryId;
}

export function setDraft(drafts: DraftMap, key: string, content: string): DraftMap {
  return { ...drafts, [key]: content };
}

export function clearDraft(drafts: DraftMap, key: string): DraftMap {
  const { [key]: _cleared, ...rest } = drafts;
  return rest;
}

export function getDraft(drafts: DraftMap, key: string | null | undefined): string {
  return key ? drafts[key] ?? '' : '';
}

export function getStoredDraft(key: string | null | undefined): string {
  return getDraft(storedDrafts, key);
}

export function setStoredDraft(key: string, content: string): void {
  storedDrafts = setDraft(storedDrafts, key, content);
}

export function clearStoredDraft(key: string): void {
  storedDrafts = clearDraft(storedDrafts, key);
}

export function resetStoredDraftsForTest(): void {
  storedDrafts = {};
}
