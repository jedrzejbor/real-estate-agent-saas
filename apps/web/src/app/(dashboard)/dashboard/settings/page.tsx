'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Crown,
  EyeOff,
  LockKeyhole,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardPageHeader } from '@/components/dashboard/page-header';
import { PlanUsageCard } from '@/components/dashboard/plan-usage-card';
import { GrowthUpsellCard } from '@/components/growth/growth-upsell-card';
import {
  AccountDangerZoneSection,
  AccountProfileSection,
  AccountSecuritySection,
} from '@/components/settings/account-settings-forms';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { isUsageExceeded, isUsageWarning } from '@/lib/auth';
import {
  fetchDismissedDashboardInsights,
  restoreDashboardInsight,
  type DismissedDashboardInsight,
} from '@/lib/dashboard';
import {
  getGrowthUpsells,
  getUpgradeHref,
  SETTINGS_GROWTH_UPSELL_IDS,
} from '@/lib/growth-upsells';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationCategory,
  type NotificationPreference,
  type NotificationRuleSettings,
} from '@/lib/notifications';
import { getPlanFeatureItems, getPlanUsageMetrics } from '@/lib/plan';
import { getResolvedReleaseFlags } from '@/lib/release-flags';

const NOTIFICATION_PREFERENCE_OPTIONS: Array<{
  category: NotificationCategory;
  label: string;
  description: string;
}> = [
  {
    category: 'appointment',
    label: 'Spotkania',
    description: 'Terminy wymagające uwagi oraz nadchodzące prezentacje.',
  },
  {
    category: 'task',
    label: 'Follow-upy',
    description: 'Zaległe zadania kontaktu po spotkaniach i leadach.',
  },
  {
    category: 'public_lead',
    label: 'Leady publiczne',
    description: 'Nowe zapytania z publicznych ofert i profilu agenta.',
  },
  {
    category: 'listing_agent_collaboration',
    label: 'Współprace z właścicielami',
    description:
      'Decyzje właścicieli oraz zaakceptowane współprace wymagające działania.',
  },
  {
    category: 'client',
    label: 'Klienci CRM',
    description: 'Nowi klienci oczekujący pierwszej obsługi.',
  },
  {
    category: 'listing',
    label: 'Oferty',
    description: 'Szkice, aktywne oferty bez świeżej pracy i inne alerty.',
  },
  {
    category: 'document',
    label: 'Dokumenty',
    description: 'Braki i wygasające dokumenty powiązane z ofertami.',
  },
];

const DEFAULT_NOTIFICATION_RULE_SETTINGS: NotificationRuleSettings = {
  followUpOverdueDays: 0,
  staleListingDays: 14,
};

export default function AccountSettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const usageMetrics = getPlanUsageMetrics(user);
  const featureItems = getPlanFeatureItems(user);
  const releaseFlags = getResolvedReleaseFlags(user.releaseFlags);
  const showFreemiumUpsell = releaseFlags.freemiumUpsellEnabled;
  const enabledFeatures = featureItems.filter((item) => item.enabled);
  const lockedFeatures = featureItems.filter((item) => !item.enabled);
  const warningCount = usageMetrics.filter(({ usage, limit }) =>
    isUsageWarning(usage, limit),
  ).length;
  const exceededCount = usageMetrics.filter(({ usage, limit }) =>
    isUsageExceeded(usage, limit),
  ).length;
  const planBadgeVariant =
    user.entitlements.plan.code === 'free' ? 'muted' : 'gold';
  const planStatusLabel =
    user.entitlements.plan.status === 'active' ? 'Aktywny' : 'W trakcie';
  const imagesPerListing = user.entitlements.limits.imagesPerListing;
  const workspaceName = user.agency?.name || 'Twoje biuro';
  const growthUpsells = getGrowthUpsells(SETTINGS_GROWTH_UPSELL_IDS);
  const upgradeHref = getUpgradeHref({
    source: 'plan_settings_upgrade_summary',
    upsellId: 'higher-limits',
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <DashboardPageHeader
          title="Ustawienia"
          description="Zarządzaj profilem agenta, bezpieczeństwem konta, planem i dostępem do aplikacji."
          icon={Settings}
          actions={
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Wróć do dashboardu
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </section>

      <AccountProfileSection />
      <AccountSecuritySection />
      <NotificationPreferencesSection />
      <HiddenInsightsSettingsSection />

      <section
        id="plan"
        className="rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Plan i limity
              </h2>
              <Badge variant={planBadgeVariant}>
                Plan {user.entitlements.plan.label}
              </Badge>
              <Badge variant="outline">{planStatusLabel}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Jedno miejsce do monitorowania limitów, funkcji planu i
              potencjalnych triggerów upgrade.
            </p>
          </div>

          <Button render={<Link href={upgradeHref} />}>
            Zmień plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-muted/30 p-5">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Twój plan</p>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {user.entitlements.plan.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Workspace: {workspaceName}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Plan definiuje limity rekordów, dostępność raportów i funkcje
              premium odblokowywane przy skalowaniu pracy.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-muted/30 p-5">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-brand-gold-dark" />
              <p className="text-sm font-semibold">Szybki status</p>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {exceededCount > 0
                ? `${exceededCount} limit${exceededCount > 1 ? 'y' : ''} osiągnięte`
                : warningCount > 0
                  ? `${warningCount} limit${warningCount > 1 ? 'y' : ''} blisko końca`
                  : 'Wszystko pod kontrolą'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {exceededCount > 0
                ? 'Tworzenie nowych rekordów może być zablokowane dla części modułów.'
                : warningCount > 0
                  ? 'To dobry moment, by zaplanować kolejny krok lub uporządkować dane.'
                  : 'Masz jeszcze zapas w najważniejszych limitach workspace.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-muted/30 p-5">
            <div className="flex items-center gap-2 text-foreground">
              <Crown className="h-4 w-4 text-brand-gold-dark" />
              <p className="text-sm font-semibold">Limit zdjęć</p>
            </div>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {imagesPerListing !== null
                ? `${imagesPerListing} / ofertę`
                : 'Bez limitu'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dotyczy zdjęć dodawanych do pojedynczej oferty publicznej.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Wykorzystanie
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitoruj użycie limitów, zanim create flow zacznie blokować nowe
              rekordy.
            </p>
          </div>
          {warningCount > 0 || exceededCount > 0 ? (
            <Badge variant={exceededCount > 0 ? 'destructive' : 'warning'}>
              {exceededCount > 0 ? 'Wymaga uwagi' : 'Zbliżasz się do limitu'}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {usageMetrics.map(({ key, ...item }) => (
            <PlanUsageCard key={key} {...item} />
          ))}
        </div>
      </section>

      <section
        className={
          showFreemiumUpsell
            ? 'grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'
            : 'grid gap-6'
        }
      >
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Twój plan obejmuje
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {enabledFeatures.map((feature) => (
              <div
                key={feature.key}
                className="rounded-xl border border-border/80 bg-muted/30 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {feature.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Badge variant="success">Dostępne</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showFreemiumUpsell ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-brand-gold/25 bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-brand-gold-dark" />
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Growth upgrade paths
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Premium miejsca powiązane z publicznymi profilami, sharingiem,
                widgetami lead form i automatyzacjami.
              </p>
              <div className="mt-4 grid gap-3">
                {growthUpsells.map((upsell) => (
                  <GrowthUpsellCard
                    key={upsell.id}
                    upsell={upsell}
                    source="plan_settings_growth_upsell"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-brand-gold-dark" />
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Odblokuj więcej
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Zobacz dostępne kierunki upgrade i zapisz zainteresowanie
                wyższym planem bez uruchamiania automatycznego checkoutu.
              </p>

              <div className="mt-4 space-y-3">
                {lockedFeatures.map((feature) => (
                  <div
                    key={feature.key}
                    className="rounded-xl border border-brand-gold/20 bg-brand-gold-light/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {feature.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                      <Badge variant="gold">Premium</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-dashed border-brand-gold/35 bg-brand-gold-light/50 p-4">
                <p className="text-sm font-medium text-foreground">
                  Gotowe miejsce upgrade
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  CTA prowadzi do porównania planów i formularza intentu, a
                  kliknięcia zapisujemy jako `upgrade_cta_clicked`.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl"
                  render={<Link href={upgradeHref} />}
                >
                  Zobacz plany
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Kiedy warto przejść wyżej?
              </h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  Gdy regularnie dobiegasz do limitu ofert, klientów lub spotkań
                  i nie chcesz blokować kolejnych działań sprzedażowych.
                </p>
                <p>
                  Gdy potrzebujesz własnego brandingu na stronach publicznych
                  albo chcesz pracować w więcej niż jedną osobę.
                </p>
                <p>
                  Gdy chcesz rozszerzyć raportowanie i zyskać bardziej
                  zaawansowany wgląd w skuteczność zespołu.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <AccountDangerZoneSection />
    </div>
  );
}

function NotificationPreferencesSection() {
  const toast = useToast();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [ruleSettings, setRuleSettings] = useState<NotificationRuleSettings>(
    DEFAULT_NOTIFICATION_RULE_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchNotificationPreferences();
      setPreferences(normalizeNotificationPreferences(result.preferences));
      setRuleSettings(normalizeNotificationRuleSettings(result.ruleSettings));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  function handleToggle(category: NotificationCategory) {
    setPreferences((current) =>
      normalizeNotificationPreferences(current).map((item) =>
        item.category === category ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  }

  async function handleSave() {
    if (isSaving) return;

    setIsSaving(true);
    try {
      const result = await updateNotificationPreferences(
        normalizeNotificationPreferences(preferences),
        normalizeNotificationRuleSettings(ruleSettings),
      );
      setPreferences(normalizeNotificationPreferences(result.preferences));
      setRuleSettings(normalizeNotificationRuleSettings(result.ruleSettings));
      toast.success({
        title: 'Preferencje zapisane',
        description: 'Centrum powiadomień będzie pokazywać wybrane kategorie.',
      });
    } catch (err) {
      toast.error({
        title: 'Nie udało się zapisać preferencji',
        description: getApiErrorMessage(err),
      });
    } finally {
      setIsSaving(false);
    }
  }

  const normalizedPreferences = normalizeNotificationPreferences(preferences);
  const enabledCount = normalizedPreferences.filter(
    (preference) => preference.enabled,
  ).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-muted p-2 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Powiadomienia
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Wybierz typy zdarzeń, które mają trafiać do centrum powiadomień.
              Wyłączone kategorie nie będą liczone jako nieprzeczytane.
            </p>
          </div>
        </div>

        <Badge variant="outline">
          Aktywne: {enabledCount}/{NOTIFICATION_PREFERENCE_OPTIONS.length}
        </Badge>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {NOTIFICATION_PREFERENCE_OPTIONS.slice(0, 4).map((item) => (
              <div
                key={item.category}
                className="min-h-24 animate-pulse rounded-xl border border-border bg-muted/30"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Nie udało się pobrać preferencji.</p>
              <p className="mt-1 opacity-90">{error}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {NOTIFICATION_PREFERENCE_OPTIONS.map((option) => {
              const preference = normalizedPreferences.find(
                (item) => item.category === option.category,
              );
              const enabled = preference?.enabled ?? true;

              return (
                <label
                  key={option.category}
                  className="flex min-h-28 cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/35"
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-border accent-primary"
                    checked={enabled}
                    onChange={() => handleToggle(option.category)}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && !error ? (
        <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Progi reguł operacyjnych
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Ustaw, kiedy przypomnienia mają stać się wystarczająco pilne, aby
              trafić do centrum powiadomień.
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Follow-up po terminie od ilu dni
              </span>
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={ruleSettings.followUpOverdueDays}
                onChange={(event) =>
                  setRuleSettings((current) => ({
                    ...current,
                    followUpOverdueDays: clampInteger(
                      event.target.value,
                      0,
                      30,
                    ),
                  }))
                }
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                0 oznacza przypomnienie od razu po przekroczeniu terminu.
              </span>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Oferta bez aktywności od ilu dni
              </span>
              <input
                type="number"
                min={1}
                max={120}
                step={1}
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                value={ruleSettings.staleListingDays}
                onChange={(event) =>
                  setRuleSettings((current) => ({
                    ...current,
                    staleListingDays: clampInteger(event.target.value, 1, 120),
                  }))
                }
              />
              <span className="mt-1 block text-xs text-muted-foreground">
                Domyślnie aplikacja przypomina po 14 dniach bez zmian.
              </span>
            </label>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Preferencje dotyczą tylko dashboardu zalogowanego agenta.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void loadPreferences();
            }}
            disabled={isLoading || isSaving}
          >
            Odśwież
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isLoading || isSaving || Boolean(error)}
          >
            {isSaving ? 'Zapisywanie...' : 'Zapisz preferencje'}
          </Button>
        </div>
      </div>
    </section>
  );
}

function normalizeNotificationPreferences(
  preferences: NotificationPreference[],
): NotificationPreference[] {
  const byCategory = new Map(
    preferences.map((preference) => [preference.category, preference.enabled]),
  );

  return NOTIFICATION_PREFERENCE_OPTIONS.map((option) => ({
    category: option.category,
    enabled: byCategory.get(option.category) ?? true,
  }));
}

function normalizeNotificationRuleSettings(
  settings?: Partial<NotificationRuleSettings> | null,
): NotificationRuleSettings {
  return {
    followUpOverdueDays: clampInteger(
      settings?.followUpOverdueDays ??
        DEFAULT_NOTIFICATION_RULE_SETTINGS.followUpOverdueDays,
      0,
      30,
    ),
    staleListingDays: clampInteger(
      settings?.staleListingDays ??
        DEFAULT_NOTIFICATION_RULE_SETTINGS.staleListingDays,
      1,
      120,
    ),
  };
}

function clampInteger(
  value: string | number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);

  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function HiddenInsightsSettingsSection() {
  const toast = useToast();
  const [items, setItems] = useState<DismissedDashboardInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadDismissedInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDismissedDashboardInsights();
      setItems(result.dismissedInsights);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDismissedInsights();
  }, [loadDismissedInsights]);

  async function handleRestore(item: DismissedDashboardInsight) {
    if (restoringId) return;

    setRestoringId(item.insightId);
    try {
      await restoreDashboardInsight(item.insightId);
      setItems((current) =>
        current.filter((insight) => insight.insightId !== item.insightId),
      );
      toast.success({
        title: 'Insight przywrócony',
        description:
          'Pojawi się ponownie na dashboardzie, jeśli nadal spełnia warunki.',
      });
    } catch (err) {
      toast.error({
        title: 'Nie udało się przywrócić insightu',
        description: getApiErrorMessage(err),
      });
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-muted p-2 text-primary">
            <EyeOff className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Ukryte insighty
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Zarządzaj rekomendacjami ukrytymi na dashboardzie. Przywrócony
              insight wróci do widoku, jeśli jego warunek nadal jest aktualny.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void loadDismissedInsights();
          }}
          disabled={isLoading}
        >
          Odśwież
        </Button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="min-h-28 animate-pulse rounded-xl border border-border bg-muted/30"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Nie udało się pobrać listy.</p>
              <p className="mt-1 opacity-90">{error}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            Nie masz ukrytych insightów.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <HiddenInsightCard
                key={item.insightId}
                item={item}
                isRestoring={restoringId === item.insightId}
                onRestore={handleRestore}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HiddenInsightCard({
  item,
  isRestoring,
  onRestore,
}: {
  item: DismissedDashboardInsight;
  isRestoring: boolean;
  onRestore: (item: DismissedDashboardInsight) => Promise<void>;
}) {
  const title = item.insight?.title ?? 'Insight nie jest już aktywny';
  const description =
    item.insight?.description ??
    'Warunek, który wygenerował ten insight, nie jest obecnie spełniony. Możesz go usunąć z ukrytych, aby reguła mogła zadziałać ponownie w przyszłości.';

  return (
    <article className="rounded-xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <Badge variant={item.insight ? 'info' : 'muted'} className="shrink-0">
          {item.insight ? 'Aktywny' : 'Nieaktywny'}
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Ukryto: {formatSettingsDate(item.dismissedAt)}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRestoring}
          onClick={() => {
            void onRestore(item);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {isRestoring ? 'Przywracanie...' : 'Przywróć'}
        </Button>
      </div>
    </article>
  );
}

function formatSettingsDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
