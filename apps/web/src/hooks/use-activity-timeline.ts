'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type ActivityTimelineItem,
  type ActivityTimelineResponse,
} from '@/lib/activity';

const DEFAULT_TIMELINE_PAGE_SIZE = 30;

export function useActivityTimeline(
  entityId: string | undefined,
  fetcher: (
    entityId: string,
    params: { page?: number; limit?: number },
  ) => Promise<ActivityTimelineResponse>,
  pageSize = DEFAULT_TIMELINE_PAGE_SIZE,
) {
  const [items, setItems] = useState<ActivityTimelineItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      if (!entityId) {
        setItems([]);
        setPage(1);
        setTotalPages(0);
        setTotal(0);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      if (mode === 'replace') {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const response = await fetcher(entityId, {
          page: nextPage,
          limit: pageSize,
        });

        setItems((currentItems) =>
          mode === 'replace'
            ? response.data
            : mergeTimelineItems(currentItems, response.data),
        );
        setPage(response.meta.page);
        setTotalPages(response.meta.totalPages);
        setTotal(response.meta.total);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się pobrać aktywności',
        );
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [entityId, fetcher, pageSize],
  );

  const refresh = useCallback(async () => {
    await loadPage(1, 'replace');
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || page >= totalPages) {
      return;
    }

    await loadPage(page + 1, 'append');
  }, [isLoading, isLoadingMore, loadPage, page, totalPages]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    page,
    total,
    totalPages,
    hasMore: page < totalPages,
    refresh,
    loadMore,
  };
}

function mergeTimelineItems(
  currentItems: ActivityTimelineItem[],
  nextItems: ActivityTimelineItem[],
): ActivityTimelineItem[] {
  const seenIds = new Set(currentItems.map((item) => item.id));
  const uniqueNextItems = nextItems.filter((item) => !seenIds.has(item.id));

  return [...currentItems, ...uniqueNextItems];
}
