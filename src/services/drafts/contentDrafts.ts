export type DraftMap = Record<string, string>;

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
