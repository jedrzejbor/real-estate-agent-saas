import {
  ActivityAction,
  ActivityEntityType,
  AppointmentStatus,
  ListingPublicationStatus,
  ListingStatus,
  PropertyType,
  TransactionType,
} from '../common/enums';
import { ListingsService } from './listings.service';

describe('ListingsService owner report', () => {
  const listingId = '11111111-1111-1111-1111-111111111111';
  const agentId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  function createCountQueryBuilder(count: number) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(count),
    };
  }

  function createEventsQueryBuilder(events: unknown[]) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(events),
    };
  }

  function createService({
    resolvedAgentId = agentId,
  }: { resolvedAgentId?: string } = {}) {
    const listingRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: listingId,
        title: 'Mieszkanie na Woli',
        agentId,
        status: ListingStatus.ACTIVE,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.SALE,
        price: 760000,
        currency: 'PLN',
        areaM2: 54,
        rooms: 2,
        address: {
          city: 'Warszawa',
          district: 'Wola',
          street: 'Prosta 10',
        },
        images: [],
        agent: {
          id: agentId,
          userId,
          firstName: 'Adam',
          lastName: 'Kowal',
          phone: '600700800',
          agency: {
            id: 'agency-1',
            name: 'EstateFlow Premium',
            address: 'Warszawa, Prosta 10',
            logoUrl: 'https://example.com/logo.png',
            plan: 'professional',
            billingCustomerId: 'cus_secret',
          },
        },
      }),
    };
    const analyticsViewsCountQb = createCountQueryBuilder(12);
    const previousAnalyticsViewsCountQb = createCountQueryBuilder(8);
    const analyticsActivityQb = createEventsQueryBuilder([
      {
        id: 'analytics-1',
        name: 'public_listing_viewed',
        createdAt: new Date('2026-06-25T09:00:00.000Z'),
        properties: { listingId },
      },
    ]);
    const analyticsEventRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(analyticsViewsCountQb)
        .mockReturnValueOnce(analyticsActivityQb)
        .mockReturnValueOnce(previousAnalyticsViewsCountQb),
    };
    const publicLeadCountQb = createCountQueryBuilder(2);
    const previousPublicLeadCountQb = createCountQueryBuilder(4);
    const publicLeadActivityQb = createEventsQueryBuilder([
      {
        id: 'lead-1',
        fullName: 'Jan Kowalski',
        email: 'jan@example.com',
        phone: '500500500',
        message: 'Czy oferta jest aktualna?',
        createdAt: new Date('2026-06-24T10:00:00.000Z'),
      },
    ]);
    const publicLeadRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(publicLeadCountQb)
        .mockReturnValueOnce(publicLeadActivityQb)
        .mockReturnValueOnce(previousPublicLeadCountQb),
    };
    const appointmentCountQb = createCountQueryBuilder(3);
    const completedAppointmentCountQb = createCountQueryBuilder(1);
    const previousAppointmentCountQb = createCountQueryBuilder(2);
    const previousCompletedAppointmentCountQb = createCountQueryBuilder(0);
    const appointmentActivityQb = createEventsQueryBuilder([
      {
        id: 'appointment-1',
        title: 'Prezentacja mieszkania',
        status: AppointmentStatus.SCHEDULED,
        startTime: new Date('2026-06-26T12:00:00.000Z'),
      },
    ]);
    const appointmentRepo = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(appointmentCountQb)
        .mockReturnValueOnce(completedAppointmentCountQb)
        .mockReturnValueOnce(appointmentActivityQb)
        .mockReturnValueOnce(previousAppointmentCountQb)
        .mockReturnValueOnce(previousCompletedAppointmentCountQb),
      count: jest.fn().mockResolvedValue(1),
    };
    const usersService = {
      resolveAgentForUser: jest.fn().mockResolvedValue({ id: resolvedAgentId }),
    };
    const activityService = {
      findEntityHistory: jest.fn().mockResolvedValue([
        {
          id: 'history-1',
          action: ActivityAction.STATUS_CHANGED,
          entityType: ActivityEntityType.LISTING,
          entityId: listingId,
          description: 'Zmieniono status oferty',
          createdAt: new Date('2026-06-23T08:00:00.000Z'),
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
      {} as never,
      publicLeadRepo as never,
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
      appointmentCountQb,
      completedAppointmentCountQb,
      publicLeadCountQb,
    };
  }

  it('returns scoped owner report metrics without personal lead data', async () => {
    const {
      service,
      appointmentCountQb,
      completedAppointmentCountQb,
      publicLeadCountQb,
    } = createService();

    const report = await service.findOwnerReport(listingId, userId, {
      from: '2026-06-20T00:00:00.000Z',
      to: '2026-06-30T00:00:00.000Z',
    });

    expect(report.metrics).toEqual({
      publicViews: 12,
      inquiries: 2,
      appointments: 3,
      completedAppointments: 1,
      upcomingAppointments: 1,
    });
    expect(report.brand).toEqual({
      agency: {
        name: 'EstateFlow Premium',
        address: 'Warszawa, Prosta 10',
        logoUrl: 'https://example.com/logo.png',
      },
      agent: {
        name: 'Adam Kowal',
        phone: '600700800',
      },
    });
    expect(JSON.stringify(report)).not.toContain('professional');
    expect(JSON.stringify(report)).not.toContain('cus_secret');
    expect(report.comparison.deltas.publicViews).toEqual({
      current: 12,
      previous: 8,
      change: 4,
      changePct: 50,
      direction: 'up',
    });
    expect(report.comparison.deltas.inquiries).toEqual({
      current: 2,
      previous: 4,
      change: -2,
      changePct: -50,
      direction: 'down',
    });
    expect(report.comparison.deltas.completedAppointments).toEqual({
      current: 1,
      previous: 0,
      change: 1,
      changePct: null,
      direction: 'up',
    });
    expect(publicLeadCountQb.where).toHaveBeenCalledWith(
      'lead.agentId = :agentId',
      { agentId },
    );
    expect(appointmentCountQb.andWhere).toHaveBeenCalledWith(
      'appointment.listingId = :listingId',
      { listingId },
    );
    expect(completedAppointmentCountQb.andWhere).toHaveBeenCalledWith(
      'appointment.status = :status',
      { status: AppointmentStatus.COMPLETED },
    );
    expect(JSON.stringify(report)).not.toContain('jan@example.com');
    expect(JSON.stringify(report)).not.toContain('500500500');
    expect(JSON.stringify(report)).not.toContain('Jan Kowalski');
  });

  it('rejects owner report outside agent scope', async () => {
    const { service } = createService({ resolvedAgentId: 'other-agent' });

    await expect(
      service.findOwnerReport(listingId, userId, {}),
    ).rejects.toThrow('Brak dostępu do tej oferty');
  });
});
