import type { ElementType } from 'react';
import {
  BadgeCheck,
  BriefcaseBusiness,
  CirclePercent,
  Funnel,
  PhoneCall,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { OnboardingEmptyState } from '@/components/dashboard/onboarding-empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportSectionCard } from '@/components/reports/report-section-card';
import {
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  type ClientSource,
  type ClientStatus,
} from '@/lib/clients';
import {
  type ClientsBreakdownItem,
  type ClientsReportResponse,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface ReportsClientsSectionProps {
  data: ClientsReportResponse;
}

export function ReportsClientsSection({ data }: ReportsClientsSectionProps) {
  const { summary, breakdowns, notes } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          Raport Klienci
        </Badge>
        <span className="text-sm text-muted-foreground">
          Drugi dedykowany pionowy slice raportowy
        </span>
      </div>

      {summary.totalClients === 0 ? (
        <OnboardingEmptyState
          icon={Users}
          title="Raport Klienci potrzebuje pierwszych kontaktów"
          description="Dodaj klienta albo zaimportuj CSV, żeby zobaczyć źródła leadów, statusy pipeline’u i pierwszą konwersję."
          actionHref="/dashboard/clients/new"
          actionLabel="Dodaj klienta"
          compact
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          icon={Users}
          title="Klienci łącznie"
          value={String(summary.totalClients)}
          subtitle={`${summary.newClients} nowych w wybranym okresie`}
        />
        <SummaryCard
          icon={Funnel}
          title="Aktywny pipeline"
          value={String(summary.activePipeline)}
          subtitle={`${summary.negotiatingClients} w negocjacjach`}
        />
        <SummaryCard
          icon={BadgeCheck}
          title="Wygrane sprawy"
          value={String(summary.wonClients)}
          subtitle={`${summary.lostClients} utraconych w okresie`}
        />
        <SummaryCard
          icon={CirclePercent}
          title="Konwersja"
          value={`${summary.conversionRate}%`}
          subtitle="Won / (won + lost)"
        />
        <SummaryCard
          icon={BriefcaseBusiness}
          title="Negocjacje"
          value={String(summary.negotiatingClients)}
          subtitle="Snapshot według bieżącego statusu"
        />
        <SummaryCard
          icon={PhoneCall}
          title="Nowi klienci"
          value={String(summary.newClients)}
          subtitle="Utworzeni w wybranym zakresie dat"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Statusy klientów"
          items={breakdowns.byStatus}
          getLabel={(item) =>
            CLIENT_STATUS_LABELS[item.key as ClientStatus] ?? item.key
          }
          accent="emerald"
        />
        <BreakdownCard
          title="Źródła leadów"
          items={breakdowns.bySource}
          getLabel={(item) =>
            CLIENT_SOURCE_LABELS[item.key as ClientSource] ?? item.key
          }
          accent="gold"
          showSourceDetails
        />
      </div>

      <ReportSectionCard
        title="Założenia i ograniczenia"
        description="Raport Klienci korzysta z obecnego modelu `Client` i preferencji klienta, więc część przekrojów pozostaje świadomie ograniczona do danych dostępnych dziś w systemie."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          {notes.map((note) => (
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
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 pt-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 font-heading text-2xl font-bold text-foreground">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  items,
  getLabel,
  accent,
  showSourceDetails = false,
}: {
  title: string;
  items: ClientsBreakdownItem[];
  getLabel: (item: ClientsBreakdownItem) => string;
  accent: 'emerald' | 'gold';
  showSourceDetails?: boolean;
}) {
  const accentClass = {
    emerald: 'bg-brand-emerald/85',
    gold: 'bg-brand-gold/85',
  }[accent];

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak danych dla wybranego zakresu.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.key}
              className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">
                    {getLabel(item)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.count} klientów • {item.percentage}% udziału
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                  {item.count}
                </Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', accentClass)}
                  style={{
                    width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%`,
                  }}
                />
              </div>
              {showSourceDetails && (
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>Won: {item.wonCount ?? 0}</span>
                  <span>Lost: {item.lostCount ?? 0}</span>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
