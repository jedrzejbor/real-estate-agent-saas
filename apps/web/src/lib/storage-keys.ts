export const STORAGE_KEYS = {
  theme: 'podadresem-theme',
  legacyTheme: 'estateflow-theme',
  cookieConsent: 'podadresem-cookie-consent',
  legacyCookieConsent: 'estateflow-cookie-consent',
  publicListingWizard: 'podadresem.publicListingWizard.v1',
  legacyPublicListingWizard: 'estateflow.publicListingWizard.v1',
  dashboardOnboardingPrefix: 'podadresem.dashboard-onboarding',
  legacyDashboardOnboardingPrefix: 'estateflow.dashboard-onboarding',
  listingDescriptionAssistantPrefix:
    'podadresem:listing-description-assistant',
  legacyListingDescriptionAssistantPrefix:
    'estateflow:listing-description-assistant',
} as const;

type ReadWriteStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readMigratedStorageValue(
  storage: ReadWriteStorage,
  key: string,
  legacyKey: string,
): string | null {
  const currentValue = storage.getItem(key);
  if (currentValue !== null) {
    return currentValue;
  }

  const legacyValue = storage.getItem(legacyKey);
  if (legacyValue !== null) {
    storage.setItem(key, legacyValue);
  }

  return legacyValue;
}
