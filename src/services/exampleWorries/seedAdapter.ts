import type { ExampleWorrySeed } from './types';

function cleanCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
  ));
}

export function adaptExampleWorrySeed(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): ExampleWorrySeed | null {
  if (!data) return null;
  if (typeof data.content !== 'string' || data.content.trim().length === 0) return null;
  if (data.status !== 'active' && data.status !== 'inactive') return null;
  const categories = cleanCategories(data.categories);
  if (categories.length === 0) return null;

  return {
    id,
    content: data.content.trim(),
    categories,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function adaptActiveExampleWorrySeed(
  id: string,
  data: FirebaseFirestore.DocumentData | undefined
): ExampleWorrySeed | null {
  const seed = adaptExampleWorrySeed(id, data);
  return seed?.status === 'active' ? seed : null;
}
