import {
  ListingCommissionType,
  ListingStatus,
  PublicLeadStatus,
  TaskStatus,
} from '../common/enums';
import { InsightsService } from './insights.service';

describe('InsightsService', () => {
  const userId = 'user-1';
  const agentIds = ['agent-1'];
  const now = new Date('2026-06-30T10:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createService({
    unhandledLead = null,
    staleListing = null,
    leadCounts = [0, 0],
    overdueTask = null,
    overdueTaskCount = 0,
    appointmentCounts = [0, 0],
    commissionListings = [],
    dismissedInsightIds = [],
  }: {
    unhandledLead?: unknown;
    staleListing?: unknown;
    leadCounts?: number[];
    overdueTask?: unknown;
    overdueTaskCount?: number;
    appointmentCounts?: number[];
    commissionListings?: unknown[];
    dismissedInsightIds?: string[];
  } = {}) {
    const listingRepo = {
      findOne: jest.fn().mockResolvedValue(staleListing),
      find: jest.fn().mockResolvedValue(commissionListings),
    };
    const publicLeadRepo = {
      findOne: jest.fn().mockResolvedValue(unhandledLead),
      count: jest
        .fn()
        .mockResolvedValueOnce(leadCounts[0])
        .mockResolvedValueOnce(leadCounts[1]),
    };
    const appointmentRepo = {
      count: jest
        .fn()
        .mockResolvedValueOnce(appointmentCounts[0])
        .mockResolvedValueOnce(appointmentCounts[1]),
    };
    const taskRepo = {
      findOne: jest.fn().mockResolvedValue(overdueTask),
      count: jest.fn().mockResolvedValue(overdueTaskCount),
    };
    const insightDismissalRepo = {
      find: jest.fn().mockResolvedValue(
        dismissedInsightIds.map((insightId) => ({
          insightId,
          createdAt: now,
        })),
      ),
      upsert: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const usersService = {
      getAgencyAccessContext: jest.fn().mockResolvedValue({
        agencyAgentIds: agentIds,
      }),
    };

    const service = new InsightsService(
      listingRepo as never,
      publicLeadRepo as never,
      appointmentRepo as never,
      taskRepo as never,
      insightDismissalRepo as never,
      usersService as never,
    );

    return {
      service,
      listingRepo,
      publicLeadRepo,
      appointmentRepo,
      taskRepo,
      insightDismissalRepo,
      usersService,
    };
  }

  it('returns actionable dashboard insights without exposing lead personal data', async () => {
    const { service, usersService } = createService({
      unhandledLead: {
        id: 'lead-1',
        fullName: 'Jan Kowalski',
        email: 'jan@example.com',
        phone: '500500500',
        status: PublicLeadStatus.NEW,
        listingId: 'listing-1',
        listing: { title: 'Mieszkanie testowe' },
      },
      staleListing: {
        id: 'listing-2',
        title: 'Dom bez aktywności',
        status: ListingStatus.ACTIVE,
      },
      leadCounts: [3, 7],
      overdueTask: {
        id: 'task-1',
        title: 'Oddzwonić do klienta',
        status: TaskStatus.TODO,
      },
      overdueTaskCount: 2,
      appointmentCounts: [4, 2],
      commissionListings: [
        {
          id: 'listing-3',
          title: 'Oferta premium',
          status: ListingStatus.ACTIVE,
          price: 1_000_000,
          commissionType: ListingCommissionType.PERCENTAGE,
          commissionValue: 3,
        },
      ],
    });

    const result = await service.getDashboardInsights(userId);

    expect(usersService.getAgencyAccessContext).toHaveBeenCalledWith(userId);
    expect(result.generatedAt).toBe(now.toISOString());
    expect(result.insights).toHaveLength(6);
    expect(result.insights.map((insight) => insight.id)).toEqual([
      'public-lead-unhandled:lead-1',
      'public-leads-drop:7d',
      'tasks-overdue',
      'listing-stale:listing-2',
      'appointments-cancelled-ratio',
      'pipeline-high-commission:listing-3',
    ]);
    expect(result.insights[0]).toMatchObject({
      severity: 'warning',
      entityType: 'public_lead',
      entityId: 'lead-1',
      actionHref: '/dashboard/inquiries?status=new&listingId=listing-1',
    });
    expect(result.insights[2]).toMatchObject({
      severity: 'warning',
      entityType: 'task',
      entityId: 'task-1',
      actionHref: '/dashboard/tasks?status=todo',
    });
    expect(JSON.stringify(result)).not.toContain('Jan Kowalski');
    expect(JSON.stringify(result)).not.toContain('jan@example.com');
    expect(JSON.stringify(result)).not.toContain('500500500');
  });

  it('does not return noisy insights when thresholds are not met', async () => {
    const { service, appointmentRepo } = createService({
      leadCounts: [4, 5],
      appointmentCounts: [2, 2],
      commissionListings: [
        {
          id: 'listing-1',
          title: 'Mała oferta',
          price: 300_000,
          commissionType: ListingCommissionType.PERCENTAGE,
          commissionValue: 2,
        },
      ],
    });

    const result = await service.getDashboardInsights(userId);

    expect(result.insights).toEqual([]);
    expect(appointmentRepo.count).toHaveBeenCalledTimes(2);
  });

  it('filters insights dismissed by the current user', async () => {
    const { service } = createService({
      overdueTask: {
        id: 'task-1',
        title: 'Oddzwonić do klienta',
        status: TaskStatus.TODO,
      },
      overdueTaskCount: 1,
      dismissedInsightIds: ['tasks-overdue'],
    });

    const result = await service.getDashboardInsights(userId);

    expect(result.insights.map((insight) => insight.id)).not.toContain(
      'tasks-overdue',
    );
  });

  it('lists dismissed insights with active insight details when still applicable', async () => {
    const { service, insightDismissalRepo } = createService({
      overdueTask: {
        id: 'task-1',
        title: 'Oddzwonić do klienta',
        status: TaskStatus.TODO,
      },
      overdueTaskCount: 1,
      dismissedInsightIds: ['tasks-overdue', 'listing-stale:missing'],
    });

    const result = await service.getDismissedDashboardInsights(userId);

    expect(insightDismissalRepo.find).toHaveBeenCalledWith({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    expect(result.dismissedInsights).toHaveLength(2);
    expect(result.dismissedInsights[0]).toMatchObject({
      insightId: 'tasks-overdue',
      dismissedAt: now.toISOString(),
      insight: {
        id: 'tasks-overdue',
        title: 'Zaległe zadania wymagają reakcji',
      },
    });
    expect(result.dismissedInsights[1]).toEqual({
      insightId: 'listing-stale:missing',
      dismissedAt: now.toISOString(),
      insight: null,
    });
  });

  it('persists dismissed insight ids idempotently', async () => {
    const { service, insightDismissalRepo } = createService();

    await expect(
      service.dismissDashboardInsight(userId, ' tasks-overdue '),
    ).resolves.toEqual({ dismissed: true });

    expect(insightDismissalRepo.upsert).toHaveBeenCalledWith(
      {
        userId,
        insightId: 'tasks-overdue',
      },
      ['userId', 'insightId'],
    );
  });

  it('restores dismissed insight ids for the current user', async () => {
    const { service, insightDismissalRepo } = createService();

    await expect(
      service.restoreDashboardInsight(userId, ' tasks-overdue '),
    ).resolves.toEqual({ restored: true });

    expect(insightDismissalRepo.delete).toHaveBeenCalledWith({
      userId,
      insightId: 'tasks-overdue',
    });
  });
});
