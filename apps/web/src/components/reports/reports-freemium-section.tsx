import type { ElementType } from 'react';
import { MousePointerClick, RadioTower, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReportSectionCard } from './report-section-card';
import type { FreemiumMetricsReportResponse } from '@/lib/reports';

interface ReportsFreemiumSectionProps {
  data: FreemiumMetricsReportResponse;
}

export function ReportsFreemiumSection({ data }: ReportsFreemiumSectionProps) {
  const maxTimelineValue = Math.max(
    1,
    ...data.timeline.map(
      (bucket) =>
        bucket.listingCreated +
        bucket.listingPublished +
        bucket.publicLeads +
        bucket.upgradeClicks,
    ),
  );

  return (
    <section className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Freemium growth
          </h2>
          <Badge variant="brand">MVP dashboard</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Minimalny raport aktywacji, publicznych ofert, leadów i upgrade intent
          na podstawie eventów produktu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={RadioTower}
          label="Publikacja ofert"
          value={`${data.summary.publishRate}%`}
          detail={`${data.summary.publishedListings}/${data.summary.firstListings} ofert`}
        />
        <MetricCard
          icon={Users}
          label="Lead capture"
          value={`${data.summary.leadCaptureRate}%`}
          detail={`${data.summary.publicLeads}/${data.summary.publicViews} odsłon`}
        />
        <MetricCard
          icon={TrendingUp}
          label="Claim completion"
          value={`${data.summary.claimCompletionRate}%`}
          detail={`${data.summary.claimCompletions}/${data.summary.claimStarts} claimów`}
        />
        <MetricCard
          icon={MousePointerClick}
          label="Upgrade intent"
          value={String(data.summary.upgradeClicks)}
          detail={`${data.summary.limitsReached} osiągniętych limitów`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ReportSectionCard
          title="Trend freemium"
          description="Aktywacja i konwersje growth w kolejnych bucketach czasu."
        >
          <div className="space-y-3">
            {data.timeline.map((bucket) => {
              const total =
                bucket.listingCreated +
                bucket.listingPublished +
                bucket.publicLeads +
                bucket.upgradeClicks;
              const width = Math.max(
                4,
                Math.round((total / maxTimelineValue) * 100),
              );

              return (
                <div key={bucket.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-foreground">
                      {bucket.label}
                    </span>
                    <span className="text-muted-foreground">
                      {bucket.listingCreated} utw. / {bucket.listingPublished}{' '}
                      publ. / {bucket.publicLeads} lead / {bucket.upgradeClicks}{' '}
                      upgrade
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ReportSectionCard>

        <ReportSectionCard
          title="Upgrade intent"
          description="Najczęściej klikane ścieżki premium i miejsca, z których wychodzi intencja upgrade."
        >
          <div className="space-y-5">
            <BreakdownList
              title="Upsell"
              items={data.upgradeIntent.byUpsell}
              emptyText="Brak kliknięć upsell w tym okresie."
            />
            <BreakdownList
              title="Źródło"
              items={data.upgradeIntent.bySource}
              emptyText="Brak danych o źródłach kliknięć."
            />
          </div>
        </ReportSectionCard>
      </div>

      <ReportSectionCard
        title="Eventy freemium"
        description="Surowe liczniki najważniejszych zdarzeń aktywacji i monetyzacji."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.events.map((event) => (
            <div
              key={event.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm"
            >
              <span className="text-muted-foreground">{event.label}</span>
              <span className="font-semibold text-foreground">
                {event.count}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {data.notes.map((note) => (
            <p
              key={note}
              className="rounded-xl bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground"
            >
              {note}
            </p>
          ))}
        </div>
      </ReportSectionCard>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ElementType;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-semibold text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function BreakdownList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{ key: string; label: string; count: number }>;
  emptyText: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={`${title}-${item.key}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">
                  {item.count}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round((item.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
