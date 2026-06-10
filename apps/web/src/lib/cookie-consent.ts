export const COOKIE_CONSENT_STORAGE_KEY = 'estateflow-cookie-consent';
export const COOKIE_CONSENT_VERSION = '2026-06-10';

export type CookieConsentOptionalCategory =
  | 'functional'
  | 'analytics'
  | 'marketing';

export type CookieConsentCategory =
  | 'necessary'
  | CookieConsentOptionalCategory;

export interface CookieConsentPreferences {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  version: string;
}

export type CookieConsentChoices = Partial<
  Pick<CookieConsentPreferences, CookieConsentOptionalCategory>
>;

const OPTIONAL_CATEGORIES: CookieConsentOptionalCategory[] = [
  'functional',
  'analytics',
  'marketing',
];

export function createCookieConsentPreferences(
  choices: CookieConsentChoices,
  now = new Date(),
): CookieConsentPreferences {
  return {
    necessary: true,
    functional: Boolean(choices.functional),
    analytics: Boolean(choices.analytics),
    marketing: Boolean(choices.marketing),
    updatedAt: now.toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
}

export function createAcceptedAllCookieConsent(
  now = new Date(),
): CookieConsentPreferences {
  return createCookieConsentPreferences(
    {
      functional: true,
      analytics: true,
      marketing: true,
    },
    now,
  );
}

export function createRejectedOptionalCookieConsent(
  now = new Date(),
): CookieConsentPreferences {
  return createCookieConsentPreferences(
    {
      functional: false,
      analytics: false,
      marketing: false,
    },
    now,
  );
}

export function hasCookieConsent(
  preferences: CookieConsentPreferences | null,
  category: CookieConsentCategory,
): boolean {
  if (category === 'necessary') {
    return true;
  }

  return Boolean(preferences?.[category]);
}

export function isCookieConsentCurrent(
  preferences: CookieConsentPreferences | null,
): preferences is CookieConsentPreferences {
  return Boolean(preferences && preferences.version === COOKIE_CONSENT_VERSION);
}

export function parseStoredCookieConsent(
  rawValue: string | null,
): CookieConsentPreferences | null {
  if (!rawValue) {
    return null;
  }

  try {
    return sanitizeCookieConsentPreferences(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function sanitizeCookieConsentPreferences(
  value: unknown,
): CookieConsentPreferences | null {
  if (!isRecord(value) || value.necessary !== true) {
    return null;
  }

  if (
    typeof value.functional !== 'boolean' ||
    typeof value.analytics !== 'boolean' ||
    typeof value.marketing !== 'boolean' ||
    typeof value.updatedAt !== 'string' ||
    typeof value.version !== 'string'
  ) {
    return null;
  }

  const parsedDate = Date.parse(value.updatedAt);
  if (!Number.isFinite(parsedDate)) {
    return null;
  }

  return {
    necessary: true,
    functional: value.functional,
    analytics: value.analytics,
    marketing: value.marketing,
    updatedAt: value.updatedAt,
    version: value.version,
  };
}

export function readStoredCookieConsent(
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
): CookieConsentPreferences | null {
  if (!storage) {
    return null;
  }

  try {
    return parseStoredCookieConsent(storage.getItem(COOKIE_CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredCookieConsent(
  preferences: CookieConsentPreferences,
  storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredCookieConsent(
  storage: Pick<Storage, 'removeItem'> | null = getBrowserStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function hasAnyOptionalCookieConsent(
  preferences: CookieConsentPreferences | null,
): boolean {
  return OPTIONAL_CATEGORIES.some((category) =>
    hasCookieConsent(preferences, category),
  );
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
