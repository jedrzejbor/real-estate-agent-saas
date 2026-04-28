'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchAppointments,
  type Appointment,
  type PaginationMeta,
  type AppointmentFilters,
  getMonthRange,
} from '@/lib/appointments';

interface UseAppointmentsReturn {
  appointments: Appointment[];
  meta: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  filters: AppointmentFilters;
  setFilters: (filters: AppointmentFilters) => void;
  updateFilter: <K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K],
  ) => void;
  setPage: (page: number) => void;
  refresh: () => void;
}

const DEFAULT_FILTERS: AppointmentFilters = {
  page: 1,
  limit: 100,
  sortBy: 'startTime',
  sortOrder: 'ASC',
};

function buildInitialFilters(
  initialFilters?: Partial<AppointmentFilters>,
): AppointmentFilters {
  return {
    ...DEFAULT_FILTERS,
    ...initialFilters,
  };
}

function areFiltersEqual(
  left: AppointmentFilters,
  right: AppointmentFilters,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    const filterKey = key as keyof AppointmentFilters;
    if (left[filterKey] !== right[filterKey]) {
      return false;
    }
  }

  return true;
}

/**
 * Hook for fetching and managing appointments with filters.
 * Auto-refetches when filters change.
 */
export function useAppointments(
  initialFilters?: Partial<AppointmentFilters>,
): UseAppointmentsReturn {
  const resolvedInitialFilters = useMemo(
    () => buildInitialFilters(initialFilters),
    [initialFilters],
  );

  const [filters, setFiltersState] = useState<AppointmentFilters>(
    resolvedInitialFilters,
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setFiltersState((current) =>
      areFiltersEqual(current, resolvedInitialFilters)
        ? current
        : resolvedInitialFilters,
    );
  }, [resolvedInitialFilters]);

  const load = useCallback(async (currentFilters: AppointmentFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchAppointments(currentFilters);
      if (!controller.signal.aborted) {
        setAppointments(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać spotkań';
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

  const setFilters = useCallback((newFilters: AppointmentFilters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback(
    <K extends keyof AppointmentFilters>(
      key: K,
      value: AppointmentFilters[K],
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
    appointments,
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

/**
 * Convenience hook for calendar view — loads appointments for a given month.
 */
export function useCalendarAppointments(year: number, month: number) {
  const range = useMemo(() => getMonthRange(year, month), [year, month]);

  const calendarFilters = useMemo(
    () => ({
      from: range.from,
      to: range.to,
      limit: 100,
      sortBy: 'startTime' as const,
      sortOrder: 'ASC' as const,
    }),
    [range.from, range.to],
  );

  return useAppointments(calendarFilters);
}
