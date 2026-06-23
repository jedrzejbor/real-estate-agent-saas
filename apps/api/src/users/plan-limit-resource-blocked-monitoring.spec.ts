import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import {
  AgencyPlan,
  AppointmentStatus,
  AppointmentType,
  ListingPublicationStatus,
  ListingStatus,
  SubscriptionStatus,
} from '../common/enums';
import { AgencyLimitEnforcementService } from './agency-limit-enforcement.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ClientsService } from '../clients/clients.service';
import { ListingsService } from '../listings/listings.service';

const entitlements = {
  plan: {
    code: AgencyPlan.STARTER,
    label: 'Starter',
    status: SubscriptionStatus.ACTIVE,
  },
  limits: {
    activeListings: 5,
    clients: 25,
    monthlyAppointments: 20,
    users: 1,
    imagesPerListing: 15,
  },
  features: {
    reportsOverview: true,
    reportsListingsBasic: true,
    reportsClientsBasic: true,
    reportsAppointmentsBasic: false,
    publicListings: true,
    publicLeadForms: true,
    customBranding: false,
    multiUser: false,
    customDomain: false,
    apiAccess: false,
    dedicatedSupport: false,
  },
};

const access = {
  agency: { id: 'agency-1' },
  agent: { id: 'agent-1' },
  agencyAgentIds: ['agent-1', 'agent-2'],
  entitlements,
};

const monitoringService = () => ({
  recordWarning: jest.fn(),
});

describe('plan limit resource blocked monitoring', () => {
  it('records blocked active listing usage before throwing', async () => {
    const listingRepo = {
      count: jest.fn().mockResolvedValue(5),
    };
    const monitoring = monitoringService();
    const service = new ListingsService(
      listingRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { getAgencyAccessContext: jest.fn().mockResolvedValue(access) } as never,
      new AgencyLimitEnforcementService(),
      {} as never,
      {} as never,
      monitoring as never,
    ) as unknown as {
      assertListingActiveUsageWithinPlanLimit: (
        userId: string,
        addedUsage: number,
      ) => Promise<void>;
    };

    await expect(
      service.assertListingActiveUsageWithinPlanLimit('user-1', 1),
    ).rejects.toBeInstanceOf(PlanLimitReachedException);

    expect(listingRepo.count).toHaveBeenCalledWith({
      where: {
        agentId: expect.any(Object),
        status: expect.any(Object),
      },
    });
    expect(monitoring.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_resource_blocked',
      {
        agencyId: 'agency-1',
        resource: 'activeListings',
        planCode: AgencyPlan.STARTER,
        limit: 5,
        currentUsage: 5,
        attemptedUsage: 6,
      },
    );
  });

  it('blocks restoring archived listing when active listing limit is already reached', async () => {
    const archivedListing = {
      id: 'listing-1',
      agentId: 'agent-1',
      status: ListingStatus.ARCHIVED,
      publicationStatus: ListingPublicationStatus.UNPUBLISHED,
      title: 'Archived listing',
    };
    const listingRepo = {
      count: jest.fn().mockResolvedValue(5),
      findOne: jest.fn().mockResolvedValue(archivedListing),
      save: jest.fn(),
    };
    const monitoring = monitoringService();
    const service = new ListingsService(
      listingRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {
        resolveAgentForUser: jest.fn().mockResolvedValue(access.agent),
        getAgencyAccessContext: jest.fn().mockResolvedValue(access),
      } as never,
      new AgencyLimitEnforcementService(),
      { buildChanges: jest.fn(), log: jest.fn() } as never,
      {} as never,
      monitoring as never,
    );

    await expect(
      service.update('listing-1', 'user-1', { status: ListingStatus.ACTIVE }),
    ).rejects.toBeInstanceOf(PlanLimitReachedException);

    expect(listingRepo.save).not.toHaveBeenCalled();
    expect(monitoring.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_resource_blocked',
      {
        agencyId: 'agency-1',
        resource: 'activeListings',
        planCode: AgencyPlan.STARTER,
        limit: 5,
        currentUsage: 5,
        attemptedUsage: 6,
      },
    );
  });

  it('records blocked client batch usage before throwing', async () => {
    const clientRepo = {
      count: jest.fn().mockResolvedValue(24),
    };
    const monitoring = monitoringService();
    const service = new ClientsService(
      clientRepo as never,
      {} as never,
      {} as never,
      {} as never,
      { getAgencyAccessContext: jest.fn().mockResolvedValue(access) } as never,
      new AgencyLimitEnforcementService(),
      {} as never,
      monitoring as never,
    ) as unknown as {
      assertClientUsageWithinPlanLimit: (
        currentAccess: typeof access,
        addedUsage: number,
      ) => Promise<void>;
    };

    await expect(
      service.assertClientUsageWithinPlanLimit(access, 2),
    ).rejects.toBeInstanceOf(PlanLimitReachedException);

    expect(monitoring.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_resource_blocked',
      {
        agencyId: 'agency-1',
        resource: 'clients',
        planCode: AgencyPlan.STARTER,
        limit: 25,
        currentUsage: 24,
        attemptedUsage: 26,
        addedUsage: 2,
      },
    );
  });

  it('blocks client import before opening a transaction when batch exceeds plan limit', async () => {
    const transaction = jest.fn();
    const clientRepo = {
      count: jest.fn().mockResolvedValue(24),
      manager: { transaction },
    };
    const monitoring = monitoringService();
    const service = new ClientsService(
      clientRepo as never,
      {} as never,
      {} as never,
      {} as never,
      { getAgencyAccessContext: jest.fn().mockResolvedValue(access) } as never,
      new AgencyLimitEnforcementService(),
      { log: jest.fn() } as never,
      monitoring as never,
    );

    const error = await service
      .importClients('user-1', {
        rows: [
          {
            firstName: 'Anna',
            lastName: 'Nowak',
            email: 'anna@example.com',
          },
          {
            firstName: 'Jan',
            lastName: 'Kowalski',
            email: 'jan@example.com',
          },
        ],
      })
      .catch((caughtError) => caughtError);

    expect(error).toBeInstanceOf(PlanLimitReachedException);

    expect(transaction).not.toHaveBeenCalled();
    expect(monitoring.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_resource_blocked',
      {
        agencyId: 'agency-1',
        resource: 'clients',
        planCode: AgencyPlan.STARTER,
        limit: 25,
        currentUsage: 24,
        attemptedUsage: 26,
        addedUsage: 2,
      },
    );
  });

  it('records blocked monthly appointment usage before throwing', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(20),
    };
    const appointmentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const monitoring = monitoringService();
    const service = new AppointmentsService(
      appointmentRepo as never,
      {} as never,
      {} as never,
      new AgencyLimitEnforcementService(),
      monitoring as never,
    ) as unknown as {
      assertAppointmentMonthlyUsageWithinPlanLimit: (
        currentAccess: typeof access,
        startTime: string,
      ) => Promise<void>;
    };

    await expect(
      service.assertAppointmentMonthlyUsageWithinPlanLimit(
        access,
        '2026-06-22T10:00:00.000Z',
      ),
    ).rejects.toBeInstanceOf(PlanLimitReachedException);

    expect(monitoring.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_resource_blocked',
      {
        agencyId: 'agency-1',
        resource: 'monthlyAppointments',
        planCode: AgencyPlan.STARTER,
        limit: 20,
        currentUsage: 20,
        attemptedUsage: 21,
        month: '2026-06',
      },
    );
  });

  it('blocks moving appointment into a month with exhausted appointment limit', async () => {
    const appointment = {
      id: 'appointment-1',
      agentId: 'agent-1',
      title: 'Prezentacja',
      type: AppointmentType.VIEWING,
      status: AppointmentStatus.SCHEDULED,
      startTime: new Date('2026-05-22T10:00:00.000Z'),
      endTime: new Date('2026-05-22T11:00:00.000Z'),
    };
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(20),
    };
    const appointmentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn().mockResolvedValue(appointment),
      save: jest.fn(),
    };
    const monitoring = monitoringService();
    const service = new AppointmentsService(
      appointmentRepo as never,
      {} as never,
      {
        resolveAgentForUser: jest.fn().mockResolvedValue(access.agent),
        getAgencyAccessContext: jest.fn().mockResolvedValue(access),
      } as never,
      new AgencyLimitEnforcementService(),
      monitoring as never,
    );

    await expect(
      service.update('appointment-1', 'user-1', {
        startTime: '2026-06-22T10:00:00.000Z',
        endTime: '2026-06-22T11:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(PlanLimitReachedException);

    expect(appointmentRepo.save).not.toHaveBeenCalled();
    expect(monitoring.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_resource_blocked',
      {
        agencyId: 'agency-1',
        resource: 'monthlyAppointments',
        planCode: AgencyPlan.STARTER,
        limit: 20,
        currentUsage: 20,
        attemptedUsage: 21,
        month: '2026-06',
      },
    );
  });
});
