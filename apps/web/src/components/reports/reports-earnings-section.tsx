import {
  BadgeDollarSign,
  BarChart3,
  CircleDollarSign,
  Layers3,
  LockKeyhole,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportSectionCard } from '@/components/reports/report-section-card';
import { formatPricePL } from '@/lib/dashboard';
import {
  LISTING_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  type ListingStatus,
  type TransactionType,
} from '@/lib/listings';
import {
  TRANSACTION_STATUS_LABELS,
  type TransactionStatus,
} from '@/lib/transactions';
import {
  type EarningsBreakdownItem,
  type EarningsReportResponse,
} from '@/lib/reports';

interface ReportsEarningsSectionProps {
  data: EarningsReportResponse;
}

export function ReportsEarningsSection({ data }: ReportsEarningsSectionProps) {
  const { summary, breakdowns, timeline, notes } = data;
  const hasCommissionData = summary.listingsWithCommission > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          Raport Zarobki
        </Badge>
        <span className="text-sm text-muted-foreground">
          Prywatne szacunki prowizji agenta
        </span>
      </div>

      {!hasCommissionData ? (
        <ReportSectionCard
          title="Brak danych prowizyjnych"
          description="Uzupełnij prowizję przy ofertach, aby raport mógł oszacować zarobki."
        >
          <p className="text-sm text-muted-foreground">
            Raport korzysta wyłącznie z prywatnych pól prowizji zapisanych w
            dashboardzie. Publiczne strony ofert nadal nie pokazują tych danych.
          </p>
        </ReportSectionCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          icon={BadgeDollarSign}
          title="Prowizja zamknięta"
          value={formatPricePL(summary.closedCommissionValue)}
          subtitle={`${summary.closedListingsWithCommission} transakcji closed_won w okresie`}
        />
        <SummaryCard
          icon={CircleDollarSign}
          title="Szac. prowizja aktywna"
          value={formatPricePL(summary.activeCommissionValue)}
          subtitle="Aktywne oferty z prowizją na koniec zakresu"
        />
        <SummaryCard
          icon={TrendingUp}
          title="Szac. prowizja łącznie"
          value={formatPricePL(summary.estimatedCommissionValue)}
          subtitle={`${summary.listingsWithCommission} ofert ma ustawioną prowizję`}
        />
        <SummaryCard
          icon={BarChart3}
          title="Śr. prowizja zamknięta"
          value={formatPricePL(summary.averageClosedCommissionValue)}
          subtitle="Średnia dla zamkniętych transakcji w okresie"
        />
        <SummaryCard
          icon={Layers3}
          title="Oferty z prowizją"
          value={String(summary.listingsWithCommission)}
          subtitle="Wszystkie oferty z prowizją w bieżącym zakresie"
        />
        <SummaryCard
          icon={LockKeyhole}
          title="Widoczność"
          value="Prywatne"
          subtitle="Dane dostępne tylko w dashboardzie"
        />
      </div>

      <ReportSectionCard
        title="Trend zamkniętych prowizji"
        description="Prowizje z transakcji zamkniętych jako wygrane w wybranym okresie."
      >
        <div className="space-y-3">
          {timeline.map((bucket) => (
            <div
              key={bucket.key}
              className="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-3 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {bucket.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {bucket.closedListings} zamkniętych transakcji
                </p>
              </div>
              <p className="font-heading text-lg font-bold text-foreground">
                {formatPricePL(bucket.closedCommissionValue)}
              </p>
            </div>
          ))}
        </div>
      </ReportSectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Prowizja wg statusu"
          items={breakdowns.byStatus}
          getLabel={(item) =>
            TRANSACTION_STATUS_LABELS[item.key as TransactionStatus] ??
            LISTING_STATUS_LABELS[item.key as ListingStatus] ??
            item.key
          }
        />
        <BreakdownCard
          title="Prowizja wg typu transakcji"
          items={breakdowns.byTransactionType}
          getLabel={(item) =>
            TRANSACTION_TYPE_LABELS[item.key as TransactionType] ?? item.key
          }
          showDetails
        />
      </div>

      <ReportSectionCard
        title="Założenia i ograniczenia"
        description="Raport Zarobki pokazuje estymację operacyjną, nie rozliczenie księgowe."
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
  icon: React.ElementType;
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
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
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
  showDetails = false,
}: {
  title: string;
  items: EarningsBreakdownItem[];
  getLabel: (item: EarningsBreakdownItem) => string;
  showDetails?: boolean;
}) {
  const maxCommission = Math.max(
    ...items.map((item) => item.commissionValue),
    0,
  );

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak danych prowizyjnych dla wybranego zakresu.
          </p>
        ) : (
          items.map((item) => {
            const width =
              maxCommission > 0
                ? Math.max((item.commissionValue / maxCommission) * 100, 4)
                : 0;

            return (
              <div
                key={item.key}
                className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {getLabel(item)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} ofert z prowizją
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatPricePL(item.commissionValue)}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${width}%` }}
                  />
                </div>
                {showDetails ? (
                  <p className="text-xs text-muted-foreground">
                    {item.activeCount ?? 0} aktywnych / {item.closedCount ?? 0}{' '}
                    zamkniętych
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
