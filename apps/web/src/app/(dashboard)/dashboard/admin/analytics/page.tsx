'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
  const decisionInsights = useMemo(
    () => (data ? buildDecisionInsights(data) : []),
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
              Produkt
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
        <div className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Nie udało się załadować analytics.</p>
            <p className="mt-1">{error}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-xl border-destructive/30 bg-card text-destructive hover:bg-destructive/10"
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setRefreshToken((current) => current + 1);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Ponów
          </Button>
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
          <DecisionInsightsPanel insights={decisionInsights} />

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

          <MarketplaceFunnelPanel data={data} />

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Alerty użycia
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sygnały spadku aktywności i brakujących kluczowych zdarzeń.
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

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Sekcje produktu
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Eventy pogrupowane według obszarów pracy użytkownika.
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.eventCategories
                .filter((category) => category.category !== 'other')
                .map((category) => (
                  <AnalyticsCategoryCard
                    key={category.category}
                    category={category}
                    totalEvents={data.summary.totalEvents}
                  />
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
                        {formatEventLabel(event.name)}
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
                        {formatEventLabel(event.name)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {event.name}
                        {event.path ? ` · ${event.path}` : ''}
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

type DecisionInsightTone = 'critical' | 'warning' | 'growth' | 'stable';

interface DecisionInsight {
  id: string;
  label: string;
  title: string;
  value: string;
  description: string;
  tone: DecisionInsightTone;
}

const KEY_ADOPTION_EVENTS = [
  'dashboard_today_viewed',
  'matching_results_viewed',
  'matching_cta_clicked',
  'message_template_copied',
  'owner_report_viewed',
] as const;

const EVENT_LABELS: Record<string, string> = {
  appointment_created: 'Utworzono spotkanie',
  blog_article_viewed: 'Wyświetlono artykuł bloga',
  blog_cta_clicked: 'Kliknięto CTA bloga',
  client_created: 'Utworzono klienta',
  clients_imported: 'Zaimportowano klientów',
  dashboard_today_viewed: 'Wyświetlono widok Dzisiaj',
  listing_created: 'Utworzono ofertę',
  limit_reached: 'Osiągnięto limit',
  limit_warning_shown: 'Pokazano ostrzeżenie limitu',
  matching_cta_clicked: 'Kliknięto akcję matchingu',
  matching_dismissed: 'Ukryto dopasowanie',
  matching_results_viewed: 'Wyświetlono dopasowania',
  agent_assignment_listing_copy_created: 'Utworzono kopię CRM współpracy',
  agent_listing_market_viewed: 'Wyświetlono rynek ofert agentów',
  listing_agent_collaboration_enabled: 'Włączono współpracę z agentami',
  listing_agent_proposal_accepted: 'Zaakceptowano propozycję agenta',
  listing_agent_proposal_opened_by_seller:
    'Właściciel otworzył propozycję agenta',
  listing_agent_proposal_rejected: 'Odrzucono propozycję agenta',
  listing_agent_proposal_sent: 'Wysłano propozycję współpracy',
  message_template_copied: 'Skopiowano szablon wiadomości',
  message_template_rendered: 'Wyrenderowano szablon wiadomości',
  notification_center_opened: 'Otworzono centrum powiadomień',
  notification_marked_read: 'Oznaczono powiadomienie jako przeczytane',
  notification_navigated: 'Przejście z powiadomienia',
  onboarding_checklist_dismissed: 'Ukryto checklistę onboardingu',
  onboarding_checklist_restored: 'Przywrócono checklistę onboardingu',
  onboarding_empty_state_cta_clicked: 'Kliknięto CTA pustego stanu',
  onboarding_empty_state_shown: 'Wyświetlono pusty stan',
  onboarding_step_completed: 'Ukończono krok onboardingu',
  owner_report_link_copied: 'Skopiowano link raportu właściciela',
  owner_report_summary_copied: 'Skopiowano podsumowanie raportu',
  owner_report_viewed: 'Wyświetlono raport właściciela',
  product_feedback_submitted: 'Wysłano feedback produktowy',
  public_lead_accepted: 'Zaakceptowano publiczny lead',
  public_lead_submitted: 'Wysłano publiczny lead',
  public_listing_abuse_reported: 'Zgłoszono publiczną ofertę',
  public_listing_catalog_result_clicked: 'Kliknięto wynik katalogu ofert',
  public_listing_claim_completed: 'Zakończono przejęcie oferty',
  public_listing_claim_started: 'Rozpoczęto przejęcie oferty',
  public_listing_gallery_image_viewed: 'Wyświetlono zdjęcie w galerii',
  public_listing_gallery_opened: 'Otworzono galerię oferty',
  public_listing_link_copied: 'Skopiowano link publicznej oferty',
  public_listing_map_search_used: 'Użyto wyszukiwania na mapie',
  public_listing_share_clicked: 'Kliknięto udostępnienie oferty',
  public_listing_viewed: 'Wyświetlono publiczną ofertę',
  signup_completed: 'Ukończono rejestrację',
  today_task_completed: 'Ukończono zadanie z widoku Dzisiaj',
  upgrade_cta_clicked: 'Kliknięto CTA upgrade',
};

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
      title: 'Brak kluczowych sygnałów',
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

function buildDecisionInsights(
  data: AdminAnalyticsUsageSummary,
): DecisionInsight[] {
  const sortedDailyEvents = [...data.dailyEvents].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const trend = getRecentTrend(sortedDailyEvents);
  const anomaly = getDailyAnomaly(sortedDailyEvents);
  const categorySignal = getCategorySignal(data);
  const missingAdoptionEvents = KEY_ADOPTION_EVENTS.filter(
    (eventName) => !data.topEvents.some((event) => event.name === eventName),
  );

  if (data.summary.totalEvents === 0) {
    return [
      {
        id: 'no-events-action',
        label: 'Wymaga reakcji',
        title: 'Brak danych analytics',
        value: '0 eventów',
        description:
          'Sprawdź consent, tracking frontendowy i endpoint `/admin/analytics/usage` przed oceną adopcji.',
        tone: 'critical',
      },
    ];
  }

  const insights: DecisionInsight[] = [
    {
      id: 'recent-trend',
      label: getTrendLabel(trend.changePercent),
      title:
        trend.changePercent >= 0 ? 'Wzrost aktywności' : 'Spadek aktywności',
      value: formatSignedPercent(trend.changePercent),
      description: `Ostatnie ${trend.recentDays} dni: ${trend.recentCount}, poprzednie ${trend.previousDays} dni: ${trend.previousCount}.`,
      tone:
        trend.changePercent <= -35
          ? 'critical'
          : trend.changePercent < 0
            ? 'warning'
            : trend.changePercent >= 35
              ? 'growth'
              : 'stable',
    },
    {
      id: 'daily-anomaly',
      label: anomaly ? 'Anomalia' : 'Stabilnie',
      title: anomaly ? 'Nietypowy dzień w danych' : 'Brak dużych anomalii',
      value: anomaly ? `${anomaly.date}: ${anomaly.count}` : 'OK',
      description: anomaly
        ? `Dzień odbiega o ${formatSignedPercent(anomaly.changePercent)} od średniej okresu.`
        : 'Dzienna aktywność nie odbiega istotnie od średniej wybranego okresu.',
      tone: anomaly
        ? Math.abs(anomaly.changePercent) >= 80
          ? 'critical'
          : 'warning'
        : 'stable',
    },
    {
      id: 'category-signal',
      label: categorySignal.requiresAction
        ? 'Wymaga reakcji'
        : 'Najmocniejszy obszar',
      title: categorySignal.title,
      value: categorySignal.value,
      description: categorySignal.description,
      tone: categorySignal.requiresAction ? 'warning' : 'growth',
    },
    {
      id: 'adoption-coverage',
      label: missingAdoptionEvents.length > 0 ? 'Luka adopcji' : 'Pokryte',
      title:
        missingAdoptionEvents.length > 0
          ? 'Brakuje kluczowych eventów'
          : 'Kluczowe eventy są widoczne',
      value:
        missingAdoptionEvents.length > 0
          ? `${missingAdoptionEvents.length} brakujące`
          : 'OK',
      description:
        missingAdoptionEvents.length > 0
          ? missingAdoptionEvents
              .slice(0, 3)
              .map((eventName) => formatEventLabel(eventName))
              .join(', ')
          : 'W danych są widoczne sygnały Dzisiaj, matchingu, komunikacji albo raportów.',
      tone: missingAdoptionEvents.length > 0 ? 'warning' : 'stable',
    },
  ];

  return insights;
}

function getRecentTrend(events: AdminAnalyticsUsageSummary['dailyEvents']): {
  recentCount: number;
  previousCount: number;
  recentDays: number;
  previousDays: number;
  changePercent: number;
} {
  const comparisonWindow = Math.min(
    7,
    Math.max(1, Math.floor(events.length / 2)),
  );
  const recent = events.slice(-comparisonWindow);
  const previous = events.slice(-comparisonWindow * 2, -comparisonWindow);
  const recentCount = sumDailyEvents(recent);
  const previousCount = sumDailyEvents(previous);

  if (previous.length === 0 || previousCount === 0) {
    return {
      recentCount,
      previousCount,
      recentDays: recent.length,
      previousDays: previous.length,
      changePercent: recentCount > 0 ? 100 : 0,
    };
  }

  return {
    recentCount,
    previousCount,
    recentDays: recent.length,
    previousDays: previous.length,
    changePercent: Math.round(
      ((recentCount - previousCount) / previousCount) * 100,
    ),
  };
}

function getDailyAnomaly(
  events: AdminAnalyticsUsageSummary['dailyEvents'],
): { date: string; count: number; changePercent: number } | null {
  if (events.length < 4) return null;

  const total = sumDailyEvents(events);
  const average = total / events.length;

  if (average <= 0) return null;

  const strongest = events
    .map((event) => ({
      ...event,
      changePercent: Math.round(((event.count - average) / average) * 100),
    }))
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];

  return Math.abs(strongest.changePercent) >= 60 ? strongest : null;
}

function getCategorySignal(data: AdminAnalyticsUsageSummary): {
  title: string;
  value: string;
  description: string;
  requiresAction: boolean;
} {
  const visibleCategories = data.eventCategories.filter(
    (category) => category.category !== 'other',
  );
  const emptyCategories = visibleCategories.filter(
    (category) => category.count === 0,
  );
  const strongest = [...visibleCategories].sort((a, b) => b.count - a.count)[0];

  if (emptyCategories.length >= 3) {
    return {
      title: 'Nierówny tracking sekcji',
      value: `${emptyCategories.length} puste`,
      description: `Brak eventów w: ${emptyCategories
        .slice(0, 3)
        .map((category) => ANALYTICS_CATEGORY_CONFIG[category.category].label)
        .join(', ')}.`,
      requiresAction: true,
    };
  }

  if (!strongest || strongest.count === 0) {
    return {
      title: 'Brak dominującej sekcji',
      value: '0',
      description:
        'Kategorie produktu nie mają jeszcze wystarczającej aktywności.',
      requiresAction: true,
    };
  }

  const strongestConfig = ANALYTICS_CATEGORY_CONFIG[strongest.category];

  return {
    title: strongestConfig.label,
    value: `${Math.round((strongest.count / data.summary.totalEvents) * 100)}%`,
    description: `Najwięcej aktywności generuje obszar: ${strongestConfig.description}`,
    requiresAction: false,
  };
}

function sumDailyEvents(events: AdminAnalyticsUsageSummary['dailyEvents']) {
  return events.reduce((sum, event) => sum + event.count, 0);
}

function formatSignedPercent(value: number): string {
  return `${value > 0 ? '+' : ''}${value}%`;
}

function getTrendLabel(changePercent: number): string {
  if (changePercent <= -35) return 'Wymaga reakcji';
  if (changePercent < 0) return 'Spadek';
  if (changePercent >= 35) return 'Wzrost';
  return 'Stabilnie';
}

function formatEventLabel(name: string): string {
  return (
    EVENT_LABELS[name] ??
    name
      .split('_')
      .filter(Boolean)
      .map((part, index) =>
        index === 0 ? capitalize(part) : part.toLocaleLowerCase('pl-PL'),
      )
      .join(' ')
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return `${value.charAt(0).toLocaleUpperCase('pl-PL')}${value.slice(1).toLocaleLowerCase('pl-PL')}`;
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

function DecisionInsightsPanel({ insights }: { insights: DecisionInsight[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Wymaga reakcji
            </h2>
            <Badge variant="outline" className="rounded-full">
              Decyzje
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Najważniejsze sygnały z analytics: anomalie, wzrosty, spadki i luki
            w adopcji kluczowych funkcji.
          </p>
        </div>
        <TrendingUp className="h-5 w-5 text-primary" />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {insights.map((insight) => (
          <DecisionInsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </section>
  );
}

function DecisionInsightCard({ insight }: { insight: DecisionInsight }) {
  const toneClassName: Record<DecisionInsightTone, string> = {
    critical: 'border-destructive/30 bg-destructive/5 text-destructive',
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-800',
    growth: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700',
    stable: 'border-border bg-muted/20 text-muted-foreground',
  };
  const Icon =
    insight.tone === 'growth'
      ? TrendingUp
      : insight.tone === 'critical' || insight.tone === 'warning'
        ? AlertCircle
        : CheckCircle2;

  return (
    <article className={`rounded-xl border p-4 ${toneClassName[insight.tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase">{insight.label}</p>
          <h3 className="mt-2 font-medium text-foreground">{insight.title}</h3>
        </div>
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-foreground">
        {insight.value}
      </p>
      <p className="mt-2 text-sm leading-5 opacity-90">{insight.description}</p>
    </article>
  );
}

function MarketplaceFunnelPanel({
  data,
}: {
  data: AdminAnalyticsUsageSummary;
}) {
  const marketplace = data.marketplace;
  const funnelSteps = [
    {
      id: 'collaboration-enabled',
      label: 'Włączono nabór',
      value: marketplace.collaborationEnabled,
      description: 'Właściciele otworzyli oferty na współpracę.',
    },
    {
      id: 'market-views',
      label: 'Wyświetlenia rynku',
      value: marketplace.marketViews,
      description: 'Agenci weszli na rynek ofert.',
    },
    {
      id: 'proposals-sent',
      label: 'Propozycje',
      value: marketplace.proposalsSent,
      description: 'Agenci wysłali propozycje współpracy.',
    },
    {
      id: 'seller-opened',
      label: 'Otwarcia właściciela',
      value: marketplace.proposalsOpenedBySeller,
      description: `${marketplace.sellerOpenRate}% względem wysłanych propozycji.`,
    },
    {
      id: 'accepted',
      label: 'Akceptacje',
      value: marketplace.proposalsAccepted,
      description: `${marketplace.acceptanceRate}% zaakceptowanych decyzji.`,
    },
    {
      id: 'copy-created',
      label: 'Kopie CRM',
      value: marketplace.listingCopiesCreated,
      description: `${marketplace.copyCreationRate}% względem akceptacji.`,
    },
  ];
  const maxValue = Math.max(1, ...funnelSteps.map((step) => step.value));

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Rynek ofert agentów
            </h2>
            <Badge variant="outline" className="rounded-full">
              Marketplace
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Lejek współpracy właściciel-agent od otwarcia naboru po kopię CRM.
          </p>
        </div>
        <HeartHandshake className="h-5 w-5 text-primary" />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {funnelSteps.map((step) => (
          <div
            key={step.id}
            className="rounded-xl border border-border/70 bg-muted/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {step.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <span className="shrink-0 text-xl font-semibold text-foreground">
                {step.value.toLocaleString('pl-PL')}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.max(4, (step.value / maxValue) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <MarketplaceRateCard
          label="Otwarcia propozycji"
          value={marketplace.sellerOpenRate}
          description="Właściciel otworzył propozycję po wysłaniu."
        />
        <MarketplaceRateCard
          label="Akceptacje decyzji"
          value={marketplace.acceptanceRate}
          description="Udział akceptacji w decyzjach właścicieli."
        />
        <MarketplaceRateCard
          label="Kopie po akceptacji"
          value={marketplace.copyCreationRate}
          description="Agenci utworzyli kopię CRM po akceptacji."
        />
      </div>
    </section>
  );
}

function MarketplaceRateCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Badge variant="outline" className="rounded-full">
          {value}%
        </Badge>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

type AnalyticsCategory = AdminAnalyticsUsageSummary['eventCategories'][number];

const ANALYTICS_CATEGORY_CONFIG: Record<
  AnalyticsCategory['category'],
  {
    label: string;
    description: string;
    icon: typeof Activity;
  }
> = {
  activation: {
    label: 'Aktywacja',
    description: 'Onboarding, Dzisiaj i pierwsze zadania.',
    icon: Users,
  },
  communication: {
    label: 'Komunikacja',
    description: 'Szablony wiadomości i powiadomienia.',
    icon: MessageSquareText,
  },
  matching: {
    label: 'Matching',
    description: 'Dopasowania klientów i ofert.',
    icon: Sparkles,
  },
  retention: {
    label: 'Retencja',
    description: 'Raporty właściciela i codzienna praca CRM.',
    icon: HeartHandshake,
  },
  public_growth: {
    label: 'Public growth',
    description: 'Publiczne oferty, leady, blog i feedback.',
    icon: BarChart3,
  },
  limits: {
    label: 'Limity',
    description: 'Ostrzeżenia limitów i CTA upgrade.',
    icon: ShieldCheck,
  },
  other: {
    label: 'Inne',
    description: 'Eventy spoza głównych sekcji produktu.',
    icon: Activity,
  },
};

function AnalyticsCategoryCard({
  category,
  totalEvents,
}: {
  category: AnalyticsCategory;
  totalEvents: number;
}) {
  const config = ANALYTICS_CATEGORY_CONFIG[category.category];
  const Icon = config.icon;
  const topEvents = category.events.slice(0, 3);
  const categoryShare =
    totalEvents > 0 ? Math.round((category.count / totalEvents) * 100) : 0;
  const topEventCount = Math.max(1, ...topEvents.map((event) => event.count));

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{config.label}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {config.description}
          </p>
        </div>
        <Icon className="h-4 w-4 shrink-0 text-primary" />
      </div>

      <p className="mt-4 text-2xl font-semibold text-foreground">
        {category.count.toLocaleString('pl-PL')}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(2, categoryShare)}%` }}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {categoryShare}%
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {topEvents.length > 0 ? (
          topEvents.map((event) => (
            <div key={event.name} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate font-medium text-foreground">
                  {formatEventLabel(event.name)}
                </span>
                <span className="font-medium text-foreground">
                  {event.count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{
                    width: `${Math.max(4, (event.count / topEventCount) * 100)}%`,
                  }}
                />
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {event.name}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Brak eventów.</p>
        )}
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
