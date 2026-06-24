import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  AppointmentStatus,
  ListingStatus,
  PublicLeadStatus,
} from '../common/enums';
import { DashboardService } from './dashboard.service';

const agent = { id: 'agent-1' };
const fixedNow = new Date('2026-06-24T10:00:00.000Z');

describe('DashboardService getToday', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(fixedNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an empty operational list when there is nothing urgent', async () => {
    const { service } = createService();

    const result = await service.getToday('user-1');

    expect(result).toEqual({
      items: [],
      generatedAt: fixedNow.toISOString(),
    });
  });

  it('scopes appointment and lead queries to the resolved agent', async () => {
    const { service, appointmentRepo, publicLeadRepo, listingRepo } =
      createService();

    await service.getToday('user-1');

    expect(appointmentRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentId: agent.id,
          status: AppointmentStatus.SCHEDULED,
          startTime: expect.any(Object),
        }),
      }),
    );
    expect(publicLeadRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentId: agent.id,
          status: In([PublicLeadStatus.NEW, PublicLeadStatus.CONTACTED]),
          createdAt: expect.any(Object),
        }),
      }),
    );
    const todayStart = new Date(fixedNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(fixedNow);
    todayEnd.setHours(23, 59, 59, 999);

    expect(appointmentRepo.find.mock.calls[0][0].where.startTime).toEqual(
      Between(todayStart, todayEnd),
    );
    expect(publicLeadRepo.find.mock.calls[0][0].where.createdAt).toEqual(
      MoreThanOrEqual(new Date('2026-06-23T10:00:00.000Z')),
    );
    expect(listingRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentId: agent.id,
          status: ListingStatus.ACTIVE,
          updatedAt: expect.any(Object),
        }),
        order: { updatedAt: 'ASC' },
        take: 5,
      }),
    );
    expect(listingRepo.find.mock.calls[0][0].where.updatedAt).toEqual(
      LessThanOrEqual(new Date('2026-06-10T10:00:00.000Z')),
    );
  });

  it('sorts high priority due items before medium and low priority work', async () => {
    const { service, appointmentRepo, publicLeadRepo, documentsService } =
      createService();
    appointmentRepo.find.mockResolvedValue([
      {
        id: 'appointment-1',
        title: 'Prezentacja mieszkania',
        startTime: new Date('2026-06-24T15:00:00.000Z'),
        endTime: new Date('2026-06-24T16:00:00.000Z'),
        location: 'Witebska 2',
        client: { firstName: 'Adam', lastName: 'Kowal' },
        listing: { title: 'Mieszkanie na Witebskiej' },
      },
    ]);
    publicLeadRepo.find.mockResolvedValue([
      {
        id: 'lead-1',
        fullName: 'Anna Nowak',
        status: PublicLeadStatus.NEW,
        createdAt: new Date('2026-06-24T09:30:00.000Z'),
        listingId: 'listing-1',
        listing: { title: 'Dom pod lasem' },
      },
    ]);
    documentsService.getAttentionSummaryForAgent.mockResolvedValue({
      total: 1,
      missingRequired: 0,
      needsCorrection: 0,
      overdue: 1,
      expired: 0,
      items: [
        {
          id: 'doc-overdue',
          kind: 'overdue',
          listingId: 'listing-2',
          listingTitle: 'Apartament centrum',
          documentId: 'doc-1',
          documentName: 'Umowa pośrednictwa',
          count: 1,
          dueDate: '2026-06-23T09:00:00.000Z',
          createdAt: '2026-06-23T08:00:00.000Z',
        },
      ],
    });

    const result = await service.getToday('user-1');

    expect(result.items.map((item) => item.id)).toEqual([
      'document-doc-overdue',
      'appointment-appointment-1',
      'public-lead-lead-1',
    ]);
    expect(result.items[0]).toMatchObject({
      priority: 'high',
      action: {
        label: 'Uzupełnij dokument',
        href: '/dashboard/listings/listing-2?tab=documents',
      },
    });
  });

  it('limits the response to ten items', async () => {
    const { service, publicLeadRepo } = createService();
    publicLeadRepo.find.mockResolvedValue(
      Array.from({ length: 12 }, (_, index) => ({
        id: `lead-${index}`,
        fullName: `Lead ${index}`,
        status: PublicLeadStatus.NEW,
        createdAt: new Date(
          `2026-06-24T09:${String(index).padStart(2, '0')}:00.000Z`,
        ),
        listingId: null,
        listing: null,
      })),
    );

    const result = await service.getToday('user-1');

    expect(result.items).toHaveLength(10);
  });

  it('returns stale active listings as low priority work', async () => {
    const { service, listingRepo } = createService();
    listingRepo.find.mockResolvedValue([
      {
        id: 'listing-stale-1',
        title: 'Mieszkanie bez aktywności',
        updatedAt: new Date('2026-06-01T10:00:00.000Z'),
      },
    ]);

    const result = await service.getToday('user-1');

    expect(result.items).toContainEqual(
      expect.objectContaining({
        id: 'listing-stale-listing-stale-1',
        type: 'listing',
        priority: 'low',
        title: 'Mieszkanie bez aktywności',
        href: '/dashboard/listings/listing-stale-1',
        action: {
          label: 'Sprawdź ofertę',
          href: '/dashboard/listings/listing-stale-1',
        },
      }),
    );
  });
});

function createService() {
  const listingRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const appointmentRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const publicLeadRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const documentsService = {
    getAttentionSummaryForAgent: jest.fn().mockResolvedValue({
      total: 0,
      missingRequired: 0,
      needsCorrection: 0,
      overdue: 0,
      expired: 0,
      items: [],
    }),
  };
  const usersService = {
    resolveAgentForUser: jest.fn().mockResolvedValue(agent),
  };

  const service = new DashboardService(
    listingRepo as never,
    {} as never,
    appointmentRepo as never,
    {} as never,
    publicLeadRepo as never,
    usersService as never,
    documentsService as never,
  );

  return {
    service,
    listingRepo,
    appointmentRepo,
    publicLeadRepo,
    documentsService,
    usersService,
  };
}
