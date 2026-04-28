'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef(new Map<string, SearchResponse>());

  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults((current) =>
        current.total === 0 && current.query === '' ? current : EMPTY_RESULTS,
      );
      setIsLoading(false);
      setError(null);
      return;
    }

    const cachedResponse = cacheRef.current.get(debouncedQuery);
    if (cachedResponse) {
      setResults(cachedResponse);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    void fetchGlobalSearch(debouncedQuery, controller.signal)
      .then((response) => {
        if (cancelled) return;
        cacheRef.current.set(debouncedQuery, response);
        setResults(response);
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać wyników wyszukiwania',
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedQuery]);

  return {
    query,
    setQuery,
    trimmedQuery,
    results,
    isLoading,
    error,
    clearQuery: () => setQuery(''),
  };
}
