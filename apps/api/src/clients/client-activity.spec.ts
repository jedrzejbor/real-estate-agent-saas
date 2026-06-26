import { ActivityAction, ActivityEntityType } from '../common/enums';
import { ClientsService } from './clients.service';

describe('ClientsService activity timeline', () => {
  const clientId = '11111111-1111-1111-1111-111111111111';
  const agentId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  function createService() {
    const clientRepo = {
      findOne: jest.fn().mockResolvedValue({ id: clientId, agentId }),
    };
    const noteRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'note-1',
          content: 'Klient chce wrócić do tematu po weekendzie.',
          createdAt: new Date('2026-06-21T10:00:00.000Z'),
        },
      ]),
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
          listingId: 'listing-1',
          listing: { title: 'Mieszkanie 2 pokojowe' },
        },
      ]),
    };
    const publicLeadRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    const taskRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'task-1',
          title: 'Follow-up po prezentacji',
          description: null,
          status: 'todo',
          priority: 'normal',
          type: 'follow_up',
          appointmentId: 'appointment-1',
          listingId: 'listing-1',
          dueAt: new Date('2026-06-24T08:00:00.000Z'),
          completedAt: null,
          createdAt: new Date('2026-06-23T14:00:00.000Z'),
          listing: { title: 'Mieszkanie 2 pokojowe' },
        },
      ]),
    };
    const usersService = {
      resolveAgentForUser: jest.fn().mockResolvedValue({ id: agentId }),
    };
    const activityService = {
      findEntityHistory: jest.fn().mockResolvedValue([
        {
          id: 'history-1',
          entityType: ActivityEntityType.CLIENT,
          entityId: clientId,
          action: ActivityAction.STATUS_CHANGED,
          description: 'Zmieniono status klienta',
          changes: [{ field: 'status', oldValue: 'new', newValue: 'active' }],
          createdAt: new Date('2026-06-22T09:00:00.000Z'),
          actor: {
            id: userId,
            firstName: 'Adam',
            lastName: 'Kowal',
            email: 'adam@example.com',
          },
        },
      ]),
    };

    const service = new ClientsService(
      clientRepo as never,
      noteRepo as never,
      {} as never,
      appointmentRepo as never,
      publicLeadRepo as never,
      taskRepo as never,
      {} as never,
      {} as never,
      usersService as never,
      {} as never,
      activityService as never,
      {} as never,
      {} as never,
    );

    return {
      service,
      noteRepo,
      appointmentRepo,
      publicLeadRepo,
      taskRepo,
      activityService,
    };
  }

  it('returns a normalized, agent-scoped and sorted client activity timeline', async () => {
    const {
      service,
      noteRepo,
      appointmentRepo,
      publicLeadRepo,
      taskRepo,
      activityService,
    } = createService();

    const result = await service.findActivity(clientId, userId, {
      page: 1,
      limit: 10,
    });

    expect(result.data.map((item) => item.type)).toEqual([
      'task',
      'appointment',
      'activity',
      'note',
    ]);
    expect(result.meta).toEqual({
      total: 4,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    expect(result.data[0]).toMatchObject({
      href: '/dashboard/calendar/appointment-1',
      title: 'Follow-up po prezentacji',
    });
    expect(activityService.findEntityHistory).toHaveBeenCalledWith(
      userId,
      ActivityEntityType.CLIENT,
      clientId,
    );
    expect(noteRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { client: { id: clientId }, agent: { id: agentId } },
      }),
    );
    expect(appointmentRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId, clientId },
      }),
    );
    expect(taskRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId, clientId },
      }),
    );
    expect(publicLeadRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId, convertedClientId: clientId },
      }),
    );
  });
});
