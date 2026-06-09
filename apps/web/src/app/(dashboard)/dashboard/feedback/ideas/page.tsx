'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, RefreshCw, ThumbsUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchVotableProductFeedback,
  removeVoteForProductFeedbackIdea,
  voteForProductFeedbackIdea,
  type ProductFeedbackMyFilters,
  type ProductFeedbackVotableIdea,
  type ProductFeedbackCategory as ProductFeedbackCategoryValue,
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

export default function ProductFeedbackIdeasPage() {
  const [items, setItems] = useState<ProductFeedbackVotableIdea[]>([]);
  const [filters, setFilters] =
    useState<ProductFeedbackMyFilters>(DEFAULT_FILTERS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadIdeas() {
      try {
        const response = await fetchVotableProductFeedback(filters);
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

    loadIdeas();

    return () => {
      isMounted = false;
    };
  }, [filters, refreshToken]);

  async function toggleVote(item: ProductFeedbackVotableIdea) {
    try {
      setPendingVoteId(item.id);
      const result = item.viewerHasVoted
        ? await removeVoteForProductFeedbackIdea(item.id)
        : await voteForProductFeedbackIdea(item.id);

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                voteCount: result.voteCount,
                viewerHasVoted: result.viewerHasVoted,
              }
            : currentItem,
        ),
      );
      setError(null);
    } catch (voteError) {
      setError(getApiErrorMessage(voteError));
    } finally {
      setPendingVoteId(null);
    }
  }

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Głosowanie na pomysły
            </h1>
            <Badge variant="outline" className="rounded-full">
              {total} pomysłów
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Głosuj na wybrane propozycje, które zespół udostępnił do oceny.
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
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        {filters.status ? (
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
        <EmptyIdeas />
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <IdeaCard
              key={item.id}
              item={item}
              isPending={pendingVoteId === item.id}
              onToggleVote={() => toggleVote(item)}
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

function IdeaCard({
  item,
  isPending,
  onToggleVote,
}: {
  item: ProductFeedbackVotableIdea;
  isPending: boolean;
  onToggleVote: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{TYPE_LABELS[item.type]}</Badge>
            <Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>
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
          {item.teamResponse ? (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground">
              {item.teamResponse}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-row items-center gap-3 lg:flex-col lg:items-stretch">
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {item.voteCount}
            </div>
            <div className="text-xs text-muted-foreground">głosów</div>
          </div>
          <Button
            type="button"
            variant={item.viewerHasVoted ? 'default' : 'outline'}
            className="gap-2 rounded-xl"
            disabled={isPending}
            onClick={onToggleVote}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ThumbsUp className="h-4 w-4" />
            )}
            {item.viewerHasVoted ? 'Cofnij głos' : 'Głosuj'}
          </Button>
        </div>
      </div>
    </article>
  );
}

function EmptyIdeas() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <Lightbulb className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 font-heading text-xl font-semibold">
        Brak pomysłów do głosowania
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Zespół nie udostępnił jeszcze żadnych propozycji do głosowania.
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
