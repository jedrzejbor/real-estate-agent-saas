'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchListings,
  type Listing,
  type PaginationMeta,
  type ListingFilters,
} from '@/lib/listings';

interface UseListingsReturn {
  listings: Listing[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: ListingFilters;
  setFilters: (filters: ListingFilters) => void;
  updateFilter: <K extends keyof ListingFilters>(
    key: K,
    value: ListingFilters[K],
  ) => void;
  setPage: (page: number) => void;
  refresh: () => void;
}

const DEFAULT_FILTERS: ListingFilters = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

/**
 * Hook for fetching and managing paginated listings with filters.
 * Auto-refetches when filters change.
 */
export function useListings(
  initialFilters?: Partial<ListingFilters>,
): UseListingsReturn {
  const [filters, setFiltersState] = useState<ListingFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (currentFilters: ListingFilters) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchListings(currentFilters);
      if (!controller.signal.aborted) {
        setListings(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error ? err.message : 'Nie udało się pobrać ofert';
        setError(message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load(filters);
    return () => abortRef.current?.abort();
  }, [filters, load]);

  const setFilters = useCallback((newFilters: ListingFilters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback(
    <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) => {
      setFiltersState((prev) => ({
        ...prev,
        [key]: value,
        // Reset to page 1 when changing non-pagination filters
        ...(key !== 'page' ? { page: 1 } : {}),
      }));
    },
    [],
  );

  const setPage = useCallback((page: number) => {
    setFiltersState((prev) => ({ ...prev, page }));
  }, []);

  const refresh = useCallback(() => {
    load(filters);
  }, [filters, load]);

  return {
    listings,
    meta,
    isLoading,
    error,
    filters,
    setFilters,
    updateFilter,
    setPage,
    refresh,
  };
}
