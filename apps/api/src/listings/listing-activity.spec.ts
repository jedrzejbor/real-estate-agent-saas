import { ActivityAction, ActivityEntityType } from '../common/enums';
import { ListingsService } from './listings.service';

describe('ListingsService activity timeline', () => {
  const listingId = '11111111-1111-1111-1111-111111111111';
  const agentId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  function createAnalyticsQueryBuilder(events: unknown[]) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(events),
    };
  }

  function createService() {
    const listingRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: listingId,
        agentId,
        title: 'Mieszkanie na Woli',
        images: [],
      }),
    };
    const appointmentRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'appointment-1',
          title: 'Prezentacja mieszkania',
          status: 'scheduled',
          type: 'presentation',
          startTime: new Date('2026-06-23T12:00:00.000Z'),
          location: 'Witebska 2/10',
          clientId: 'client-1',
          client: {
            firstName: 'Anna',
            lastName: 'Nowak',
            email: 'anna@example.com',
          },
        },
      ]),
    };
    const taskRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'task-1',
          title: 'Sprawdzić dokumenty',
          description: null,
          status: 'todo',
          priority: 'normal',
          type: 'document',
          appointmentId: null,
          clientId: null,
          dueAt: new Date('2026-06-24T08:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-06-22T08:00:00.000Z'),
        },
      ]),
    };
    const publicLeadRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'lead-1',
          fullName: 'Jan Kowalski',
          email: 'jan@example.com',
          phone: '500500500',
          message: 'Czy oferta jest aktualna?',
          status: 'new',
          source: 'public_listing_page',
          createdAt: new Date('2026-06-21T10:00:00.000Z'),
        },
      ]),
    };
    const listingDocumentEventRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'document-event-1',
          documentId: 'document-1',
          type: 'uploaded',
          metadata: { status: 'uploaded' },
          createdAt: new Date('2026-06-22T12:00:00.000Z'),
          document: {
            displayName: 'Umowa pośrednictwa',
            category: 'agency_agreement',
            status: 'uploaded',
          },
          actor: {
            id: userId,
            firstName: 'Adam',
            lastName: 'Kowal',
            email: 'adam@example.com',
          },
        },
      ]),
    };
    const analyticsEvents = [
      {
        id: 'analytics-1',
        name: 'public_listing_viewed',
        path: '/oferty/mieszkanie-na-woli',
        properties: { listingId },
        createdAt: new Date('2026-06-25T09:00:00.000Z'),
      },
    ];
    const analyticsQueryBuilder = createAnalyticsQueryBuilder(analyticsEvents);
    const analyticsEventRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(analyticsQueryBuilder),
    };
    const usersService = {
      resolveAgentForUser: jest.fn().mockResolvedValue({ id: agentId }),
    };
    const activityService = {
      findEntityHistory: jest.fn().mockResolvedValue([
        {
          id: 'history-1',
          entityType: ActivityEntityType.LISTING,
          entityId: listingId,
          action: ActivityAction.STATUS_CHANGED,
          description: 'Zmieniono status oferty',
          changes: [{ field: 'status', oldValue: 'draft', newValue: 'active' }],
          createdAt: new Date('2026-06-20T09:00:00.000Z'),
          actor: {
            id: userId,
            firstName: 'Adam',
            lastName: 'Kowal',
            email: 'adam@example.com',
          },
        },
      ]),
    };

    const service = new ListingsService(
      listingRepo as never,
      {} as never,
      {} as never,
      appointmentRepo as never,
      {} as never,
      {} as never,
      analyticsEventRepo as never,
      listingDocumentEventRepo as never,
      publicLeadRepo as never,
      taskRepo as never,
      {} as never,
      usersService as never,
      {} as never,
      activityService as never,
      {} as never,
      {} as never,
    );

    return {
      service,
      appointmentRepo,
      taskRepo,
      publicLeadRepo,
      listingDocumentEventRepo,
      analyticsQueryBuilder,
      activityService,
    };
  }

  it('returns a normalized, agent-scoped and sorted listing activity timeline', async () => {
    const {
      service,
      appointmentRepo,
      taskRepo,
      publicLeadRepo,
      listingDocumentEventRepo,
      analyticsQueryBuilder,
      activityService,
    } = createService();

    const result = await service.findActivity(listingId, userId, {
      page: 1,
      limit: 10,
    });

    expect(result.data.map((item) => item.type)).toEqual([
      'public_activity',
      'task',
      'appointment',
      'document',
      'public_lead',
      'activity',
    ]);
    expect(result.meta).toEqual({
      total: 6,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    expect(activityService.findEntityHistory).toHaveBeenCalledWith(
      userId,
      ActivityEntityType.LISTING,
      listingId,
    );
    expect(appointmentRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId, listingId },
      }),
    );
    expect(taskRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId, listingId },
      }),
    );
    expect(publicLeadRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId, listingId },
      }),
    );
    expect(listingDocumentEventRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId, listingId },
      }),
    );
    expect(analyticsQueryBuilder.where).toHaveBeenCalledWith(
      'event.agentId = :agentId',
      { agentId },
    );
    expect(analyticsQueryBuilder.andWhere).toHaveBeenCalledWith(
      "event.properties ->> 'listingId' = :listingId",
      { listingId },
    );
  });
});
