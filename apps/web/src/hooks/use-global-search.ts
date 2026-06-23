'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchGlobalSearch, type SearchResponse } from '@/lib/search';
import { useDebouncedValue } from './use-debounced-value';

const SEARCH_DEBOUNCE_MS = 1200;

const EMPTY_RESULTS: SearchResponse = {
  query: '',
  total: 0,
  groups: {
    listing: [],
    client: [],
    appointment: [],
  },
};

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>(EMPTY_RESULTS);
  const [error, setError] = useState<{ query: string; message: string } | null>(
    null,
  );
  const [cachedResultsByQuery, setCachedResultsByQuery] = useState(
    () => new Map<string, SearchResponse>(),
  );

  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);
  const isSearchableQuery = debouncedQuery.length >= 2;
  const cachedResponse = isSearchableQuery
    ? cachedResultsByQuery.get(debouncedQuery)
    : undefined;
  const displayedResults = !isSearchableQuery
    ? EMPTY_RESULTS
    : (cachedResponse ??
      (results.query === debouncedQuery ? results : EMPTY_RESULTS));
  const displayedError = error?.query === debouncedQuery ? error.message : null;
  const isLoading =
    isSearchableQuery &&
    !cachedResponse &&
    results.query !== debouncedQuery &&
    error?.query !== debouncedQuery;

  useEffect(() => {
    if (!isSearchableQuery || cachedResultsByQuery.has(debouncedQuery)) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    void fetchGlobalSearch(debouncedQuery, controller.signal)
      .then((response) => {
        if (cancelled) return;
        setCachedResultsByQuery((current) => {
          const next = new Map(current);
          next.set(debouncedQuery, response);
          return next;
        });
        setResults(response);
        setError((current) =>
          current?.query === debouncedQuery ? null : current,
        );
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setError({
          query: debouncedQuery,
          message:
            err instanceof Error
              ? err.message
              : 'Nie udało się pobrać wyników wyszukiwania',
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cachedResultsByQuery, debouncedQuery, isSearchableQuery]);

  return {
    query,
    setQuery,
    trimmedQuery,
    results: displayedResults,
    isLoading,
    error: displayedError,
    clearQuery: () => setQuery(''),
  };
}
