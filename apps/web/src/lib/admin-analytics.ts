import { apiFetch } from './api-client';

export interface AdminAnalyticsUsageSummary {
  period: {
    from: string;
    to: string;
    days: number;
  };
  summary: {
    totalEvents: number;
    activeUsers: number;
    activeAgents: number;
    activeAgencies: number;
  };
  topEvents: Array<{
    name: string;
    count: number;
  }>;
  eventCategories: Array<{
    category:
      | 'activation'
      | 'communication'
      | 'matching'
      | 'retention'
      | 'public_growth'
      | 'limits'
      | 'other';
    count: number;
    events: Array<{
      name: string;
      count: number;
    }>;
  }>;
  dailyEvents: Array<{
    date: string;
    count: number;
  }>;
  recentEvents: Array<{
    id: string;
    name: string;
    path: string | null;
    planCode: string | null;
    createdAt: string;
  }>;
}

export async function fetchAdminAnalyticsUsage(
  days = 30,
): Promise<AdminAnalyticsUsageSummary> {
  const params = new URLSearchParams({ days: String(days) });
  return apiFetch<AdminAnalyticsUsageSummary>(
    `/admin/analytics/usage?${params.toString()}`,
  );
}
