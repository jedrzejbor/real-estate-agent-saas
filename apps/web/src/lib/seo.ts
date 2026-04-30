const DEFAULT_SITE_URL = 'http://localhost:3000';

export function getSiteUrl(): URL {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    DEFAULT_SITE_URL;

  try {
    return new URL(rawUrl);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export function absoluteUrl(pathOrUrl: string | null | undefined): string {
  const siteUrl = getSiteUrl();

  if (!pathOrUrl) {
    return siteUrl.toString();
  }

  try {
    return new URL(pathOrUrl).toString();
  } catch {
    return new URL(pathOrUrl, siteUrl).toString();
  }
}

export function compactJsonLd<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => compactJsonLd(item))
      .filter((item) => item !== undefined && item !== null) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, compactJsonLd(item)])
        .filter(([, item]) => item !== undefined && item !== null && item !== ''),
    ) as T;
  }

  return value;
}
