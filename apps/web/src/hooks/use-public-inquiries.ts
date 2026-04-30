'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchPublicInquiries,
  type PublicInquiry,
  type PublicInquiryFilters,
} from '@/lib/public-inquiries';
import type { PaginationMeta } from '@/lib/clients';

interface UsePublicInquiriesReturn {
  inquiries: PublicInquiry[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: PublicInquiryFilters;
  setFilters: (filters: PublicInquiryFilters) => void;
  updateFilter: <K extends keyof PublicInquiryFilters>(
    key: K,
    value: PublicInquiryFilters[K],
  ) => void;
  setPage: (page: number) => void;
  refresh: () => void;
}

const DEFAULT_FILTERS: PublicInquiryFilters = {
  page: 1,
  limit: 12,
  sortBy: 'createdAt',
  sortOrder: 'DESC',
};

export function usePublicInquiries(
  initialFilters?: Partial<PublicInquiryFilters>,
): UsePublicInquiriesReturn {
  const [filters, setFiltersState] = useState<PublicInquiryFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [inquiries, setInquiries] = useState<PublicInquiry[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (currentFilters: PublicInquiryFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPublicInquiries(currentFilters);
      if (!controller.signal.aborted) {
        setInquiries(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error ? err.message : 'Nie udało się pobrać zapytań';
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

  const setFilters = useCallback((newFilters: PublicInquiryFilters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback(
    <K extends keyof PublicInquiryFilters>(
      key: K,
      value: PublicInquiryFilters[K],
    ) => {
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
    inquiries,
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
