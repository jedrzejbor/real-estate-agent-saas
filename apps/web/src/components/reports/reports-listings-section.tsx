import {
  Building2,
  CalendarDays,
  FolderOpen,
  Home,
  Layers3,
  PieChart,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportSectionCard } from '@/components/reports/report-section-card';
import { formatPricePL } from '@/lib/dashboard';
import {
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type ListingStatus,
  type PropertyType,
  type TransactionType,
} from '@/lib/listings';
import {
  type ListingsBreakdownItem,
  type ListingsReportResponse,
} from '@/lib/reports';
import { cn } from '@/lib/utils';

interface ReportsListingsSectionProps {
  data: ListingsReportResponse;
}

export function ReportsListingsSection({
  data,
}: ReportsListingsSectionProps) {
  const { summary, breakdowns, notes } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          Raport Oferty
        </Badge>
        <span className="text-sm text-muted-foreground">
          Pierwszy dedykowany pionowy slice raportowy
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          icon={FolderOpen}
          title="Oferty łącznie"
          value={String(summary.totalListings)}
          subtitle={`${summary.newListings} nowych w wybranym okresie`}
        />
        <SummaryCard
          icon={Building2}
          title="Aktywacje"
          value={String(summary.activatedListings)}
          subtitle={`${summary.activeListingsEnd} aktywnych na koniec okresu`}
        />
        <SummaryCard
          icon={PieChart}
          title="Zamknięcia"
          value={String(summary.closedListings)}
          subtitle={`${summary.withdrawnListings} wycofanych / zarchiwizowanych`}
        />
        <SummaryCard
          icon={CalendarDays}
          title="Śr. czas życia oferty"
          value={
            summary.averageLifecycleDays !== null
              ? `${summary.averageLifecycleDays} dni`
              : 'Brak danych'
          }
          subtitle="Dla ofert zakończonych w wybranym okresie"
        />
        <SummaryCard
          icon={Home}
          title="Aktywne oferty"
          value={String(summary.activeListingsEnd)}
          subtitle="Snapshot według bieżącego statusu"
        />
        <SummaryCard
          icon={Layers3}
          title="Nowe oferty"
          value={String(summary.newListings)}
          subtitle="Utworzone w wybranym zakresie dat"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <BreakdownCard
          title="Statusy ofert"
          items={breakdowns.byStatus}
          getLabel={(item) => LISTING_STATUS_LABELS[item.key as ListingStatus] ?? item.key}
          accent="emerald"
        />
        <BreakdownCard
          title="Typy nieruchomości"
          items={breakdowns.byPropertyType}
          getLabel={(item) => PROPERTY_TYPE_LABELS[item.key as PropertyType] ?? item.key}
          accent="gold"
          showDetails
        />
        <BreakdownCard
          title="Typy transakcji"
          items={breakdowns.byTransactionType}
          getLabel={(item) => TRANSACTION_TYPE_LABELS[item.key as TransactionType] ?? item.key}
          accent="info"
          showDetails
        />
      </div>

      <ReportSectionCard
        title="Założenia i ograniczenia"
        description="Ten raport korzysta wyłącznie z danych dostępnych obecnie w modelu Listing, dlatego część metryk to świadome przybliżenia MVP."
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
  showDetails = false,
}: {
  title: string;
  items: ListingsBreakdownItem[];
  getLabel: (item: ListingsBreakdownItem) => string;
  accent: 'emerald' | 'gold' | 'info';
  showDetails?: boolean;
}) {
  const accentClass = {
    emerald: 'bg-brand-emerald/85',
    gold: 'bg-brand-gold/85',
    info: 'bg-status-info/85',
  }[accent];

  return (
    <Card className="rounded-2xl border border-border shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak danych dla wybranego zakresu.</p>
        ) : (
          items.map((item) => (
            <div key={item.key} className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{getLabel(item)}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.count} ofert • {item.percentage}% udziału
                  </div>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                  {item.count}
                </Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', accentClass)}
                  style={{ width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%` }}
                />
              </div>
              {showDetails && (
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Aktywne: {item.activeCount ?? 0}</span>
                  <span>Zamknięte: {item.closedCount ?? 0}</span>
                  <span>Wartość: {formatPricePL(item.totalValue ?? 0)}</span>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
