'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarCheck2, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGlobalSearch } from '@/hooks/use-global-search';
import {
  getSearchResultStatusLabel,
  getSearchSectionLabel,
  type SearchEntityType,
  type SearchResultItem,
} from '@/lib/search';
import { formatRelativeTime } from '@/lib/dashboard';
import { cn } from '@/lib/utils';

const ENTITY_ICON: Record<SearchEntityType, typeof Building2> = {
  listing: Building2,
  client: Users,
  appointment: CalendarCheck2,
};

export function GlobalSearch() {
  const { query, setQuery, trimmedQuery, results, isLoading, error, clearQuery } =
    useGlobalSearch();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasResults = results.total > 0;
  const shouldShow = isOpen && (trimmedQuery.length > 0 || isLoading || !!error);

  const groups = useMemo(
    () =>
      (Object.keys(results.groups) as SearchEntityType[]).filter(
        (key) => results.groups[key].length > 0,
      ),
    [results.groups],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }

      if (event.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyboardShortcut);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Szukaj ofert, klientów i spotkań..."
          className="h-10 rounded-xl border-border bg-white pl-9 pr-16"
          aria-label="Wyszukiwarka globalna"
        />
        <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground md:flex">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>

      {shouldShow ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-white shadow-xl ring-1 ring-black/5">
          {trimmedQuery.length < 2 ? (
            <div className="px-4 py-5 text-sm text-muted-foreground">
              Wpisz minimum 2 znaki, aby wyszukać rekordy w całym systemie.
            </div>
          ) : isLoading ? (
            <div className="flex items-center gap-3 px-4 py-5 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Wyszukiwanie...
            </div>
          ) : error ? (
            <div className="px-4 py-5 text-sm text-destructive">{error}</div>
          ) : hasResults ? (
            <div className="max-h-[28rem] overflow-y-auto py-2">
              <div className="flex items-center justify-between px-4 pb-2 text-xs text-muted-foreground">
                <span>Znaleziono {results.total} wyników</span>
                <button
                  type="button"
                  onClick={() => {
                    clearQuery();
                    setIsOpen(false);
                  }}
                  className="pointer-events-auto text-muted-foreground transition-colors hover:text-foreground"
                >
                  Wyczyść
                </button>
              </div>

              {groups.map((group) => (
                <div key={group} className="border-t border-border/60 first:border-t-0">
                  <div className="px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    {getSearchSectionLabel(group)}
                  </div>
                  <div className="space-y-1 px-2 pb-2">
                    {results.groups[group].map((result) => (
                      <SearchResultRow
                        key={result.id}
                        result={result}
                        onSelect={() => setIsOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-sm text-muted-foreground">
              Brak wyników dla „{trimmedQuery}”.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchResultRow({
  result,
  onSelect,
}: {
  result: SearchResultItem;
  onSelect: () => void;
}) {
  const Icon = ENTITY_ICON[result.entityType];
  const statusLabel = getSearchResultStatusLabel(result);

  return (
    <Link
      href={result.href}
      onClick={onSelect}
      className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {result.title}
          </p>
          {statusLabel ? (
            <Badge
              variant="secondary"
              className={cn('shrink-0 rounded-full px-2 py-0 text-[10px]')}
            >
              {statusLabel}
            </Badge>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
      </div>
      {result.timestamp ? (
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {formatRelativeTime(result.timestamp)}
        </span>
      ) : null}
    </Link>
  );
}
