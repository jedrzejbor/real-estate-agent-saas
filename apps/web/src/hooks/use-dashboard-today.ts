'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchDashboardToday,
  type DashboardTodayResponse,
} from '@/lib/dashboard';

interface UseDashboardTodayReturn {
  today: DashboardTodayResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboardToday(): UseDashboardTodayReturn {
  const [today, setToday] = useState<DashboardTodayResponse | null>(null);
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
      const result = await fetchDashboardToday();
      if (!controller.signal.aborted) {
        setToday(result);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać działań na dziś',
        );
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

  return { today, isLoading, error, refresh: load };
}
