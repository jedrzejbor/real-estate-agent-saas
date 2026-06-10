'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/contexts/cookie-consent-context';
import { LEGAL_LINKS } from '@/lib/legal';
import { cn } from '@/lib/utils';

const CATEGORY_COPY = [
  {
    key: 'functional',
    title: 'Funkcjonalne',
    description:
      'Zapamiętują ustawienia interfejsu i roboczy stan formularzy, jeśli zdecydujemy się je traktować jako opcjonalne.',
  },
  {
    key: 'analytics',
    title: 'Analityczne',
    description:
      'Pomagają mierzyć oglądalność ofert, artykułów i kliknięcia w funkcje produktu.',
  },
  {
    key: 'marketing',
    title: 'Marketingowe',
    description:
      'Są zarezerwowane dla przyszłych integracji reklamowych. Obecnie nie używamy zewnętrznych pikseli marketingowych.',
  },
] as const;

type OptionalCategory = (typeof CATEGORY_COPY)[number]['key'];

export function CookieConsentManager() {
  const consent = useCookieConsent();

  if (!consent.isHydrated) {
    return null;
  }

  return (
    <>
      {consent.needsConsent && !consent.isPreferencesOpen ? (
        <CookieConsentBanner />
      ) : null}
      {consent.isPreferencesOpen ? <CookiePreferencesDialog /> : null}
    </>
  );
}

function CookieConsentBanner() {
  const { acceptAll, rejectOptional, openPreferences } = useCookieConsent();

  return (
    <section
      aria-label="Ustawienia cookies"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-card/95 px-4 py-4 shadow-2xl backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-foreground">
            EstateFlow używa niezbędnego storage oraz opcjonalnych zgód
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Zgody opcjonalne obejmują funkcjonalne ustawienia, własną analitykę
            produktu i przyszłe integracje marketingowe. Szczegóły znajdziesz w{' '}
            <Link
              href={LEGAL_LINKS.privacy}
              className="font-medium text-primary hover:underline"
            >
              polityce prywatności
            </Link>{' '}
            oraz{' '}
            <Link
              href={LEGAL_LINKS.cookies}
              className="font-medium text-primary hover:underline"
            >
              polityce cookies
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
          <Button type="button" variant="outline" onClick={rejectOptional}>
            Odrzuć opcjonalne
          </Button>
          <Button type="button" variant="secondary" onClick={openPreferences}>
            Dostosuj
          </Button>
          <Button type="button" onClick={acceptAll}>
            Akceptuję wszystkie
          </Button>
        </div>
      </div>
    </section>
  );
}

function CookiePreferencesDialog() {
  const {
    preferences,
    hasDecision,
    acceptAll,
    closePreferences,
    rejectOptional,
    savePreferences,
  } = useCookieConsent();
  const [choices, setChoices] = React.useState<Record<OptionalCategory, boolean>>(
    () => ({
      functional: Boolean(preferences?.functional),
      analytics: Boolean(preferences?.analytics),
      marketing: Boolean(preferences?.marketing),
    }),
  );

  function updateChoice(category: OptionalCategory, checked: boolean) {
    setChoices((current) => ({ ...current, [category]: checked }));
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-2xl items-center">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-primary">
                Prywatność
              </p>
              <h2
                id="cookie-preferences-title"
                className="mt-1 font-heading text-xl font-semibold text-foreground"
              >
                Ustawienia cookies
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Wybierz, które opcjonalne kategorie mogą działać w tej
                przeglądarce.
              </p>
            </div>
            <button
              type="button"
              className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={hasDecision ? 'Zamknij ustawienia cookies' : 'Wróć'}
              onClick={hasDecision ? closePreferences : rejectOptional}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <ConsentCategoryRow
              title="Niezbędne"
              description="Wymagane do działania aplikacji, bezpieczeństwa, obsługi sesji i zapamiętania wyboru zgód."
              checked
              disabled
            />

            {CATEGORY_COPY.map((category) => (
              <ConsentCategoryRow
                key={category.key}
                title={category.title}
                description={category.description}
                checked={choices[category.key]}
                onChange={(checked) => updateChoice(category.key, checked)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={rejectOptional}>
                Odrzuć opcjonalne
              </Button>
              <Button type="button" variant="secondary" onClick={acceptAll}>
                Akceptuję wszystkie
              </Button>
            </div>
            <Button
              type="button"
              onClick={() =>
                savePreferences({
                  functional: choices.functional,
                  analytics: choices.analytics,
                  marketing: choices.marketing,
                })
              }
            >
              Zapisz ustawienia
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ConsentCategoryRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4',
        disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer',
      )}
    >
      <span>
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
    </label>
  );
}
