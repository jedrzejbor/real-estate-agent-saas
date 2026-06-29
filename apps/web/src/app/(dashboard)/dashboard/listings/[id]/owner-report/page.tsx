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
  type ListingOwnerReport,
} from '@/lib/listings';
import { formatDisplayDateNumeric } from '@/lib/date-format';

export default function ListingOwnerReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [requestState, setRequestState] = useState<{
    listingId: string | null;
    report: ListingOwnerReport | null;
    error: string | null;
  }>({
    listingId: null,
    report: null,
    error: null,
  });

  useEffect(() => {
    if (!params.id) return;

    let isCancelled = false;

    fetchListingOwnerReport(params.id)
      .then((response) => {
        if (!isCancelled) {
          setRequestState({
            listingId: params.id,
            report: response,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setRequestState({
            listingId: params.id,
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
  }, [params.id]);

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

  const isCurrentReport = requestState.listingId === params.id;
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
            icon={Eye}
          />
          <ReportMetric
            label="Zapytania"
            value={report.metrics.inquiries}
            icon={MessageSquare}
          />
          <ReportMetric
            label="Spotkania"
            value={report.metrics.appointments}
            icon={Calendar}
          />
          <ReportMetric
            label="Zaplanowane"
            value={report.metrics.upcomingAppointments}
            icon={FileText}
          />
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
  icon: Icon,
}: {
  label: string;
  value: number;
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
