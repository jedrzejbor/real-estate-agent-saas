'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlanUsageCard } from '@/components/dashboard/plan-usage-card';
import { useAuth } from '@/contexts/auth-context';
import { isUsageExceeded, isUsageWarning } from '@/lib/auth';
import { getPlanFeatureItems, getPlanUsageMetrics } from '@/lib/plan';
import { getResolvedReleaseFlags } from '@/lib/release-flags';

export default function PlanSettingsPage() {
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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Plan i limity
              </h1>
              <Badge variant={planBadgeVariant}>Plan {user.entitlements.plan.label}</Badge>
              <Badge variant="outline">{planStatusLabel}</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Jedno miejsce do monitorowania limitów, funkcji planu i potencjalnych triggerów upgrade'u.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Wróć do dashboardu
            <ArrowRight className="h-4 w-4" />
          </Link>
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
              Plan definiuje limity rekordów, dostępność raportów i funkcje premium odblokowywane przy skalowaniu pracy.
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
              {imagesPerListing !== null ? `${imagesPerListing} / ofertę` : 'Bez limitu'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dotyczy zdjęć dodawanych do pojedynczej oferty publicznej.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Wykorzystanie
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitoruj użycie limitów, zanim create flow zacznie blokować nowe rekordy.
            </p>
          </div>
          {warningCount > 0 || exceededCount > 0 ? (
            <Badge variant={exceededCount > 0 ? 'destructive' : 'warning'}>
              {exceededCount > 0
                ? 'Wymaga uwagi'
                : 'Zbliżasz się do limitu'}
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
        className={showFreemiumUpsell ? 'grid gap-6 xl:grid-cols-[1.1fr_0.9fr]' : 'grid gap-6'}
      >
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
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
          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-brand-gold-dark" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Odblokuj więcej
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Placeholder pod kolejne plany płatne — już teraz pokazuje, które obszary będą naturalnym krokiem przy wzroście workspace.
            </p>

            <div className="mt-4 space-y-3">
              {lockedFeatures.map((feature) => (
                <div
                  key={feature.key}
                  className="rounded-xl border border-[#D4A853]/20 bg-[#FFF9E6]/40 p-4"
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

            <div className="mt-5 rounded-xl border border-dashed border-[#D4A853]/35 bg-[#FFF9E6]/50 p-4">
              <p className="text-sm font-medium text-foreground">
                Upgrade CTA placeholder
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                W kolejnych sprintach w tym miejscu podepniemy pricing, lead capture lub kontakt sprzedażowy.
              </p>
              <Button variant="outline" className="mt-4" disabled>
                Upgrade wkrótce
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Kiedy warto przejść wyżej?
            </h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>
                Gdy regularnie dobiegasz do limitu ofert, klientów lub spotkań i nie chcesz blokować kolejnych działań sprzedażowych.
              </p>
              <p>
                Gdy potrzebujesz własnego brandingu na stronach publicznych albo chcesz pracować w więcej niż jedną osobę.
              </p>
              <p>
                Gdy chcesz rozszerzyć raportowanie i zyskać bardziej zaawansowany wgląd w skuteczność zespołu.
              </p>
            </div>
          </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
