'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchClients,
  type Client,
  type PaginationMeta,
  type ClientFilters,
} from '@/lib/clients';

interface UseClientsReturn {
  clients: Client[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: ClientFilters;
  setFilters: (filters: ClientFilters) => void;
  updateFilter: <K extends keyof ClientFilters>(
    key: K,
    value: ClientFilters[K],
  ) => void;
  setPage: (page: number) => void;
  refresh: () => void;
}

const DEFAULT_FILTERS: ClientFilters = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

/**
 * Hook for fetching and managing paginated clients with filters.
 * Auto-refetches when filters change. Cancels in-flight requests.
 */
export function useClients(
  initialFilters?: Partial<ClientFilters>,
): UseClientsReturn {
  const [filters, setFiltersState] = useState<ClientFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (currentFilters: ClientFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchClients(currentFilters);
      if (!controller.signal.aborted) {
        setClients(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error ? err.message : 'Nie udało się pobrać klientów';
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

  const setFilters = useCallback((newFilters: ClientFilters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback(
    <K extends keyof ClientFilters>(key: K, value: ClientFilters[K]) => {
      setFiltersState((prev) => ({
        ...prev,
        [key]: value,
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
    clients,
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
