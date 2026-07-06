'use client';

import { useState, type ElementType } from 'react';
import Link from 'next/link';
import {
  Activity,
  Building2,
  Users,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  FileWarning,
  CircleDollarSign,
  Clock,
  ArrowRight,
  RefreshCw,
  MapPin,
  User,
  Home,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  MessageSquareText,
  Percent,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { PlanUsageCard } from '@/components/dashboard/plan-usage-card';
import { FeatureSurveyList } from '@/components/feedback/feature-survey-list';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard } from '@/hooks/use-dashboard';
import { useDashboardInsights } from '@/hooks/use-dashboard-insights';
import { useDashboardToday } from '@/hooks/use-dashboard-today';
import { isUsageWarning } from '@/lib/auth';
import { getPlanUsageMetrics } from '@/lib/plan';
import {
  type DashboardStats,
  type DocumentAttentionItem,
  type RecentActivity,
  type UpcomingAppointment,
  type DashboardTodayResponse,
  type DashboardInsightsResponse,
  type DashboardInsight,
  type DashboardInsightSeverity,
  type TodayItem,
  type TodayItemPriority,
  type TodayItemType,
  formatPricePL,
  formatRelativeTime,
  formatAppointmentTime,
  ACTIVITY_TYPE_CONFIG,
} from '@/lib/dashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, isLoading, error, refresh } = useDashboard();
  const {
    today,
    isLoading: isTodayLoading,
    error: todayError,
    refresh: refreshToday,
    completeTask,
  } = useDashboardToday();
  const {
    insights,
    isLoading: isInsightsLoading,
    error: insightsError,
    refresh: refreshInsights,
    dismissInsight,
    restoreInsight,
  } = useDashboardInsights();
  const [activeTab, setActiveTab] = useState<DashboardTabId>('overview');

  const firstName = user?.agent?.firstName?.trim() ?? '';

  const greeting = firstName ? `Cześć, ${firstName}!` : 'Cześć!';

  const usageCards = user
    ? getPlanUsageMetrics(user).filter((item) => item.key !== 'users')
    : [];

  const hasUsageWarning = usageCards.some(({ usage, limit }) =>
    isUsageWarning(usage, limit),
  );
  const tabs = stats
    ? getDashboardTabs({
        stats,
        hasUsageWarning,
        planLabel: user?.entitlements.plan.label,
      })
    : [];
  const selectedTab =
    tabs.find((tab) => tab.id === activeTab && !tab.disabled) ?? tabs[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Zacznij od spraw, które wymagają reakcji dzisiaj.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            refresh();
            refreshToday();
            refreshInsights();
          }}
          disabled={isLoading || isTodayLoading || isInsightsLoading}
          className="gap-1.5 rounded-xl"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              isLoading || isTodayLoading || isInsightsLoading
                ? 'animate-spin'
                : ''
            }`}
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
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/20 p-2">
            <div
              className="grid gap-2 md:grid-cols-2 xl:grid-cols-6"
              role="tablist"
              aria-label="Widok dashboardu"
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
                    onClick={() => setActiveTab(tab.id)}
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
                  Aktywny widok
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">
                  {selectedTab.label}
                </h2>
              </div>
              <Badge variant="outline" className="w-fit rounded-full">
                {selectedTab.badge ?? 'Workspace'}
              </Badge>
            </div>
          </div>

          <div className="min-h-[560px] bg-background p-5">
            {selectedTab.id === 'overview' ? (
              <DashboardOverviewContent
                stats={stats}
                today={today}
                isTodayLoading={isTodayLoading}
                todayError={todayError}
                onRefreshToday={refreshToday}
                onCompleteTask={completeTask}
                insights={insights}
                isInsightsLoading={isInsightsLoading}
                insightsError={insightsError}
                onRefreshInsights={refreshInsights}
                onDismissInsight={dismissInsight}
                onRestoreInsight={restoreInsight}
              />
            ) : null}

            {selectedTab.id === 'onboarding' ? (
              <OnboardingChecklist stats={stats} />
            ) : null}

            {selectedTab.id === 'activity' ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <RecentActivityCard activities={stats.recentActivity} />
                <UpcomingAppointmentsCard
                  appointments={stats.upcomingAppointments}
                />
              </div>
            ) : null}

            {selectedTab.id === 'pipeline' ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ListingStatusBreakdown stats={stats.listings} />
                <ClientPipelineBreakdown stats={stats.clients} />
              </div>
            ) : null}

            {selectedTab.id === 'plan' ? (
              <DashboardPlanContent
                user={user}
                usageCards={usageCards}
                hasUsageWarning={hasUsageWarning}
              />
            ) : null}

            {selectedTab.id === 'feedback' ? (
              <FeatureSurveyList emptyState />
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}

type DashboardTabId =
  | 'overview'
  | 'onboarding'
  | 'activity'
  | 'pipeline'
  | 'plan'
  | 'feedback';

interface DashboardTab {
  id: DashboardTabId;
  label: string;
  description: string;
  icon: ElementType;
  badge?: string;
  badgeVariant?: React.ComponentProps<typeof Badge>['variant'];
  disabled?: boolean;
}

function getDashboardTabs({
  stats,
  hasUsageWarning,
  planLabel,
}: {
  stats: DashboardStats;
  hasUsageWarning: boolean;
  planLabel?: string;
}): DashboardTab[] {
  return [
    {
      id: 'overview',
      label: 'Dzisiaj',
      description: 'Leady, zadania i spotkania wymagające reakcji.',
      icon: LayoutDashboard,
      badge: String(
        stats.listings.active +
          stats.clients.total +
          stats.appointments.thisWeek,
      ),
    },
    {
      id: 'onboarding',
      label: 'Start',
      description: 'Checklista pierwszych działań w workspace.',
      icon: ClipboardList,
      badge: 'Kroki',
    },
    {
      id: 'activity',
      label: 'Aktywność',
      description: 'Ostatnie działania i nadchodzące spotkania.',
      icon: Activity,
      badge: String(
        stats.recentActivity.length + stats.upcomingAppointments.length,
      ),
    },
    {
      id: 'pipeline',
      label: 'Pipeline',
      description: 'Statusy ofert i lejek klientów.',
      icon: TrendingUp,
      badge: `${stats.clients.conversionRate}%`,
    },
    {
      id: 'plan',
      label: 'Plan',
      description: 'Limity i wykorzystanie aktualnego pakietu.',
      icon: BarChart3,
      badge: hasUsageWarning ? 'Limit' : planLabel,
      badgeVariant: hasUsageWarning ? 'warning' : 'secondary',
    },
    {
      id: 'feedback',
      label: 'Feedback',
      description: 'Aktywne ankiety produktowe i głos użytkownika.',
      icon: MessageSquareText,
      badge: 'Ankiety',
    },
  ];
}

function DashboardOverviewContent({
  stats,
  today,
  isTodayLoading,
  todayError,
  onRefreshToday,
  onCompleteTask,
  insights,
  isInsightsLoading,
  insightsError,
  onRefreshInsights,
  onDismissInsight,
  onRestoreInsight,
}: {
  stats: DashboardStats;
  today: DashboardTodayResponse | null;
  isTodayLoading: boolean;
  todayError: string | null;
  onRefreshToday: () => void;
  onCompleteTask: (taskId: string) => Promise<void>;
  insights: DashboardInsightsResponse | null;
  isInsightsLoading: boolean;
  insightsError: string | null;
  onRefreshInsights: () => void;
  onDismissInsight: (id: string) => Promise<void>;
  onRestoreInsight: (insight: DashboardInsight) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <TodayPanel
        today={today}
        isLoading={isTodayLoading}
        error={todayError}
        onRefresh={onRefreshToday}
        onCompleteTask={onCompleteTask}
      />

      <TodayOperationalSummary
        stats={stats}
        today={today}
        isLoading={isTodayLoading}
      />

      <DashboardInsightsPanel
        insights={insights}
        isLoading={isInsightsLoading}
        error={insightsError}
        onRefresh={onRefreshInsights}
        onDismiss={onDismissInsight}
        onRestore={onRestoreInsight}
      />

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <RevenueCard
          label="Szac. prowizja aktywna"
          value={formatPricePL(stats.revenue.activeCommissionValue)}
          icon={CircleDollarSign}
        />
        <RevenueCard
          label="Prowizja zamknięta"
          value={formatPricePL(stats.revenue.closedCommissionValue)}
          icon={TrendingUp}
        />
      </div>

      <DocumentAttentionCard stats={stats.documentAttention} />
    </div>
  );
}

function TodayOperationalSummary({
  stats,
  today,
  isLoading,
}: {
  stats: DashboardStats;
  today: DashboardTodayResponse | null;
  isLoading: boolean;
}) {
  const items = today?.items ?? [];
  const generatedAtMs = today?.generatedAt
    ? new Date(today.generatedAt).getTime()
    : 0;
  const overdueTasks = items.filter(
    (item) =>
      item.type === 'task' &&
      item.dueAt &&
      new Date(item.dueAt).getTime() < generatedAtMs,
  ).length;
  const publicLeads = items.filter((item) => item.type === 'public_lead').length;
  const appointmentsToday =
    items.filter((item) => item.type === 'appointment').length ||
    stats.appointments.today;

  const priorities = [
    {
      label: 'Nowe leady',
      value: publicLeads,
      description:
        publicLeads > 0
          ? 'Odpowiedz zanim lead ostygnie.'
          : 'Brak nowych zapytań do obsługi.',
      href: '/dashboard/inquiries',
      icon: MessageSquareText,
      variant: publicLeads > 0 ? 'warning' : 'success',
    },
    {
      label: 'Zadania po terminie',
      value: overdueTasks,
      description:
        overdueTasks > 0
          ? 'Domknij zaległe follow-upy.'
          : 'Brak zaległych zadań.',
      href: '/dashboard/tasks',
      icon: ClipboardList,
      variant: overdueTasks > 0 ? 'destructive' : 'success',
    },
    {
      label: 'Spotkania dzisiaj',
      value: appointmentsToday,
      description:
        appointmentsToday > 0
          ? 'Sprawdź plan dnia i kontekst klientów.'
          : 'Brak spotkań zaplanowanych na dziś.',
      href: '/dashboard/calendar',
      icon: CalendarCheck,
      variant: appointmentsToday > 0 ? 'info' : 'secondary',
    },
  ] satisfies Array<{
    label: string;
    value: number;
    description: string;
    href: string;
    icon: ElementType;
    variant: React.ComponentProps<typeof Badge>['variant'];
  }>;

  return (
    <section className="grid gap-3 lg:grid-cols-3" aria-label="Priorytety dnia">
      {priorities.map((priority) => (
        <Link
          key={priority.href}
          href={priority.href}
          className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <priority.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {priority.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {priority.description}
                </p>
              </div>
            </div>
            <Badge variant={isLoading && !today ? 'muted' : priority.variant}>
              {isLoading && !today ? '...' : priority.value}
            </Badge>
          </div>
        </Link>
      ))}
    </section>
  );
}

function TodayPanel({
  today,
  isLoading,
  error,
  onRefresh,
  onCompleteTask,
}: {
  today: DashboardTodayResponse | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onCompleteTask: (taskId: string) => Promise<void>;
}) {
  const items = today?.items ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Dzisiaj
            </h2>
            <Badge variant={items.length > 0 ? 'warning' : 'success'}>
              {items.length > 0 ? `${items.length} akcji` : 'Czysto'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Operacyjna lista najważniejszych spraw do obsłużenia teraz.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-1 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {isLoading && !today ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="min-h-28 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Nie udało się pobrać listy na dziś.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <DashboardEmptyNotice className="mt-4">
          Dzisiaj bez pilnych spraw.
        </DashboardEmptyNotice>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {items.map((item) => (
            <TodayItemCard
              key={item.id}
              item={item}
              onCompleteTask={onCompleteTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardInsightsPanel({
  insights,
  isLoading,
  error,
  onRefresh,
  onDismiss,
  onRestore,
}: {
  insights: DashboardInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDismiss: (id: string) => Promise<void>;
  onRestore: (insight: DashboardInsight) => Promise<void>;
}) {
  const items = insights?.insights ?? [];
  const [lastDismissedInsight, setLastDismissedInsight] =
    useState<DashboardInsight | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleDismiss(insight: DashboardInsight) {
    await onDismiss(insight.id);
    setLastDismissedInsight(insight);
  }

  async function handleRestore() {
    if (!lastDismissedInsight || isRestoring) return;

    setIsRestoring(true);
    try {
      await onRestore(lastDismissedInsight);
      setLastDismissedInsight(null);
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Insight dnia
            </h2>
            <Badge variant={items.length > 0 ? 'info' : 'success'}>
              {items.length > 0 ? `${items.length} wnioski` : 'Brak ryzyk'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatyczne rekomendacje działań na podstawie ofert, leadów,
            spotkań i potencjału prowizji.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-1 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Odśwież
        </Button>
      </div>

      {lastDismissedInsight ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Ukryto insight: {lastDismissedInsight.title}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRestoring}
            onClick={() => {
              void handleRestore();
            }}
          >
            {isRestoring ? 'Przywracanie...' : 'Cofnij'}
          </Button>
        </div>
      ) : null}

      {isLoading && !insights ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="min-h-32 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Nie udało się pobrać insightów.</p>
            <p className="mt-1 opacity-90">{error}</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <DashboardEmptyNotice className="mt-4">
          Brak nowych rekomendacji.
        </DashboardEmptyNotice>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {items.map((insight) => (
            <DashboardInsightCard
              key={insight.id}
              insight={insight}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardInsightCard({
  insight,
  onDismiss,
}: {
  insight: DashboardInsight;
  onDismiss: (insight: DashboardInsight) => Promise<void>;
}) {
  const config = DASHBOARD_INSIGHT_SEVERITY_CONFIG[insight.severity];
  const Icon = config.icon;
  const [isDismissing, setIsDismissing] = useState(false);

  async function handleDismiss() {
    if (isDismissing) return;

    setIsDismissing(true);
    try {
      await onDismiss(insight);
    } finally {
      setIsDismissing(false);
    }
  }

  return (
    <article className="flex min-h-36 flex-col justify-between rounded-xl border border-border bg-muted/10 p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-2 ${config.bg}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <Badge variant={config.badgeVariant} className="rounded-full">
              {config.label}
            </Badge>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled={isDismissing}
            title="Ukryj insight"
            aria-label="Ukryj insight"
            onClick={() => {
              void handleDismiss();
            }}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {insight.title}
          </h3>
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
            {insight.description}
          </p>
        </div>
      </div>

      <Link href={insight.actionHref} className="mt-4">
        <Button variant="outline" size="sm" className="w-full justify-between">
          {insight.actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </article>
  );
}

function DashboardEmptyNotice({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground ${
        className ?? ''
      }`}
    >
      {children}
    </div>
  );
}

function TodayItemCard({
  item,
  onCompleteTask,
}: {
  item: TodayItem;
  onCompleteTask: (taskId: string) => Promise<void>;
}) {
  const config = TODAY_ITEM_TYPE_CONFIG[item.type];
  const [isCompleting, setIsCompleting] = useState(false);

  const handleCompleteTask = async () => {
    if (item.type !== 'task' || isCompleting) return;

    setIsCompleting(true);
    try {
      await onCompleteTask(item.entityId);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <article className="flex min-h-32 flex-col justify-between rounded-xl border border-border bg-muted/10 p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-2 ${config.bg}`}>
              <config.icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <Badge
              variant={TODAY_PRIORITY_BADGE_VARIANT[item.priority]}
              className="rounded-full"
            >
              {TODAY_PRIORITY_LABELS[item.priority]}
            </Badge>
          </div>
          {item.dueAt ? (
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatTodayDueAt(item.dueAt)}
            </span>
          ) : null}
        </div>

        <div>
          <Link
            href={item.href}
            className="line-clamp-2 text-sm font-semibold text-foreground hover:text-primary"
          >
            {item.title}
          </Link>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {item.description}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {item.type === 'task' ? (
          <Button
            type="button"
            size="sm"
            className="w-full justify-between"
            onClick={handleCompleteTask}
            disabled={isCompleting}
          >
            {isCompleting ? 'Oznaczanie...' : 'Oznacz jako wykonane'}
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
        <Link href={item.action.href}>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
          >
            {item.action.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </article>
  );
}

const TODAY_PRIORITY_LABELS: Record<TodayItemPriority, string> = {
  high: 'Pilne',
  medium: 'Ważne',
  low: 'Do sprawdzenia',
};

const TODAY_PRIORITY_BADGE_VARIANT: Record<
  TodayItemPriority,
  React.ComponentProps<typeof Badge>['variant']
> = {
  high: 'destructive',
  medium: 'warning',
  low: 'secondary',
};

const DASHBOARD_INSIGHT_SEVERITY_CONFIG: Record<
  DashboardInsightSeverity,
  {
    label: string;
    icon: ElementType;
    color: string;
    bg: string;
    badgeVariant: React.ComponentProps<typeof Badge>['variant'];
  }
> = {
  warning: {
    label: 'Wymaga reakcji',
    icon: AlertCircle,
    color: 'text-status-warning',
    bg: 'bg-status-warning-bg',
    badgeVariant: 'warning',
  },
  info: {
    label: 'Do sprawdzenia',
    icon: Lightbulb,
    color: 'text-status-info',
    bg: 'bg-status-info-bg',
    badgeVariant: 'info',
  },
  success: {
    label: 'Szansa',
    icon: TrendingUp,
    color: 'text-brand-emerald',
    bg: 'bg-brand-emerald-light',
    badgeVariant: 'success',
  },
};

const TODAY_ITEM_TYPE_CONFIG: Record<
  TodayItemType,
  { icon: ElementType; color: string; bg: string }
> = {
  appointment: {
    icon: CalendarCheck,
    color: 'text-status-info',
    bg: 'bg-status-info-bg',
  },
  public_lead: {
    icon: MessageSquareText,
    color: 'text-brand-gold-dark',
    bg: 'bg-brand-gold-light',
  },
  document: {
    icon: FileWarning,
    color: 'text-status-warning',
    bg: 'bg-status-warning-bg',
  },
  listing: {
    icon: Home,
    color: 'text-brand-emerald',
    bg: 'bg-brand-emerald-light',
  },
  task: {
    icon: ClipboardList,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
};

function formatTodayDueAt(value: string): string {
  const date = new Date(value);

  return date.toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function DashboardPlanContent({
  user,
  usageCards,
  hasUsageWarning,
}: {
  user: ReturnType<typeof useAuth>['user'];
  usageCards: ReturnType<typeof getPlanUsageMetrics>;
  hasUsageWarning: boolean;
}) {
  if (!user) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                user.entitlements.plan.code === 'free' ? 'muted' : 'gold'
              }
            >
              Plan {user.entitlements.plan.label}
            </Badge>
            {hasUsageWarning ? (
              <Badge variant="warning">Zbliżasz się do limitu</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitoruj wykorzystanie limitów, aby uniknąć blokady przy tworzeniu
            nowych rekordów.
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
  );
}

function DocumentAttentionCard({
  stats,
}: {
  stats: DashboardStats['documentAttention'];
}) {
  const hasItems = stats.total > 0;
  const topItems = stats.items.slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-warning-bg">
            <FileWarning className="h-5 w-5 text-status-warning" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Dokumenty wymagające uwagi
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasItems
                ? `${stats.total} spraw do domknięcia w aktywnych ofertach.`
                : 'Aktywne oferty nie mają pilnych braków dokumentów.'}
            </p>
          </div>
        </div>
        <Link href="/dashboard/listings">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            Oferty
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <DocumentAttentionMetric label="Braki" value={stats.missingRequired} />
        <DocumentAttentionMetric
          label="Do poprawy"
          value={stats.needsCorrection}
        />
        <DocumentAttentionMetric label="Po terminie" value={stats.overdue} />
        <DocumentAttentionMetric label="Wygasłe" value={stats.expired} />
      </div>

      {topItems.length > 0 ? (
        <div className="mt-4 space-y-2">
          {topItems.map((item) => (
            <DocumentAttentionRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DocumentAttentionMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/25 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-heading text-lg font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function DocumentAttentionRow({ item }: { item: DocumentAttentionItem }) {
  return (
    <Link
      href={`/dashboard/listings/${item.listingId}?tab=documents`}
      className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-status-warning-bg">
        <FileWarning className="h-4 w-4 text-status-warning" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {getDocumentAttentionTitle(item)}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.listingTitle}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function getDocumentAttentionTitle(item: DocumentAttentionItem): string {
  if (item.kind === 'missing_required') {
    return `${item.count} brakujące wymagane dokumenty`;
  }

  if (item.kind === 'needs_correction') {
    return `${item.documentName ?? 'Dokument'} wymaga poprawy`;
  }

  if (item.kind === 'expired') {
    return `${item.documentName ?? 'Dokument'} stracił ważność`;
  }

  return `${item.documentName ?? 'Dokument'} jest po terminie`;
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
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
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
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
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Ostatnia aktywność
        </h2>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>

      {activities.length === 0 ? (
        <OnboardingEmptyState
          icon={Clock}
          title="Brak aktywności"
          description="Dodaj ofertę albo klienta, żeby zobaczyć historię pracy."
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
          description="Zaplanuj prezentację lub konsultację."
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
          description="Dodaj ofertę, żeby śledzić statusy i publikację."
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
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
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
          title="Brak klientów w pipeline"
          description="Dodaj klienta albo zaimportuj bazę CSV."
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
