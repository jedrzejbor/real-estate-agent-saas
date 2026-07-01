export const NOTIFICATION_CATEGORIES = [
  'appointment',
  'client',
  'document',
  'listing',
  'public_lead',
  'task',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
