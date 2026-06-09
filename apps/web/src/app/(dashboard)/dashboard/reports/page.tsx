'use client';

import type { ElementType } from 'react';
import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  BookOpenText,
  Building2,
  CalendarRange,
  Gauge,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportsAppointmentsSection } from '@/components/reports/reports-appointments-section';
import { ReportsBlogSection } from '@/components/reports/reports-blog-section';
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
  useReportsBlog,
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
    ? 'Widok przeglądu oraz dedykowane raporty Oferty, Klienci, Growth, Blog i Spotkania, z zachowaniem wspólnych filtrów i bezpiecznego scope danych.'
    : showPremiumReportsUpsell
      ? 'Widok przeglądu oraz darmowe raporty Oferty, Klienci, Growth i Blog. Raport Spotkania jest dostępny w płatnych planach.'
      : 'Widok przeglądu oraz darmowe raporty Oferty, Klienci, Growth i Blog, bez dodatkowych premium entry pointów.';

  const filters = useMemo(
    () => parseReportsFilters(searchParams),
    [searchParams],
  );
  const requestedReport = searchParams.get('report');
  const activeReport = isReportsTabId(requestedReport)
    ? requestedReport
    : 'overview';
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
    data: blogData,
    isLoading: isBlogLoading,
    error: blogError,
    refresh: refreshBlog,
  } = useReportsBlog(filters);
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
    refreshBlog();

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

  function updateReport(report: ReportsTabId) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('report', report);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const isAnyReportLoading =
    isLoading ||
    isListingsLoading ||
    isClientsLoading ||
    isFreemiumLoading ||
    isBlogLoading ||
    (canAccessAppointmentsReport && isAppointmentsLoading);
  const tabs = getReportsTabs({
    canAccessAppointmentsReport,
    showPremiumReportsUpsell,
    overviewCount: data
      ? data.summary.newListings +
        data.summary.newClients +
        data.summary.appointments
      : undefined,
    listingsCount: listingsData?.summary.totalListings,
    clientsCount: clientsData?.summary.totalClients,
    freemiumCount: freemiumData?.summary.upgradeClicks,
    blogCount: blogData?.summary.articleViews,
    appointmentsCount: appointmentsData?.summary.totalAppointments,
  });
  const selectedTab =
    tabs.find((tab) => tab.id === activeReport && !tab.disabled) ?? tabs[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Raporty
            </h1>
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
            disabled={isAnyReportLoading}
            className="gap-1.5 rounded-xl"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isAnyReportLoading ? 'animate-spin' : ''}`}
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
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/20 p-2">
            <div
              className="grid gap-2 lg:grid-cols-6"
              role="tablist"
              aria-label="Typ raportu"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedTab.id === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    disabled={tab.disabled}
                    onClick={() => updateReport(tab.id)}
                    className={`min-h-20 rounded-xl border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? 'border-primary bg-card text-foreground shadow-sm'
                        : 'border-transparent bg-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">
                          {tab.label}
                        </span>
                      </div>
                      {tab.badge ? (
                        <Badge
                          variant={tab.badgeVariant ?? 'secondary'}
                          className="rounded-full"
                        >
                          {tab.badge}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-5">{tab.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Aktywny raport
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
                  {selectedTab.label}
                </h2>
              </div>
              <Badge variant="outline" className="w-fit rounded-full">
                {formatReportsDateRange(filters.dateFrom, filters.dateTo)}
              </Badge>
            </div>
          </div>

          <div className="min-h-[560px] bg-background p-5">
            {selectedTab.id === 'overview' ? (
              <OverviewReportContent
                data={data}
                filters={filters}
                userRole={user?.role ?? 'agent'}
                canAccessAppointmentsReport={canAccessAppointmentsReport}
                showPremiumReportsUpsell={showPremiumReportsUpsell}
              />
            ) : null}

            {selectedTab.id === 'listings' ? (
              <ReportDataState
                error={listingsError}
                isLoading={isListingsLoading}
                hasData={!!listingsData}
                onRetry={refreshListings}
              >
                {listingsData ? (
                  <ReportsListingsSection data={listingsData} />
                ) : null}
              </ReportDataState>
            ) : null}

            {selectedTab.id === 'clients' ? (
              <ReportDataState
                error={clientsError}
                isLoading={isClientsLoading}
                hasData={!!clientsData}
                onRetry={refreshClients}
              >
                {clientsData ? (
                  <ReportsClientsSection data={clientsData} />
                ) : null}
              </ReportDataState>
            ) : null}

            {selectedTab.id === 'freemium' ? (
              <ReportDataState
                error={freemiumError}
                isLoading={isFreemiumLoading}
                hasData={!!freemiumData}
                onRetry={refreshFreemium}
              >
                {freemiumData ? (
                  <ReportsFreemiumSection data={freemiumData} />
                ) : null}
              </ReportDataState>
            ) : null}

            {selectedTab.id === 'blog' ? (
              <ReportDataState
                error={blogError}
                isLoading={isBlogLoading}
                hasData={!!blogData}
                onRetry={refreshBlog}
              >
                {blogData ? <ReportsBlogSection data={blogData} /> : null}
              </ReportDataState>
            ) : null}

            {selectedTab.id === 'appointments' ? (
              canAccessAppointmentsReport ? (
                <ReportDataState
                  error={appointmentsError}
                  isLoading={isAppointmentsLoading}
                  hasData={!!appointmentsData}
                  onRetry={refreshAppointments}
                >
                  {appointmentsData ? (
                    <ReportsAppointmentsSection data={appointmentsData} />
                  ) : null}
                </ReportDataState>
              ) : (
                <ReportsPremiumPlaceholder
                  title="Raport Spotkania"
                  description="Zaawansowany raport spotkań jest poza podstawowym zakresem darmowego planu i pełni kontrolowany premium entry point."
                />
              )
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}

type ReportsTabId =
  | 'overview'
  | 'listings'
  | 'clients'
  | 'freemium'
  | 'blog'
  | 'appointments';

interface ReportsTab {
  id: ReportsTabId;
  label: string;
  description: string;
  icon: ElementType;
  badge?: string;
  badgeVariant?: 'secondary' | 'outline' | 'gold';
  disabled?: boolean;
}

function isReportsTabId(value: string | null): value is ReportsTabId {
  return (
    value === 'overview' ||
    value === 'listings' ||
    value === 'clients' ||
    value === 'freemium' ||
    value === 'blog' ||
    value === 'appointments'
  );
}

function getReportsTabs({
  canAccessAppointmentsReport,
  showPremiumReportsUpsell,
  overviewCount,
  listingsCount,
  clientsCount,
  freemiumCount,
  blogCount,
  appointmentsCount,
}: {
  canAccessAppointmentsReport: boolean;
  showPremiumReportsUpsell: boolean;
  overviewCount?: number;
  listingsCount?: number;
  clientsCount?: number;
  freemiumCount?: number;
  blogCount?: number;
  appointmentsCount?: number;
}): ReportsTab[] {
  return [
    {
      id: 'overview',
      label: 'Przegląd',
      description: 'KPI, trendy i porównanie okresów.',
      icon: Gauge,
      badge: overviewCount !== undefined ? String(overviewCount) : undefined,
    },
    {
      id: 'listings',
      label: 'Oferty',
      description: 'Statusy, aktywacje i struktura portfela.',
      icon: Building2,
      badge: listingsCount !== undefined ? String(listingsCount) : undefined,
    },
    {
      id: 'clients',
      label: 'Klienci',
      description: 'Pipeline, źródła leadów i konwersja.',
      icon: Users,
      badge: clientsCount !== undefined ? String(clientsCount) : undefined,
    },
    {
      id: 'freemium',
      label: 'Growth',
      description: 'Aktywacja, publiczne oferty i upgrade intent.',
      icon: MousePointerClick,
      badge: freemiumCount !== undefined ? String(freemiumCount) : undefined,
    },
    {
      id: 'blog',
      label: 'Blog',
      description: 'Ruch SEO, CTA i intencja dodania oferty.',
      icon: BookOpenText,
      badge: blogCount !== undefined ? String(blogCount) : undefined,
    },
    {
      id: 'appointments',
      label: 'Spotkania',
      description: canAccessAppointmentsReport
        ? 'Statusy, typy i skuteczność spotkań.'
        : 'Dostępne w wyższym planie.',
      icon: CalendarRange,
      badge: canAccessAppointmentsReport
        ? appointmentsCount !== undefined
          ? String(appointmentsCount)
          : undefined
        : showPremiumReportsUpsell
          ? 'Premium'
          : undefined,
      badgeVariant: canAccessAppointmentsReport ? undefined : 'gold',
      disabled: !canAccessAppointmentsReport && !showPremiumReportsUpsell,
    },
  ];
}

function OverviewReportContent({
  data,
  filters,
  userRole,
  canAccessAppointmentsReport,
  showPremiumReportsUpsell,
}: {
  data: NonNullable<ReturnType<typeof useReportsOverview>['data']>;
  filters: ReportsFilters;
  userRole: string;
  canAccessAppointmentsReport: boolean;
  showPremiumReportsUpsell: boolean;
}) {
  return (
    <div className="space-y-6">
      <ReportsKpiStrip summary={data.summary} comparison={data.comparison} />

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
          description="Łączna liczba spotkań w bucketach czasu."
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
          description="Najważniejsze KPI są zestawione z poprzednim okresem o tej samej długości."
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
              value={formatReportsDelta(data.comparison.deltas.appointments)}
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
          title="Zakres danych"
          description="Raporty respektują rolę użytkownika i serwerowy scope danych."
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
              value={userRole}
            />
          </div>
        </ReportSectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportSectionCard
          title="Co pokazuje ten widok"
          description={
            canAccessAppointmentsReport
              ? 'Przegląd łączy trzy główne obszary: oferty, klientów i spotkania. Szczegóły są w osobnych zakładkach.'
              : showPremiumReportsUpsell
                ? 'Przegląd łączy darmowe raporty Oferty i Klienci. Raport Spotkania pozostaje premium.'
                : 'Przegląd łączy darmowe raporty Oferty i Klienci jako podstawowy scope analityczny.'
          }
        >
          <p className="text-sm text-muted-foreground">
            Wspólne filtry nad zakładkami zmieniają dane we wszystkich raportach
            jednocześnie, więc użytkownik nie musi ustawiać zakresu osobno.
          </p>
        </ReportSectionCard>

        <ReportSectionCard
          title="Uwagi do danych"
          description="Krótkie informacje techniczne dotyczące aktualnego raportu."
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
      </div>
    </div>
  );
}

function ReportDataState({
  error,
  isLoading,
  hasData,
  onRetry,
  children,
}: {
  error: string | null;
  isLoading: boolean;
  hasData: boolean;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  if (error && !hasData) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  if (isLoading && !hasData) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return children;
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
