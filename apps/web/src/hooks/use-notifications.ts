'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotifications,
  markNotificationsAsRead,
  type NotificationItem,
  type NotificationsResponse,
} from '@/lib/notifications';

const EMPTY_NOTIFICATIONS: NotificationsResponse = {
  generatedAt: new Date(0).toISOString(),
  unreadCount: 0,
  items: [],
};

export function useNotifications() {
  const [notifications, setNotifications] =
    useState<NotificationsResponse>(EMPTY_NOTIFICATIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetchNotifications();
      setNotifications(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się pobrać powiadomień',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return;
    }

    setNotifications((current) => {
      const nextItems = current.items.map((item) =>
        uniqueIds.includes(item.id) ? { ...item, isRead: true } : item,
      );

      return {
        ...current,
        items: nextItems,
        unreadCount: nextItems.filter((item) => !item.isRead).length,
      };
    });

    try {
      await markNotificationsAsRead(uniqueIds);
    } catch (err) {
      await load();
      throw err;
    }
  }, [load]);

  const unreadItems = notifications.items.filter(
    (item: NotificationItem) => !item.isRead,
  );

  useEffect(() => {
    load();

    const intervalId = window.setInterval(() => {
      load();
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [load]);

  return {
    notifications,
    unreadItems,
    isLoading,
    error,
    refresh: load,
    markAsRead,
  };
}
