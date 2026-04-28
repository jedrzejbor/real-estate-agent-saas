import { apiFetch } from './api-client';

export type NotificationCategory = 'appointment' | 'client' | 'listing';
export type NotificationVariant = 'info' | 'warning' | 'success';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  variant: NotificationVariant;
  title: string;
  description: string;
  href?: string;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationsResponse {
  generatedAt: string;
  unreadCount: number;
  items: NotificationItem[];
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>('/notifications?limit=8');
}

export async function markNotificationsAsRead(ids: string[]): Promise<{
  success: boolean;
  count: number;
}> {
  return apiFetch('/notifications/read', {
    method: 'POST',
    body: { ids },
  });
}
