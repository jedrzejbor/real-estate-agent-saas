'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dismissDashboardInsight,
  fetchDashboardInsights,
  type DashboardInsightsResponse,
} from '@/lib/dashboard';

interface UseDashboardInsightsReturn {
  insights: DashboardInsightsResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  dismissInsight: (id: string) => Promise<void>;
}

export function useDashboardInsights(): UseDashboardInsightsReturn {
  const [insights, setInsights] = useState<DashboardInsightsResponse | null>(
    null,
  );
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
      const result = await fetchDashboardInsights();
      if (!controller.signal.aborted) {
        setInsights(result);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(
          err instanceof Error ? err.message : 'Nie udało się pobrać insightów',
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const dismissInsight = useCallback(
    async (id: string) => {
      const previousInsights = insights;

      setInsights((current) =>
        current
          ? {
              ...current,
              insights: current.insights.filter((insight) => insight.id !== id),
            }
          : current,
      );

      try {
        await dismissDashboardInsight(id);
      } catch (err) {
        setInsights(previousInsights);
        throw err;
      }
    },
    [insights],
  );

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { insights, isLoading, error, refresh: load, dismissInsight };
}
