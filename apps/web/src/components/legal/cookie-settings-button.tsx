'use client';

import { useCookieConsent } from '@/contexts/cookie-consent-context';

export function CookieSettingsButton() {
  const { openPreferences } = useCookieConsent();

  return (
    <button
      type="button"
      className="text-sm text-muted-foreground transition-colors hover:text-primary"
      onClick={openPreferences}
    >
      Ustawienia cookies
    </button>
  );
}
