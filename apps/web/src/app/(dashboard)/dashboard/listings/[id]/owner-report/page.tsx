'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clipboard,
  Eye,
  FileText,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import {
  fetchListingOwnerReport,
  formatArea,
  formatPrice,
  LISTING_PUBLICATION_STATUS_LABELS,
  LISTING_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  type ListingOwnerReportMetricDelta,
  type ListingOwnerReport,
} from '@/lib/listings';
import { formatDisplayDateNumeric } from '@/lib/date-format';

export default function ListingOwnerReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [dateFrom, setDateFrom] = useState(() => getDateInputValue(-30));
  const [dateTo, setDateTo] = useState(() => getDateInputValue(0));
  const [requestState, setRequestState] = useState<{
    requestKey: string | null;
    report: ListingOwnerReport | null;
    error: string | null;
  }>({
    requestKey: null,
    report: null,
    error: null,
  });

  useEffect(() => {
    if (!params.id) return;
    if (!dateFrom || !dateTo) return;

    let isCancelled = false;
    const requestKey = buildReportRequestKey(params.id, dateFrom, dateTo);

    fetchListingOwnerReport(params.id, {
      from: toStartOfDayIso(dateFrom),
      to: toEndOfDayIso(dateTo),
    })
      .then((response) => {
        if (!isCancelled) {
          setRequestState({
            requestKey,
            report: response,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setRequestState({
            requestKey,
            report: null,
            error:
              err instanceof Error
                ? err.message
                : 'Nie udało się pobrać raportu',
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dateFrom, dateTo, params.id]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showSuccessToast({
        title: 'Link skopiowany',
        description: 'Wewnętrzny link do raportu jest w schowku.',
      });
    } catch {
      showErrorToast({
        title: 'Nie udało się skopiować linku',
        description: 'Skopiuj adres z paska przeglądarki.',
      });
    }
  }, [showErrorToast, showSuccessToast]);

  const currentRequestKey =
    params.id && dateFrom && dateTo
      ? buildReportRequestKey(params.id, dateFrom, dateTo)
      : null;
  const isCurrentReport = requestState.requestKey === currentRequestKey;
  const report = isCurrentReport ? requestState.report : null;
  const error = isCurrentReport ? requestState.error : null;

  if (!isCurrentReport && !error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć
        </button>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">
            {error ?? 'Nie znaleziono raportu'}
          </p>
        </div>
      </div>
    );
  }

  const listing = report.listing;
  const address = formatReportAddress(listing.address);

  return (
    <div className="mx-auto max-w-6xl space-y-6 print:max-w-none print:bg-white print:text-black">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/dashboard/listings/${listing.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Wróć do oferty
        </Link>
        <div className="flex flex-wrap gap-2">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Od
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Do
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 rounded-xl"
          >
            <Clipboard className="h-3.5 w-3.5" />
            Kopiuj link
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 rounded-xl"
          >
            <Printer className="h-3.5 w-3.5" />
            Drukuj
          </Button>
        </div>
      </div>

      <article className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm print:border-0 print:bg-white print:p-0 print:shadow-none">
        <header className="grid gap-6 border-b border-border pb-6 print:border-black/20 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm font-medium uppercase text-muted-foreground print:text-black/60">
              Raport właściciela oferty
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold text-foreground print:text-black">
              {listing.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground print:text-black/70">
              {address || 'Adres nieuzupełniony'} ·{' '}
              {PROPERTY_TYPE_LABELS[listing.propertyType]} ·{' '}
              {TRANSACTION_TYPE_LABELS[listing.transactionType]}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm text-muted-foreground print:text-black/60">
              Okres raportu
            </p>
            <p className="mt-1 font-semibold text-foreground print:text-black">
              {formatDisplayDateNumeric(report.period.from)} -{' '}
              {formatDisplayDateNumeric(report.period.to)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground print:text-black/60">
              Wygenerowano {formatDisplayDateNumeric(report.generatedAt)}
            </p>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <ReportMetric
            label="Wyświetlenia"
            value={report.metrics.publicViews}
            delta={report.comparison.deltas.publicViews}
            icon={Eye}
          />
          <ReportMetric
            label="Zapytania"
            value={report.metrics.inquiries}
            delta={report.comparison.deltas.inquiries}
            icon={MessageSquare}
          />
          <ReportMetric
            label="Spotkania"
            value={report.metrics.appointments}
            delta={report.comparison.deltas.appointments}
            icon={Calendar}
          />
          <ReportMetric
            label="Zaplanowane"
            value={report.metrics.upcomingAppointments}
            icon={FileText}
          />
        </section>

        <section className="rounded-xl border border-border p-5 print:border-black/20">
          <h2 className="font-heading text-lg font-semibold text-foreground print:text-black">
            Porównanie z poprzednim okresem
          </h2>
          <p className="mt-1 text-sm text-muted-foreground print:text-black/60">
            {formatDisplayDateNumeric(report.comparison.previousPeriod.from)} -{' '}
            {formatDisplayDateNumeric(report.comparison.previousPeriod.to)}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <ComparisonItem
              label="Wyświetlenia"
              delta={report.comparison.deltas.publicViews}
            />
            <ComparisonItem
              label="Zapytania"
              delta={report.comparison.deltas.inquiries}
            />
            <ComparisonItem
              label="Spotkania"
              delta={report.comparison.deltas.appointments}
            />
            <ComparisonItem
              label="Zakończone"
              delta={report.comparison.deltas.completedAppointments}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-border p-5 print:border-black/20">
            <h2 className="font-heading text-lg font-semibold text-foreground print:text-black">
              Oferta
            </h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <ReportDetail
                label="Cena"
                value={formatPrice(listing.price, listing.currency)}
              />
              <ReportDetail
                label="Powierzchnia"
                value={formatArea(listing.areaM2 ?? undefined)}
              />
              <ReportDetail
                label="Pokoje"
                value={listing.rooms ? String(listing.rooms) : 'Brak danych'}
              />
              <ReportDetail
                label="Status"
                value={LISTING_STATUS_LABELS[listing.status]}
              />
              <ReportDetail
                label="Publikacja"
                value={
                  LISTING_PUBLICATION_STATUS_LABELS[listing.publicationStatus]
                }
              />
            </dl>
          </div>

          <div className="rounded-xl border border-border p-5 print:border-black/20">
            <h2 className="font-heading text-lg font-semibold text-foreground print:text-black">
              Rekomendacja agenta
            </h2>
            <p className="mt-4 text-sm font-semibold text-foreground print:text-black">
              {report.recommendation.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground print:text-black/75">
              {report.recommendation.description}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-border p-5 print:border-black/20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-heading text-lg font-semibold text-foreground print:text-black">
              Ostatnie działania
            </h2>
            <p className="text-sm text-muted-foreground print:text-black/60">
              {report.activity.length} wpisów
            </p>
          </div>

          {report.activity.length > 0 ? (
            <ol className="mt-4 divide-y divide-border print:divide-black/10">
              {report.activity.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-2 py-3 md:grid-cols-[140px_1fr]"
                >
                  <time className="text-sm text-muted-foreground print:text-black/60">
                    {formatDisplayDateNumeric(item.createdAt)}
                  </time>
                  <div>
                    <p className="text-sm font-medium text-foreground print:text-black">
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-1 text-sm text-muted-foreground print:text-black/70">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground print:text-black/70">
              Brak aktywności w wybranym okresie.
            </p>
          )}
        </section>
      </article>
    </div>
  );
}

function ReportMetric({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: number;
  delta?: ListingOwnerReportMetricDelta;
  icon: typeof Eye;
}) {
  return (
    <div className="rounded-xl border border-border p-4 print:border-black/20">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground print:text-black/60">
          {label}
        </p>
        <Icon className="h-4 w-4 text-primary print:text-black" />
      </div>
      <p className="mt-3 text-3xl font-semibold text-foreground print:text-black">
        {value.toLocaleString('pl-PL')}
      </p>
      {delta ? (
        <p className={`mt-2 text-xs ${getDeltaTextColor(delta.direction)}`}>
          {formatMetricDelta(delta)}
        </p>
      ) : null}
    </div>
  );
}

function ComparisonItem({
  label,
  delta,
}: {
  label: string;
  delta: ListingOwnerReportMetricDelta;
}) {
  return (
    <div className="rounded-lg bg-muted/30 p-3 print:bg-white">
      <p className="text-xs text-muted-foreground print:text-black/60">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground print:text-black">
        {delta.current.toLocaleString('pl-PL')} vs{' '}
        {delta.previous.toLocaleString('pl-PL')}
      </p>
      <p className={`mt-1 text-xs ${getDeltaTextColor(delta.direction)}`}>
        {formatMetricDelta(delta)}
      </p>
    </div>
  );
}

function ReportDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground print:text-black/60">{label}</dt>
      <dd className="text-right font-medium text-foreground print:text-black">
        {value}
      </dd>
    </div>
  );
}

function formatReportAddress(
  address: ListingOwnerReport['listing']['address'],
): string {
  if (!address) return '';

  return [address.street, address.district, address.city]
    .filter(Boolean)
    .join(', ');
}

function buildReportRequestKey(
  listingId: string,
  dateFrom: string,
  dateTo: string,
): string {
  return `${listingId}:${dateFrom}:${dateTo}`;
}

function getDateInputValue(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function toStartOfDayIso(value: string): string {
  return new Date(`${value}T00:00:00.000`).toISOString();
}

function toEndOfDayIso(value: string): string {
  return new Date(`${value}T23:59:59.999`).toISOString();
}

function formatMetricDelta(delta: ListingOwnerReportMetricDelta): string {
  if (delta.direction === 'flat') return 'bez zmian';

  const sign = delta.change > 0 ? '+' : '';
  const absolute = `${sign}${delta.change.toLocaleString('pl-PL')}`;
  if (delta.changePct === null) return `${absolute} vs poprzednio`;

  return `${absolute} (${sign}${delta.changePct.toLocaleString('pl-PL')}%)`;
}

function getDeltaTextColor(
  direction: ListingOwnerReportMetricDelta['direction'],
): string {
  if (direction === 'up') return 'text-status-success print:text-black';
  if (direction === 'down') return 'text-status-warning print:text-black';
  return 'text-muted-foreground print:text-black/60';
}
