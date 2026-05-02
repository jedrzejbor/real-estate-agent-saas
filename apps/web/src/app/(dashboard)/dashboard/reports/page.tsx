'use client';

import type { ElementType } from 'react';
import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  CalendarRange,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportsAppointmentsSection } from '@/components/reports/reports-appointments-section';
import { ReportsClientsSection } from '@/components/reports/reports-clients-section';
import { ReportsFilterBar } from '@/components/reports/reports-filter-bar';
import { ReportsFreemiumSection } from '@/components/reports/reports-freemium-section';
import { ReportsKpiStrip } from '@/components/reports/reports-kpi-strip';
import { ReportsListingsSection } from '@/components/reports/reports-listings-section';
import { ReportsPremiumPlaceholder } from '@/components/reports/reports-premium-placeholder';
import { ReportSectionCard } from '@/components/reports/report-section-card';
import { ReportsTrendCard } from '@/components/reports/reports-trend-card';
import {
  useReportsAppointments,
  useReportsClients,
  useReportsFreemiumMetrics,
  useReportsListings,
  useReportsOverview,
} from '@/hooks/use-reports';
import {
  formatReportsDateRange,
  formatReportsDelta,
  parseReportsFilters,
  type ReportsFilters,
} from '@/lib/reports';
import { getResolvedReleaseFlags } from '@/lib/release-flags';
import { useAuth } from '@/contexts/auth-context';

export default function ReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const releaseFlags = getResolvedReleaseFlags(user?.releaseFlags);
  const canAccessAppointmentsReport =
    user?.entitlements.features.reportsAppointmentsBasic ?? false;
  const showPremiumReportsUpsell =
    releaseFlags.freemiumUpsellEnabled && releaseFlags.premiumReportsEnabled;
  const reportsDescription = canAccessAppointmentsReport
    ? 'Widok przeglądu oraz dedykowane raporty Oferty, Klienci i Spotkania, z zachowaniem wspólnych filtrów i bezpiecznego scope danych.'
    : showPremiumReportsUpsell
      ? 'Widok przeglądu oraz darmowe raporty Oferty i Klienci. Raport Spotkania jest dostępny w płatnych planach.'
      : 'Widok przeglądu oraz darmowe raporty Oferty i Klienci, bez dodatkowych premium entry pointów.';

  const filters = useMemo(
    () => parseReportsFilters(searchParams),
    [searchParams],
  );
  const {
    data,
    isLoading,
    error,
    refresh: refreshOverview,
  } = useReportsOverview(filters);
  const {
    data: listingsData,
    isLoading: isListingsLoading,
    error: listingsError,
    refresh: refreshListings,
  } = useReportsListings(filters);
  const {
    data: clientsData,
    isLoading: isClientsLoading,
    error: clientsError,
    refresh: refreshClients,
  } = useReportsClients(filters);
  const {
    data: freemiumData,
    isLoading: isFreemiumLoading,
    error: freemiumError,
    refresh: refreshFreemium,
  } = useReportsFreemiumMetrics(filters);
  const {
    data: appointmentsData,
    isLoading: isAppointmentsLoading,
    error: appointmentsError,
    refresh: refreshAppointments,
  } = useReportsAppointments(filters, {
    enabled: canAccessAppointmentsReport,
  });

  function refreshAll() {
    refreshOverview();
    refreshListings();
    refreshClients();
    refreshFreemium();

    if (canAccessAppointmentsReport) {
      refreshAppointments();
    }
  }

  function updateFilter<K extends keyof ReportsFilters>(
    key: K,
    value: ReportsFilters[K] | undefined,
  ) {
    const next = new URLSearchParams(searchParams.toString());

    if (value === undefined || value === '') {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }

    router.replace(
      next.toString() ? `${pathname}?${next.toString()}` : pathname,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Raporty
            </h1>
            <Badge variant="outline" className="rounded-full">
              Iteracja 5
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {reportsDescription}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {formatReportsDateRange(filters.dateFrom, filters.dateTo)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={
              isLoading ||
              isListingsLoading ||
              isClientsLoading ||
              isFreemiumLoading ||
              (canAccessAppointmentsReport && isAppointmentsLoading)
            }
            className="gap-1.5 rounded-xl"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading || isListingsLoading || isClientsLoading || isFreemiumLoading || (canAccessAppointmentsReport && isAppointmentsLoading) ? 'animate-spin' : ''}`}
            />
            Odśwież
          </Button>
        </div>
      </div>

      <ReportsFilterBar
        filters={filters}
        canSelectAgent={data?.scope.canSelectAgent ?? false}
        agents={(data?.scope.availableAgents ?? []).map((agent) => ({
          value: agent.id,
          label: agent.label,
        }))}
        onChange={updateFilter}
      />

      {isLoading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {error && !data && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={refreshOverview}
          >
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {data && (
        <>
          <ReportsKpiStrip
            summary={data.summary}
            comparison={data.comparison}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <ReportsTrendCard
              title="Trend nowych ofert"
              description="Liczba nowych ofert w kolejnych bucketach czasu dla aktywnego zakresu filtrów."
              totalLabel="Nowe oferty"
              totalValue={data.summary.newListings}
              data={data.timeline}
              metric="newListings"
              groupBy={filters.groupBy}
              tone="emerald"
            />
            <ReportsTrendCard
              title="Trend leadów / klientów"
              description="Napływ nowych klientów w czasie dla bieżącego zakresu i scope użytkownika."
              totalLabel="Nowi klienci"
              totalValue={data.summary.newClients}
              data={data.timeline}
              metric="newClients"
              groupBy={filters.groupBy}
              tone="gold"
            />
            <ReportsTrendCard
              title="Trend spotkań"
              description="Łączna liczba spotkań w bucketach czasu; kolejne raporty rozbiją to szerzej na statusy i typy."
              totalLabel="Spotkania"
              totalValue={data.summary.appointments}
              data={data.timeline}
              metric="appointments"
              groupBy={filters.groupBy}
              tone="info"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ReportSectionCard
              title="Porównanie okresów"
              description="Najważniejsze KPI są zestawione z poprzednim okresem o tej samej długości, co ułatwia szybką ocenę trendu."
            >
              <div className="space-y-3 text-sm">
                <InfoRow
                  icon={TrendingUp}
                  label="Nowe oferty"
                  value={formatReportsDelta(data.comparison.deltas.newListings)}
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Nowi klienci"
                  value={formatReportsDelta(data.comparison.deltas.newClients)}
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Spotkania"
                  value={formatReportsDelta(
                    data.comparison.deltas.appointments,
                  )}
                />
                <InfoRow
                  icon={CalendarRange}
                  label="Poprzedni okres"
                  value={formatReportsDateRange(
                    data.comparison.previousPeriod.dateFrom,
                    data.comparison.previousPeriod.dateTo,
                  )}
                />
              </div>
            </ReportSectionCard>

            <ReportSectionCard
              title="Zakres dostępu"
              description="Raporty respektują rolę zalogowanego użytkownika i wymuszają właściwy zakres danych po stronie backendu."
            >
              <div className="space-y-4 text-sm">
                <InfoRow
                  icon={ShieldCheck}
                  label="Tryb zakresu"
                  value={data.scope.mode === 'team' ? 'Zespół' : 'Własne dane'}
                />
                <InfoRow
                  icon={Users}
                  label="Dostępni agenci"
                  value={String(data.scope.availableAgents.length)}
                />
                <InfoRow
                  icon={BarChart3}
                  label="Rola użytkownika"
                  value={user?.role ?? 'agent'}
                />
              </div>
            </ReportSectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <ReportSectionCard
              title="Stan wdrożenia overview"
              description="Ta iteracja dokłada realne elementy raportowe ponad sam foundation modułu."
            >
              <div className="space-y-3 text-sm text-muted-foreground">
                {data.notes.map((note) => (
                  <div
                    key={note}
                    className="rounded-xl bg-muted/40 px-3 py-2 text-foreground/80"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </ReportSectionCard>

            <ReportSectionCard
              title="Oferty i klienci"
              description={
                canAccessAppointmentsReport
                  ? 'Raporty Oferty, Klienci i Spotkania są już wydzielone jako osobne pionowe slice’y; kolejnym logicznym krokiem będzie raport Lejek.'
                  : showPremiumReportsUpsell
                    ? 'W planie Free raporty Oferty i Klienci pozostają dostępne, a raport Spotkania pełni rolę premium entry pointu.'
                    : 'W planie Free raporty Oferty i Klienci pozostają dostępne jako podstawowy scope analityczny.'
              }
            >
              <p className="text-sm text-muted-foreground">
                Nadal utrzymujemy jeden wspólny kontrakt filtrów dla wszystkich
                sekcji, co upraszcza rozwój, testowanie i spójność interfejsu.
              </p>
            </ReportSectionCard>

            <ReportSectionCard
              title="Bezpieczeństwo"
              description="Walidacja DTO, ograniczenie zakresu dat i serwerowe scope enforcement są wdrożone od początku."
            >
              <p className="text-sm text-muted-foreground">
                To ogranicza ryzyko błędnych agregacji i wycieku danych między
                agentami lub zespołami.
              </p>
            </ReportSectionCard>
          </div>

          {listingsError && !listingsData && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive">{listingsError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={refreshListings}
              >
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {isListingsLoading && !listingsData && (
            <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            </div>
          )}

          {listingsData && <ReportsListingsSection data={listingsData} />}

          {clientsError && !clientsData && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive">{clientsError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={refreshClients}
              >
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {isClientsLoading && !clientsData && (
            <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            </div>
          )}

          {clientsData && <ReportsClientsSection data={clientsData} />}

          {freemiumError && !freemiumData && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive">{freemiumError}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={refreshFreemium}
              >
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {isFreemiumLoading && !freemiumData && (
            <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
              <div className="flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            </div>
          )}

          {freemiumData && <ReportsFreemiumSection data={freemiumData} />}

          {canAccessAppointmentsReport &&
            appointmentsError &&
            !appointmentsData && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                <p className="text-sm text-destructive">{appointmentsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={refreshAppointments}
                >
                  Spróbuj ponownie
                </Button>
              </div>
            )}

          {canAccessAppointmentsReport &&
            isAppointmentsLoading &&
            !appointmentsData && (
              <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
                <div className="flex items-center justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              </div>
            )}

          {canAccessAppointmentsReport && appointmentsData && (
            <ReportsAppointmentsSection data={appointmentsData} />
          )}

          {!canAccessAppointmentsReport && showPremiumReportsUpsell ? (
            <ReportsPremiumPlaceholder
              title="Raport Spotkania"
              description="Zaawansowany raport spotkań jest poza podstawowym zakresem darmowego planu i pełni kontrolowany premium entry point."
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        <span>{label}</span>
      </div>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
