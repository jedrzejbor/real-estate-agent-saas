'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchDashboardToday,
  markTodayTaskDone,
  type DashboardTodayResponse,
} from '@/lib/dashboard';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';

interface UseDashboardTodayReturn {
  today: DashboardTodayResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  completeTask: (taskId: string) => Promise<void>;
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
        trackAnalyticsEvent({
          name: AnalyticsEventName.DASHBOARD_TODAY_VIEWED,
          properties: {
            overdueCount: result.items.filter((item) =>
              item.dueAt ? new Date(item.dueAt).getTime() < Date.now() : false,
            ).length,
            highPriorityCount: result.items.filter(
              (item) => item.priority === 'high',
            ).length,
            totalCount: result.items.length,
          },
        });
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

  const completeTask = useCallback(
    async (taskId: string) => {
      await markTodayTaskDone(taskId);
      await load();
    },
    [load],
  );

  return { today, isLoading, error, refresh: load, completeTask };
}
