import { apiFetch } from './api-client';

export type NotificationCategory =
  | 'appointment'
  | 'client'
  | 'document'
  | 'listing'
  | 'public_lead'
  | 'task';
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

export interface NotificationPreference {
  category: NotificationCategory;
  enabled: boolean;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[];
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  return apiFetch<NotificationsResponse>('/notifications?limit=8');
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferencesResponse> {
  return apiFetch<NotificationPreferencesResponse>(
    '/notifications/preferences',
  );
}

export async function updateNotificationPreferences(
  preferences: NotificationPreference[],
): Promise<NotificationPreferencesResponse> {
  return apiFetch<NotificationPreferencesResponse>(
    '/notifications/preferences',
    {
      method: 'PATCH',
      body: { preferences },
    },
  );
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
