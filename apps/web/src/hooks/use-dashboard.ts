'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchDashboardStats,
  type DashboardStats,
} from '@/lib/dashboard';

interface UseDashboardReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hook for fetching dashboard statistics.
 * Auto-fetches on mount, supports manual refresh.
 */
export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchDashboardStats();
      if (!controller.signal.aborted) {
        setStats(result);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message =
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać statystyk';
        setError(message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { stats, isLoading, error, refresh: load };
}
