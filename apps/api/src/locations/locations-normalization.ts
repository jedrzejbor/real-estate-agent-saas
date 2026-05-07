export function normalizeLocationSearch(value?: string | null): string | null {
  const normalized = value
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return normalized || null;
}

export function normalizeLocationSlug(value?: string | null): string | null {
  return normalizeLocationSearch(value)?.replace(/\s+/g, '-') ?? null;
}
