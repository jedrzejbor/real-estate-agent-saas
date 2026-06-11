'use client';

import { useEffect, useMemo, useState } from 'react';
import { Inbox, MessageSquareReply, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchMyProductFeedback,
  type ProductFeedbackMyFilters,
  type ProductFeedbackMyItem,
  type ProductFeedbackCategory as ProductFeedbackCategoryValue,
  type ProductFeedbackPriority as ProductFeedbackPriorityValue,
  type ProductFeedbackStatus as ProductFeedbackStatusValue,
  type ProductFeedbackType as ProductFeedbackTypeValue,
} from '@/lib/product-feedback';
import { cn } from '@/lib/utils';

const DEFAULT_FILTERS: ProductFeedbackMyFilters = {
  page: 1,
  limit: 10,
};

const STATUS_LABELS: Record<ProductFeedbackStatusValue, string> = {
  new: 'Nowe',
  triaged: 'Po triage',
  needs_more_info: 'Wymaga info',
  planned: 'Zaplanowane',
  in_progress: 'W trakcie',
  released: 'Wdrożone',
  declined: 'Odrzucone',
  duplicate: 'Duplikat',
  archived: 'Archiwum',
};

const STATUS_STYLES: Record<ProductFeedbackStatusValue, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  triaged: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  needs_more_info: 'border-amber-200 bg-amber-50 text-amber-800',
  planned: 'border-violet-200 bg-violet-50 text-violet-700',
  in_progress: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  released: 'border-status-success/25 bg-status-success-bg text-status-success',
  declined: 'border-rose-200 bg-rose-50 text-rose-700',
  duplicate: 'border-slate-200 bg-slate-50 text-slate-700',
  archived: 'border-stone-200 bg-stone-50 text-stone-700',
};

const TYPE_LABELS: Record<ProductFeedbackTypeValue, string> = {
  bug_report: 'Błąd',
  feature_request: 'Nowa funkcja',
  improvement: 'Usprawnienie',
  general_feedback: 'Opinia',
  survey_response: 'Ankieta',
};

const CATEGORY_LABELS: Record<ProductFeedbackCategoryValue, string> = {
  listings: 'Oferty',
  clients: 'Klienci',
  calendar: 'Kalendarz',
  reports: 'Raporty',
  public_catalog: 'Katalog publiczny',
  public_listing_submission: 'Dodawanie oferty',
  billing: 'Billing',
  onboarding: 'Onboarding',
  integrations: 'Integracje',
  ui_ux: 'UI / UX',
  other: 'Inne',
};

const PRIORITY_LABELS: Record<ProductFeedbackPriorityValue, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  critical: 'Krytyczny',
};

export default function MyProductFeedbackPage() {
  const [items, setItems] = useState<ProductFeedbackMyItem[]>([]);
  const [filters, setFilters] =
    useState<ProductFeedbackMyFilters>(DEFAULT_FILTERS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadFeedback() {
      try {
        const response = await fetchMyProductFeedback(filters);
        if (!isMounted) return;
        setItems(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
        setError(null);
      } catch (fetchError) {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadFeedback();

    return () => {
      isMounted = false;
    };
  }, [filters, refreshToken]);

  const hasFilters = Boolean(filters.status || filters.type);

  function updateFilter<K extends keyof ProductFeedbackMyFilters>(
    key: K,
    value: ProductFeedbackMyFilters[K],
  ) {
    setIsLoading(true);
    setError(null);
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: 1,
    }));
  }

  const statusOptions = useMemo(
    () =>
      Object.entries(STATUS_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  const typeOptions = useMemo(
    () =>
      Object.entries(TYPE_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Moje zgłoszenia
            </h1>
            <Badge variant="outline" className="rounded-full">
              {total} zgłoszeń
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Śledź status feedbacku wysłanego z dashboardu i odpowiedzi zespołu.
          </p>
        </div>

        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          disabled={isLoading}
          onClick={() => {
            setIsLoading(true);
            setError(null);
            setRefreshToken((current) => current + 1);
          }}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Odśwież
        </Button>
      </div>

      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <InlineSelect
          size="sm"
          value={filters.status ?? ''}
          placeholder="Status"
          onChange={(value) =>
            updateFilter(
              'status',
              (value || undefined) as ProductFeedbackStatusValue | undefined,
            )
          }
          options={statusOptions}
        />
        <InlineSelect
          size="sm"
          value={filters.type ?? ''}
          placeholder="Typ"
          onChange={(value) =>
            updateFilter(
              'type',
              (value || undefined) as ProductFeedbackTypeValue | undefined,
            )
          }
          options={typeOptions}
        />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setFilters(DEFAULT_FILTERS);
            }}
          >
            Wyczyść
          </Button>
        ) : null}
      </section>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <MyFeedbackCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setFilters((current) => ({
                ...current,
                page: Math.max(1, (current.page ?? 1) - 1),
              }));
            }}
          >
            Poprzednia
          </Button>
          <span className="text-sm text-muted-foreground">
            Strona {filters.page ?? 1} z {totalPages}
          </span>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={(filters.page ?? 1) >= totalPages}
            onClick={() => {
              setIsLoading(true);
              setError(null);
              setFilters((current) => ({
                ...current,
                page: Math.min(totalPages, (current.page ?? 1) + 1),
              }));
            }}
          >
            Następna
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MyFeedbackCard({ item }: { item: ProductFeedbackMyItem }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-semibold',
                STATUS_STYLES[item.status],
              )}
            >
              {STATUS_LABELS[item.status]}
            </span>
            <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
            <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(item.createdAt)}
            </span>
          </div>

          <h2 className="mt-3 font-heading text-lg font-semibold text-foreground">
            {item.title}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {item.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {item.userPriority ? (
              <span>Priorytet: {PRIORITY_LABELS[item.userPriority]}</span>
            ) : null}
            {item.module ? <span>Moduł: {item.module}</span> : null}
            <span>Ostatnia aktualizacja: {formatDate(item.updatedAt)}</span>
          </div>
        </div>
      </div>

      {item.teamResponse ? (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <MessageSquareReply className="h-4 w-4" />
            Odpowiedź zespołu
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground">
            {item.teamResponse}
          </p>
          {item.teamResponseUpdatedAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Zaktualizowano: {formatDate(item.teamResponseUpdatedAt)}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
          Zespół nie dodał jeszcze odpowiedzi do tego zgłoszenia.
        </div>
      )}
    </article>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <Inbox className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        {hasFilters ? 'Brak zgłoszeń dla filtrów' : 'Nie masz jeszcze zgłoszeń'}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {hasFilters
          ? 'Zmień status albo typ, żeby zobaczyć więcej zgłoszeń.'
          : 'Wyślij feedback z przycisku w górnym pasku dashboardu.'}
      </p>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
