'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { useAuth } from '@/contexts/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchAdminAnalyticsUsage,
  type AdminAnalyticsUsageSummary,
} from '@/lib/admin-analytics';

const PERIOD_OPTIONS = [
  { value: '7', label: '7 dni' },
  { value: '14', label: '14 dni' },
  { value: '30', label: '30 dni' },
  { value: '60', label: '60 dni' },
  { value: '90', label: '90 dni' },
];

export default function AdminAnalyticsUsagePage() {
  const { user } = useAuth();
  const [days, setDays] = useState('30');
  const [data, setData] = useState<AdminAnalyticsUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    fetchAdminAnalyticsUsage(Number(days))
      .then((response) => {
        if (isMounted) setData(response);
      })
      .catch((fetchError) => {
        if (isMounted) setError(getApiErrorMessage(fetchError));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [days, isAdmin, refreshToken]);

  const maxDailyCount = useMemo(
    () =>
      Math.max(1, ...(data?.dailyEvents.map((event) => event.count) ?? [0])),
    [data?.dailyEvents],
  );
  const usageAlerts = useMemo(
    () => (data ? buildUsageAlerts(data) : []),
    [data],
  );

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Brak dostępu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Raport analytics jest dostępny tylko dla administratorów.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold">
              Analytics użycia
            </h1>
            <Badge variant="outline" className="rounded-full">
              UX rollout
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Zagregowany podgląd eventów produktowych bez danych osobowych i bez
            treści wiadomości.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InlineSelect
            value={days}
            options={PERIOD_OPTIONS}
            onChange={(value) => {
              setIsLoading(true);
              setError(null);
              setDays(value || '30');
            }}
            placeholder="Zakres"
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl"
            disabled={isLoading}
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setRefreshToken((current) => current + 1);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Odśwież
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isLoading && !data ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-border bg-muted/30"
            />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            <MetricCard
              label="Eventy"
              value={data.summary.totalEvents}
              icon={Activity}
            />
            <MetricCard
              label="Użytkownicy"
              value={data.summary.activeUsers}
              icon={Users}
            />
            <MetricCard
              label="Agenci"
              value={data.summary.activeAgents}
              icon={ShieldCheck}
            />
            <MetricCard
              label="Workspace"
              value={data.summary.activeAgencies}
              icon={BarChart3}
            />
          </div>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Alerty rolloutu
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Szybkie sygnały spadku aktywności i brakujących eventów
                  adopcyjnych.
                </p>
              </div>
              <TrendingDown className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {usageAlerts.map((alert) => (
                <UsageAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-lg font-semibold text-foreground">
                    Aktywność dzienna
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Liczba zapisanych eventów w wybranym okresie.
                  </p>
                </div>
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-5 space-y-3">
                {data.dailyEvents.length > 0 ? (
                  data.dailyEvents.map((event) => (
                    <div key={event.date} className="grid gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {event.date}
                        </span>
                        <span className="text-muted-foreground">
                          {event.count}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max(4, (event.count / maxDailyCount) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Brak eventów w wybranym okresie.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Najczęstsze eventy
              </h2>
              <div className="mt-4 space-y-2">
                {data.topEvents.length > 0 ? (
                  data.topEvents.map((event) => (
                    <div
                      key={event.name}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">
                        {event.name}
                      </span>
                      <Badge variant="outline" className="rounded-full">
                        {event.count}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    Brak eventów do pokazania.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Ostatnie zdarzenia
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[1fr_140px_160px] gap-3 border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
                <span>Event</span>
                <span>Plan</span>
                <span>Czas</span>
              </div>
              {data.recentEvents.length > 0 ? (
                data.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="grid grid-cols-[1fr_140px_160px] gap-3 border-b border-border/70 px-4 py-3 text-sm last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {event.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {event.path ?? 'Brak ścieżki'}
                      </p>
                    </div>
                    <span className="text-muted-foreground">
                      {event.planCode ?? '-'}
                    </span>
                    <span className="text-muted-foreground">
                      {formatAnalyticsDate(event.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Brak ostatnich zdarzeń.
                </p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

type UsageAlertSeverity = 'success' | 'info' | 'warning' | 'critical';

interface UsageAlert {
  id: string;
  title: string;
  description: string;
  severity: UsageAlertSeverity;
}

const KEY_ADOPTION_EVENTS = [
  'dashboard_today_viewed',
  'matching_results_viewed',
  'matching_cta_clicked',
  'message_template_copied',
  'owner_report_viewed',
] as const;

function buildUsageAlerts(data: AdminAnalyticsUsageSummary): UsageAlert[] {
  const alerts: UsageAlert[] = [];
  const sortedDailyEvents = [...data.dailyEvents].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const recentThreeDaysCount = sumDailyEvents(sortedDailyEvents.slice(-3));
  const previousThreeDaysCount = sumDailyEvents(
    sortedDailyEvents.slice(-6, -3),
  );
  const topEventNames = new Set(data.topEvents.map((event) => event.name));
  const hasKeyAdoptionEvent = KEY_ADOPTION_EVENTS.some((eventName) =>
    topEventNames.has(eventName),
  );

  if (data.summary.totalEvents === 0) {
    alerts.push({
      id: 'no-events',
      title: 'Brak eventów',
      description: 'Sprawdź tracking frontendowy albo endpoint analytics.',
      severity: 'critical',
    });

    return alerts;
  }

  if (data.summary.activeUsers === 0) {
    alerts.push({
      id: 'no-users',
      title: 'Brak aktywnych użytkowników',
      description:
        'Eventy nie mają powiązanego użytkownika w wybranym okresie.',
      severity: 'critical',
    });
  }

  if (
    sortedDailyEvents.length >= 6 &&
    previousThreeDaysCount >= 5 &&
    recentThreeDaysCount <= previousThreeDaysCount * 0.5
  ) {
    alerts.push({
      id: 'daily-drop',
      title: 'Spadek aktywności',
      description: `Ostatnie 3 dni: ${recentThreeDaysCount}, poprzednie 3 dni: ${previousThreeDaysCount}.`,
      severity: 'warning',
    });
  }

  if (!hasKeyAdoptionEvent) {
    alerts.push({
      id: 'missing-key-events',
      title: 'Brak kluczowych eventów UX-10',
      description:
        'Nie widać eventów Dzisiaj, matchingu, wiadomości lub raportu.',
      severity: 'info',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'rollout-stable',
      title: 'Brak alertów',
      description: 'Aktywność i kluczowe eventy wyglądają stabilnie.',
      severity: 'success',
    });
  }

  return alerts;
}

function sumDailyEvents(events: AdminAnalyticsUsageSummary['dailyEvents']) {
  return events.reduce((sum, event) => sum + event.count, 0);
}

function UsageAlertCard({ alert }: { alert: UsageAlert }) {
  const Icon = alert.severity === 'success' ? CheckCircle2 : AlertCircle;
  const classNameBySeverity: Record<UsageAlertSeverity, string> = {
    success: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700',
    info: 'border-blue-500/30 bg-blue-500/5 text-blue-700',
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700',
    critical: 'border-destructive/30 bg-destructive/5 text-destructive',
  };

  return (
    <div
      className={`rounded-xl border p-4 ${classNameBySeverity[alert.severity]}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium">{alert.title}</p>
          <p className="mt-1 text-sm opacity-90">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">
        {value.toLocaleString('pl-PL')}
      </p>
    </div>
  );
}

function formatAnalyticsDate(value: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
