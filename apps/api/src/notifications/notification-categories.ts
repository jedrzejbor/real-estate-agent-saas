export const NOTIFICATION_CATEGORIES = [
  'appointment',
  'client',
  'document',
  'listing',
  'listing_agent_collaboration',
  'public_lead',
  'task',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];
