import { apiFetch } from './api-client';

export type NotificationCategory =
  | 'appointment'
  | 'client'
  | 'document'
  | 'listing'
  | 'listing_agent_collaboration'
  | 'public_lead'
  | 'task';
export type NotificationVariant = 'info' | 'warning' | 'success';
export type NotificationSeverity = 'critical';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  variant: NotificationVariant;
  title: string;
  description: string;
  href?: string;
  createdAt: string;
  isRead: boolean;
  severity?: NotificationSeverity;
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

export interface NotificationRuleSettings {
  followUpOverdueDays: number;
  staleListingDays: number;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreference[];
  ruleSettings: NotificationRuleSettings;
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
  ruleSettings?: NotificationRuleSettings,
): Promise<NotificationPreferencesResponse> {
  return apiFetch<NotificationPreferencesResponse>(
    '/notifications/preferences',
    {
      method: 'PATCH',
      body: { preferences, ruleSettings },
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
