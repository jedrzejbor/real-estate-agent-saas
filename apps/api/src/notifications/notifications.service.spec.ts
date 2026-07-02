import {
  ClientStatus,
  ListingStatus,
  TaskStatus,
  TaskType,
} from '../common/enums';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const userId = 'user-1';
  const agentId = 'agent-1';
  const now = new Date('2026-06-30T10:00:00.000Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createService({
    overdueFollowUps = [],
    staleActiveListings = [],
    readIds = [],
    preferences = [],
    ruleSettings = null,
  }: {
    overdueFollowUps?: unknown[];
    staleActiveListings?: unknown[];
    readIds?: string[];
    preferences?: unknown[];
    ruleSettings?: unknown;
  } = {}) {
    const appointmentRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const listingRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue(staleActiveListings),
    };
    const clientRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const publicLeadRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const taskRepo = {
      find: jest.fn().mockResolvedValue(overdueFollowUps),
    };
    const readQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest
        .fn()
        .mockResolvedValue(
          readIds.map((notificationId) => ({ notificationId })),
        ),
    };
    const notificationReadRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(readQueryBuilder),
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue([]),
    };
    const notificationPreferenceRepo = {
      find: jest.fn().mockResolvedValue(preferences),
      upsert: jest.fn().mockResolvedValue({}),
    };
    const notificationRuleSettingsRepo = {
      findOne: jest.fn().mockResolvedValue(ruleSettings),
      upsert: jest.fn().mockResolvedValue({}),
    };
    const usersService = {
      resolveAgentForUser: jest.fn().mockResolvedValue({ id: agentId }),
    };
    const listingDocumentsService = {
      getAttentionSummaryForAgent: jest.fn().mockResolvedValue({ items: [] }),
    };

    const service = new NotificationsService(
      {} as never,
      appointmentRepo as never,
      listingRepo as never,
      clientRepo as never,
      publicLeadRepo as never,
      taskRepo as never,
      notificationReadRepo as never,
      notificationPreferenceRepo as never,
      notificationRuleSettingsRepo as never,
      usersService as never,
      listingDocumentsService as never,
    );

    return {
      service,
      taskRepo,
      listingRepo,
      notificationReadRepo,
      notificationPreferenceRepo,
      notificationRuleSettingsRepo,
      readQueryBuilder,
      usersService,
      listingDocumentsService,
    };
  }

  it('returns overdue follow-up task notifications with stable ids and action hrefs', async () => {
    const notificationId = 'task-overdue-follow-up-task-1';
    const { service, taskRepo, usersService } = createService({
      readIds: [notificationId],
      overdueFollowUps: [
        {
          id: 'task-1',
          agentId,
          title: 'Oddzwonić po prezentacji',
          status: TaskStatus.TODO,
          type: TaskType.FOLLOW_UP,
          dueAt: new Date('2026-06-28T09:00:00.000Z'),
          createdAt: new Date('2026-06-27T09:00:00.000Z'),
          clientId: 'client-1',
          client: {
            firstName: 'Anna',
            lastName: 'Nowak',
            status: ClientStatus.ACTIVE,
          },
        },
      ],
    });

    const result = await service.findAll(userId, { limit: 8 });

    expect(usersService.resolveAgentForUser).toHaveBeenCalledWith(userId);
    expect(taskRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        order: { dueAt: 'ASC' },
        take: 5,
        relations: ['client', 'listing', 'appointment'],
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: notificationId,
        category: 'task',
        variant: 'warning',
        title: 'Follow-up jest po terminie',
        href: '/dashboard/clients/client-1',
        isRead: true,
      }),
    );
    expect(result.unreadCount).toBe(0);
  });

  it('returns stale active listing notifications with stable ids and listing links', async () => {
    const { service } = createService({
      staleActiveListings: [
        {
          id: 'listing-1',
          agentId,
          title: 'Mieszkanie po kampanii',
          status: ListingStatus.ACTIVE,
          updatedAt: new Date('2026-06-01T09:00:00.000Z'),
        },
      ],
    });

    const result = await service.findAll(userId, { limit: 8 });

    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: 'listing-stale-active-listing-1',
        category: 'listing',
        variant: 'warning',
        title: 'Aktywna oferta wymaga odświeżenia',
        href: '/dashboard/listings/listing-1',
        isRead: false,
      }),
    );
  });

  it('filters notifications disabled in agent preferences before unread count', async () => {
    const { service, notificationReadRepo } = createService({
      preferences: [{ agentId, category: 'task', enabled: false }],
      overdueFollowUps: [
        {
          id: 'task-1',
          agentId,
          title: 'Oddzwonić po prezentacji',
          status: TaskStatus.TODO,
          type: TaskType.FOLLOW_UP,
          dueAt: new Date('2026-06-28T09:00:00.000Z'),
          createdAt: new Date('2026-06-27T09:00:00.000Z'),
          clientId: 'client-1',
        },
      ],
    });

    const result = await service.findAll(userId, { limit: 8 });

    expect(result.items).not.toContainEqual(
      expect.objectContaining({ category: 'task' }),
    );
    expect(result.unreadCount).toBe(0);
    expect(notificationReadRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('uses custom rule thresholds when querying notification candidates', async () => {
    const { service, taskRepo, listingRepo } = createService({
      ruleSettings: {
        agentId,
        followUpOverdueDays: 3,
        staleListingDays: 21,
      },
    });

    await service.findAll(userId, { limit: 8 });

    expect(taskRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueAt: expect.objectContaining({
            _value: new Date('2026-06-27T10:00:00.000Z'),
          }),
        }),
      }),
    );
    expect(listingRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          updatedAt: expect.objectContaining({
            _value: new Date('2026-06-09T10:00:00.000Z'),
          }),
        }),
      }),
    );
  });

  it('keeps critical overdue follow-ups visible even when the regular threshold is higher', async () => {
    const { service, taskRepo } = createService({
      ruleSettings: {
        agentId,
        followUpOverdueDays: 30,
        staleListingDays: 90,
      },
      overdueFollowUps: [
        {
          id: 'task-critical',
          agentId,
          title: 'Bardzo zaległy kontakt',
          status: TaskStatus.TODO,
          type: TaskType.FOLLOW_UP,
          dueAt: new Date('2026-06-20T09:00:00.000Z'),
          createdAt: new Date('2026-06-19T09:00:00.000Z'),
          clientId: 'client-1',
        },
      ],
    });

    const result = await service.findAll(userId, { limit: 8 });

    expect(taskRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueAt: expect.objectContaining({
            _value: new Date('2026-06-23T10:00:00.000Z'),
          }),
        }),
      }),
    );
    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: 'task-overdue-follow-up-task-critical',
        severity: 'critical',
      }),
    );
  });

  it('upserts notification preferences for the resolved agent', async () => {
    const {
      service,
      notificationPreferenceRepo,
      notificationRuleSettingsRepo,
      usersService,
    } = createService();

    await service.updatePreferences(
      userId,
      [
        { category: 'task', enabled: false },
        { category: 'listing', enabled: true },
      ],
      {
        followUpOverdueDays: 2,
        staleListingDays: 30,
      },
    );

    expect(usersService.resolveAgentForUser).toHaveBeenCalledWith(userId);
    expect(notificationPreferenceRepo.upsert).toHaveBeenCalledWith(
      [
        { agentId, category: 'task', enabled: false },
        { agentId, category: 'listing', enabled: true },
      ],
      ['agentId', 'category'],
    );
    expect(notificationRuleSettingsRepo.upsert).toHaveBeenCalledWith(
      {
        agentId,
        followUpOverdueDays: 2,
        staleListingDays: 30,
      },
      ['agentId'],
    );
  });
});
