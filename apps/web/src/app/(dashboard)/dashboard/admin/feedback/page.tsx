'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchProductFeedbackAdmin,
  updateProductFeedbackAdmin,
  type ProductFeedbackAdminFilters,
  type ProductFeedbackAdminItem,
  type ProductFeedbackCategory as ProductFeedbackCategoryValue,
  type ProductFeedbackPriority as ProductFeedbackPriorityValue,
  type ProductFeedbackSource as ProductFeedbackSourceValue,
  type ProductFeedbackStatus as ProductFeedbackStatusValue,
  type ProductFeedbackType as ProductFeedbackTypeValue,
} from '@/lib/product-feedback';

const DEFAULT_FILTERS: ProductFeedbackAdminFilters = {
  page: 1,
  limit: 20,
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

const SOURCE_LABELS: Record<ProductFeedbackSourceValue, string> = {
  dashboard: 'Dashboard',
  public_catalog: 'Katalog',
  public_listing: 'Oferta publiczna',
  public_form: 'Formularz publiczny',
  homepage: 'Homepage',
  error_page: 'Błąd',
};

const PRIORITY_LABELS: Record<ProductFeedbackPriorityValue, string> = {
  low: 'Niski',
  medium: 'Średni',
  high: 'Wysoki',
  critical: 'Krytyczny',
};

export default function ProductFeedbackTriagePage() {
  const { user } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [items, setItems] = useState<ProductFeedbackAdminItem[]>([]);
  const [filters, setFilters] =
    useState<ProductFeedbackAdminFilters>(DEFAULT_FILTERS);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let isMounted = true;

    fetchProductFeedbackAdmin(filters)
      .then((response) => {
        if (!isMounted) return;
        setItems(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(getApiErrorMessage(fetchError));
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [filters, isAdmin, refreshToken]);

  function updateFilter<K extends keyof ProductFeedbackAdminFilters>(
    key: K,
    value: ProductFeedbackAdminFilters[K],
  ) {
    setIsLoading(true);
    setError(null);
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
      page: 1,
    }));
  }

  async function updateFeedback(
    item: ProductFeedbackAdminItem,
    input: Parameters<typeof updateProductFeedbackAdmin>[1],
  ) {
    try {
      const updated = await updateProductFeedbackAdmin(item.id, input);
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? updated : currentItem,
        ),
      );
      showSuccessToast({ title: 'Feedback zaktualizowany' });
    } catch (updateError) {
      showErrorToast({
        title: 'Nie udało się zaktualizować',
        description: getApiErrorMessage(updateError),
      });
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Brak dostępu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Panel triage feedbacku jest dostępny tylko dla administratorów.
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
              Feedback produktowy
            </h1>
            <Badge variant="outline" className="rounded-full">
              {total} zgłoszeń
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Minimalny panel triage dla błędów, pomysłów, usprawnień i opinii.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2 rounded-xl"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            setRefreshToken((current) => current + 1);
          }}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4" />
          Odśwież
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4 text-primary" />
          Filtry
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search ?? ''}
              placeholder="Szukaj po tytule, opisie lub emailu..."
              className="h-9 rounded-xl pl-9"
              onChange={(event) =>
                updateFilter('search', event.target.value || undefined)
              }
            />
          </div>
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
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
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
            options={Object.entries(TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <InlineSelect
            size="sm"
            value={filters.category ?? ''}
            placeholder="Obszar"
            onChange={(value) =>
              updateFilter(
                'category',
                (value || undefined) as
                  | ProductFeedbackCategoryValue
                  | undefined,
              )
            }
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <InlineSelect
            size="sm"
            value={filters.source ?? ''}
            placeholder="Źródło"
            onChange={(value) =>
              updateFilter(
                'source',
                (value || undefined) as ProductFeedbackSourceValue | undefined,
              )
            }
            options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <InlineSelect
            size="sm"
            value={filters.userPriority ?? ''}
            placeholder="Priorytet użytk."
            onChange={(value) =>
              updateFilter(
                'userPriority',
                (value || undefined) as
                  | ProductFeedbackPriorityValue
                  | undefined,
              )
            }
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <InlineSelect
            size="sm"
            value={filters.internalPriority ?? ''}
            placeholder="Priorytet zespołu"
            onChange={(value) =>
              updateFilter(
                'internalPriority',
                (value || undefined) as
                  | ProductFeedbackPriorityValue
                  | undefined,
              )
            }
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
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
        </div>
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
        <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 font-heading text-xl font-semibold">
            Brak zgłoszeń dla tych filtrów
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Zmień filtry albo wróć później, gdy pojawi się nowy feedback.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              onUpdate={(input) => updateFeedback(item, input)}
            />
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

function FeedbackCard({
  item,
  onUpdate,
}: {
  item: ProductFeedbackAdminItem;
  onUpdate: (input: Parameters<typeof updateProductFeedbackAdmin>[1]) => void;
}) {
  const [internalNote, setInternalNote] = useState(
    getInternalNote(item.metadata),
  );
  const [duplicateOfId, setDuplicateOfId] = useState(item.duplicateOfId ?? '');

  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
            <Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>
            <Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleString('pl-PL')}
            </span>
          </div>
          <h2 className="mt-3 font-heading text-lg font-semibold">
            {item.title}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {item.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span>Źródło: {SOURCE_LABELS[item.source]}</span>
            {item.userPriority ? (
              <span>
                Priorytet użytk.: {PRIORITY_LABELS[item.userPriority]}
              </span>
            ) : null}
            {item.internalPriority ? (
              <span>
                Priorytet zespołu: {PRIORITY_LABELS[item.internalPriority]}
              </span>
            ) : null}
            {item.email ? <span>Email: {item.email}</span> : null}
            {item.module ? <span>Moduł: {item.module}</span> : null}
            {item.viewport ? <span>Viewport: {item.viewport}</span> : null}
            {item.sourceUrl ? (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Źródłowy URL
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-[260px] gap-3">
          <InlineSelect
            size="sm"
            value={item.status}
            placeholder="Status"
            onChange={(value) =>
              onUpdate({ status: value as ProductFeedbackStatusValue })
            }
            options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <InlineSelect
            size="sm"
            value={item.internalPriority ?? ''}
            placeholder="Priorytet zespołu"
            onChange={(value) =>
              onUpdate({
                internalPriority:
                  (value as ProductFeedbackPriorityValue) || null,
              })
            }
            options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <textarea
            value={internalNote}
            rows={3}
            placeholder="Notatka wewnętrzna"
            className="w-full resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(event) => setInternalNote(event.target.value)}
          />
          <Input
            value={duplicateOfId}
            placeholder="ID duplikatu"
            className="h-9 rounded-xl"
            onChange={(event) => setDuplicateOfId(event.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() =>
              onUpdate({
                internalNote,
                duplicateOfId: duplicateOfId.trim() || null,
              })
            }
          >
            Zapisz notatkę
          </Button>
        </div>
      </div>
    </article>
  );
}

function getInternalNote(metadata: Record<string, unknown>): string {
  return typeof metadata.internalNote === 'string' ? metadata.internalNote : '';
}
