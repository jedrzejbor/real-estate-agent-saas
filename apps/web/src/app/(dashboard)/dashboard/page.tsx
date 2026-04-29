'use client';

import Link from 'next/link';
import {
  Building2,
  Users,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowRight,
  RefreshCw,
  MapPin,
  User,
  Home,
  BarChart3,
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { PlanUsageCard } from '@/components/dashboard/plan-usage-card';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/hooks/use-dashboard';
import { isUsageWarning } from '@/lib/auth';
import { getPlanUsageMetrics } from '@/lib/plan';
import {
  type DashboardStats,
  type RecentActivity,
  type UpcomingAppointment,
  formatPricePL,
  formatRelativeTime,
  formatAppointmentTime,
  ACTIVITY_TYPE_CONFIG,
} from '@/lib/dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, isLoading, error, refresh } = useDashboard();

  const firstName = user?.agent?.firstName?.trim() ?? '';

  const greeting = firstName ? `Cześć, ${firstName}!` : 'Cześć!';

  const usageCards = user
    ? getPlanUsageMetrics(user).filter((item) => item.key !== 'users')
    : [];

  const hasUsageWarning = usageCards.some(({ usage, limit }) =>
    isUsageWarning(usage, limit),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Oto podsumowanie Twojej aktywności.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
          className="gap-1.5 rounded-xl"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
          Odśwież
        </Button>
      </div>

      {/* Loading */}
      {isLoading && !stats && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {error && !stats && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={refresh}
          >
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {/* Dashboard content */}
      {stats && (
        <>
          {user ? (
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        user.entitlements.plan.code === 'free'
                          ? 'muted'
                          : 'gold'
                      }
                    >
                      Plan {user.entitlements.plan.label}
                    </Badge>
                    {hasUsageWarning ? (
                      <Badge variant="warning">Zbliżasz się do limitu</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Monitoruj wykorzystanie limitów, aby uniknąć blokady przy
                    tworzeniu nowych rekordów.
                  </p>
                </div>
                <Link
                  href="/dashboard/settings"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Zobacz plan i limity
                </Link>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {usageCards.map(({ key, ...item }) => (
                  <PlanUsageCard key={key} {...item} />
                ))}
              </div>
            </div>
          ) : null}

          <OnboardingChecklist stats={stats} />

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Aktywne oferty"
              value={String(stats.listings.active)}
              subtitle={`${stats.listings.total} łącznie`}
              icon={Building2}
              color="text-brand-emerald"
              bg="bg-brand-emerald-light"
              href="/dashboard/listings"
            />
            <StatCard
              label="Klienci"
              value={String(stats.clients.total)}
              subtitle={`${stats.clients.new} nowych`}
              icon={Users}
              color="text-brand-gold-dark"
              bg="bg-brand-gold-light"
              href="/dashboard/clients"
            />
            <StatCard
              label="Spotkania (ten tydzień)"
              value={String(stats.appointments.thisWeek)}
              subtitle={`${stats.appointments.today} dzisiaj`}
              icon={CalendarCheck}
              color="text-status-info"
              bg="bg-status-info-bg"
              href="/dashboard/calendar"
            />
            <ConversionCard
              conversionRate={stats.clients.conversionRate}
              closedWon={stats.clients.closedWon}
              closedLost={stats.clients.closedLost}
            />
          </div>

          {/* Revenue row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <RevenueCard
              label="Wartość aktywnych ofert"
              value={formatPricePL(stats.revenue.totalListedValue)}
              icon={DollarSign}
            />
            <RevenueCard
              label="Średnia cena oferty"
              value={formatPricePL(stats.revenue.avgPrice)}
              icon={BarChart3}
            />
            <RevenueCard
              label="Wartość sprzedaży"
              value={formatPricePL(stats.revenue.soldValue)}
              icon={Percent}
            />
          </div>

          {/* Two-column: Activity + Upcoming */}
          <div className="grid gap-6 lg:grid-cols-2">
            <RecentActivityCard activities={stats.recentActivity} />
            <UpcomingAppointmentsCard
              appointments={stats.upcomingAppointments}
            />
          </div>

          {/* Status breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ListingStatusBreakdown stats={stats.listings} />
            <ClientPipelineBreakdown stats={stats.clients} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Stat Card ──

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  bg,
  href,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}
        >
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// ── Conversion Card ──

function ConversionCard({
  conversionRate,
  closedWon,
  closedLost,
}: {
  conversionRate: number;
  closedWon: number;
  closedLost: number;
}) {
  const hasData = closedWon + closedLost > 0;

  const tooltipContent = (
    <div className="space-y-1.5">
      <p className="font-semibold">Współczynnik konwersji</p>
      <p className="leading-relaxed opacity-90">
        Procent klientów, których transakcja zakończyła się sukcesem spośród
        wszystkich zamkniętych spraw.
      </p>
      <p className="mt-1 font-mono opacity-75">
        = zamknięci (sukces) / (sukces + straceni) × 100
      </p>
      {hasData ? (
        <p className="opacity-75">
          {closedWon} sukces / {closedLost} stracony
          {closedLost !== 1 ? 'ch' : ''}
        </p>
      ) : (
        <p className="opacity-75">
          Brak zamkniętych spraw — dodaj więcej klientów.
        </p>
      )}
    </div>
  );

  const content = (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Konwersja</span>
        <Tooltip content={tooltipContent} delay={300}>
          <div className="flex h-9 w-9 cursor-help items-center justify-center rounded-xl bg-status-success-bg">
            <TrendingUp className="h-5 w-5 text-status-success" />
          </div>
        </Tooltip>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold text-foreground">
        {hasData ? `${conversionRate}%` : '—'}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {hasData
          ? `${closedWon} zamkniętych · ${closedLost} straconych`
          : 'Brak danych'}
      </p>
    </div>
  );

  return <Link href="/dashboard/clients">{content}</Link>;
}

// ── Revenue Card ──

function RevenueCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-bold text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Recent Activity ──

function RecentActivityCard({ activities }: { activities: RecentActivity[] }) {
  const ACTIVITY_ICONS: Record<RecentActivity['type'], React.ElementType> = {
    listing: Home,
    client: User,
    appointment: CalendarCheck,
  };

  const ACTIVITY_LINKS: Record<RecentActivity['type'], string> = {
    listing: '/dashboard/listings',
    client: '/dashboard/clients',
    appointment: '/dashboard/calendar',
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Ostatnia aktywność
        </h2>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>

      {activities.length === 0 ? (
        <OnboardingEmptyState
          icon={Clock}
          title="Tu pojawią się pierwsze działania"
          description="Dodaj ofertę, klienta albo spotkanie, a ta karta zacznie działać jak szybka historia pracy w CRM."
          actionHref="/dashboard/listings/new"
          actionLabel="Dodaj ofertę"
          secondaryHref="/dashboard/clients/new"
          secondaryLabel="Dodaj klienta"
          compact
          surface={false}
          analyticsId="dashboard_activity_empty"
          className="mt-4"
        />
      ) : (
        <div className="mt-4 space-y-3">
          {activities.map((activity) => {
            const config = ACTIVITY_TYPE_CONFIG[activity.type];
            const Icon = ACTIVITY_ICONS[activity.type];
            return (
              <Link
                key={`${activity.type}-${activity.id}`}
                href={`${ACTIVITY_LINKS[activity.type]}/${activity.id}`}
                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.subtitle}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeTime(activity.createdAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Upcoming Appointments ──

function UpcomingAppointmentsCard({
  appointments,
}: {
  appointments: UpcomingAppointment[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Nadchodzące spotkania
        </h2>
        <Link href="/dashboard/calendar">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Wszystkie
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {appointments.length === 0 ? (
        <OnboardingEmptyState
          icon={CalendarCheck}
          title="Brak nadchodzących spotkań"
          description="Zaplanuj pierwszy kontakt, prezentację lub konsultację, żeby mieć najbliższe zadania pod ręką od razu po wejściu do panelu."
          actionHref="/dashboard/calendar/new"
          actionLabel="Zaplanuj spotkanie"
          compact
          surface={false}
          analyticsId="dashboard_upcoming_appointments_empty"
          className="mt-4"
        />
      ) : (
        <div className="mt-4 space-y-3">
          {appointments.map((appt) => (
            <Link
              key={appt.id}
              href={`/dashboard/calendar/${appt.id}`}
              className="flex items-center gap-3 rounded-xl border border-border p-3 transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10">
                <CalendarCheck className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {appt.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatAppointmentTime(appt.startTime)}</span>
                  {appt.location && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {appt.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {appt.clientName && (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {appt.clientName}
                </Badge>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Listing Status Breakdown ──

function ListingStatusBreakdown({
  stats,
}: {
  stats: DashboardStats['listings'];
}) {
  const rows = [
    { label: 'Aktywne', value: stats.active, color: 'bg-emerald-500' },
    { label: 'Szkice', value: stats.draft, color: 'bg-gray-400' },
    { label: 'Zarezerwowane', value: stats.reserved, color: 'bg-amber-500' },
    { label: 'Sprzedane', value: stats.sold, color: 'bg-blue-500' },
    { label: 'Wynajęte', value: stats.rented, color: 'bg-purple-500' },
    { label: 'Zarchiwizowane', value: stats.archived, color: 'bg-gray-300' },
  ];

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Oferty wg statusu
        </h2>
        <Link href="/dashboard/listings">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Zobacz
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {stats.total === 0 ? (
        <OnboardingEmptyState
          icon={Building2}
          title="Brak ofert do pokazania"
          description="Dodaj pierwszą ofertę, żeby zobaczyć rozkład statusów i przygotować grunt pod publiczne strony ofert."
          actionHref="/dashboard/listings/new"
          actionLabel="Dodaj ofertę"
          compact
          surface={false}
          analyticsId="dashboard_listing_status_empty"
          className="mt-4"
        />
      ) : (
        <>
          {/* Horizontal bar */}
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
            {rows
              .filter((r) => r.value > 0)
              .map((row) => (
                <div
                  key={row.label}
                  className={`${row.color} transition-all`}
                  style={{
                    width: `${(row.value / stats.total) * 100}%`,
                  }}
                />
              ))}
          </div>

          {/* Legend */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {rows
              .filter((r) => r.value > 0)
              .map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="ml-auto text-xs font-medium text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Client Pipeline Breakdown ──

function ClientPipelineBreakdown({
  stats,
}: {
  stats: DashboardStats['clients'];
}) {
  const stages = [
    { label: 'Nowi', value: stats.new, color: 'bg-blue-400' },
    { label: 'Aktywni', value: stats.active, color: 'bg-emerald-500' },
    { label: 'Negocjacje', value: stats.negotiating, color: 'bg-amber-500' },
    {
      label: 'Zamknięci (sukces)',
      value: stats.closedWon,
      color: 'bg-green-600',
    },
    { label: 'Straceni', value: stats.closedLost, color: 'bg-red-400' },
  ];

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Pipeline klientów
        </h2>
        <Link href="/dashboard/clients">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Zobacz
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      {stats.total === 0 ? (
        <OnboardingEmptyState
          icon={Users}
          title="Pipeline czeka na pierwszego klienta"
          description="Dodaj kontakt albo zaimportuj bazę CSV, a statusy klientów zaczną pokazywać realny lejek pracy."
          actionHref="/dashboard/clients/new"
          actionLabel="Dodaj klienta"
          compact
          surface={false}
          analyticsId="dashboard_client_pipeline_empty"
          className="mt-4"
        />
      ) : (
        <>
          {/* Funnel-like bars */}
          <div className="mt-4 space-y-2">
            {stages
              .filter((s) => s.value > 0)
              .map((stage) => (
                <div key={stage.label} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-muted-foreground">
                    {stage.label}
                  </span>
                  <div className="flex-1">
                    <div className="h-5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full ${stage.color} flex items-center rounded-full px-2 transition-all`}
                        style={{
                          width: `${Math.max((stage.value / stats.total) * 100, 8)}%`,
                        }}
                      >
                        <span className="text-[10px] font-bold text-white">
                          {stage.value}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Conversion metric */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              Współczynnik konwersji:
            </span>
            <span className="ml-auto text-sm font-bold text-foreground">
              {stats.conversionRate}%
            </span>
          </div>
        </>
      )}
    </div>
  );
}
