'use client';

import { useCallback, useEffect, useState } from 'react';
import { type ActivityHistoryItem } from '@/lib/activity';

export function useActivityHistory(
  entityId: string | undefined,
  fetcher: (entityId: string) => Promise<ActivityHistoryItem[]>,
) {
  const [items, setItems] = useState<ActivityHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!entityId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher(entityId);
      setItems(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Nie udało się pobrać historii zmian',
      );
    } finally {
      setIsLoading(false);
    }
  }, [entityId, fetcher]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    isLoading,
    error,
    refresh: load,
  };
}
