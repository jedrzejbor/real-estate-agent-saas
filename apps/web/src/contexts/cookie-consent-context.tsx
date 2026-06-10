'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  clearStoredCookieConsent,
  createAcceptedAllCookieConsent,
  createCookieConsentPreferences,
  createRejectedOptionalCookieConsent,
  hasAnyOptionalCookieConsent,
  hasCookieConsent,
  isCookieConsentCurrent,
  readStoredCookieConsent,
  writeStoredCookieConsent,
  type CookieConsentCategory,
  type CookieConsentChoices,
  type CookieConsentPreferences,
} from '@/lib/cookie-consent';

const COOKIE_CONSENT_CHANGE_EVENT = 'estateflow-cookie-consent-change';

interface CookieConsentContextValue {
  preferences: CookieConsentPreferences | null;
  isHydrated: boolean;
  hasDecision: boolean;
  needsConsent: boolean;
  hasFunctionalConsent: boolean;
  hasAnalyticsConsent: boolean;
  hasMarketingConsent: boolean;
  hasAnyOptionalConsent: boolean;
  canUseCategory: (category: CookieConsentCategory) => boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (choices: CookieConsentChoices) => void;
  resetConsent: () => void;
}

const CookieConsentContext =
  createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const preferences = useSyncExternalStore(
    subscribeToCookieConsent,
    getCookieConsentSnapshot,
    getServerCookieConsentSnapshot,
  );
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  const persistPreferences = useCallback(
    (nextPreferences: CookieConsentPreferences) => {
      writeStoredCookieConsent(nextPreferences);
      notifyCookieConsentChanged();
    },
    [],
  );

  const acceptAll = useCallback(() => {
    persistPreferences(createAcceptedAllCookieConsent());
  }, [persistPreferences]);

  const rejectOptional = useCallback(() => {
    persistPreferences(createRejectedOptionalCookieConsent());
  }, [persistPreferences]);

  const savePreferences = useCallback(
    (choices: CookieConsentChoices) => {
      persistPreferences(createCookieConsentPreferences(choices));
    },
    [persistPreferences],
  );

  const resetConsent = useCallback(() => {
    clearStoredCookieConsent();
    notifyCookieConsentChanged();
  }, []);

  const value = useMemo<CookieConsentContextValue>(() => {
    const hasDecision = isCookieConsentCurrent(preferences);

    return {
      preferences,
      isHydrated,
      hasDecision,
      needsConsent: isHydrated && !hasDecision,
      hasFunctionalConsent: hasCookieConsent(preferences, 'functional'),
      hasAnalyticsConsent: hasCookieConsent(preferences, 'analytics'),
      hasMarketingConsent: hasCookieConsent(preferences, 'marketing'),
      hasAnyOptionalConsent: hasAnyOptionalCookieConsent(preferences),
      canUseCategory: (category) => hasCookieConsent(preferences, category),
      acceptAll,
      rejectOptional,
      savePreferences,
      resetConsent,
    };
  }, [
    acceptAll,
    isHydrated,
    preferences,
    rejectOptional,
    resetConsent,
    savePreferences,
  ]);

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);

  if (!context) {
    throw new Error(
      'useCookieConsent must be used within <CookieConsentProvider>',
    );
  }

  return context;
}

let cachedRawConsent: string | null | undefined;
let cachedConsent: CookieConsentPreferences | null = null;

function getCookieConsentSnapshot(): CookieConsentPreferences | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let rawConsent: string | null = null;

  try {
    rawConsent = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  } catch {
    rawConsent = null;
  }

  if (rawConsent === cachedRawConsent) {
    return cachedConsent;
  }

  cachedRawConsent = rawConsent;
  cachedConsent = readStoredCookieConsent();
  return cachedConsent;
}

function getServerCookieConsentSnapshot(): CookieConsentPreferences | null {
  return null;
}

function subscribeToCookieConsent(onStoreChange: () => void): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.key === COOKIE_CONSENT_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, onStoreChange);
  };
}

function notifyCookieConsentChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGE_EVENT));
}

function getHydrationSnapshot(): boolean {
  return true;
}

function getServerHydrationSnapshot(): boolean {
  return false;
}

function subscribeToHydration(): () => void {
  return () => undefined;
}
