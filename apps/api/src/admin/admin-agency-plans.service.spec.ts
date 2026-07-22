import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ActivityAction,
  AgencyPlan,
  ListingPublicationStatus,
  ListingStatus,
  SubscriptionStatus,
} from '../common/enums';
import { Agency, Agent } from '../users/entities';
import { AdminAgencyPlansService } from './admin-agency-plans.service';

function buildAgency(overrides: Partial<Agency> = {}): Agency {
  return {
    id: 'agency-1',
    name: 'Kowalski Real Estate',
    address: '',
    logoUrl: '',
    subscription: SubscriptionStatus.ACTIVE,
    plan: AgencyPlan.FREE,
    planOverrides: null,
    billingCustomerId: null,
    billingSubscriptionId: null,
    billingInterval: null,
    currentPeriodEnd: null,
    trialEndsAt: null,
    planChangedAt: null,
    limitGraceStartedAt: null,
    limitGraceEndsAt: null,
    limitGraceEnforcedAt: null,
    ownerId: 'user-1',
    agents: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    firstName: 'Jan',
    lastName: 'Kowalski',
    phone: null,
    licenseNo: null,
    bio: null,
    avatarUrl: null,
    userId: 'user-1',
    agencyId: 'agency-1',
    agency: undefined as never,
    user: undefined as never,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildService(params: {
  agency?: Agency | null;
  agents?: Agent[];
  usage?: {
    activeListings: number;
    clients: number;
    monthlyAppointments: number;
    users: number;
  };
  config?: Record<string, unknown>;
} = {}) {
  const agency = params.agency === undefined ? buildAgency() : params.agency;
  const agents = params.agents ?? [buildAgent()];
  const usage = params.usage ?? {
    activeListings: 6,
    clients: 10,
    monthlyAppointments: 3,
    users: agents.length,
  };

  const agencyRepo = {
    findOne: jest.fn().mockResolvedValue(agency),
    save: jest.fn(async (entity) => entity),
    createQueryBuilder: jest.fn(),
  };
  const agentRepo = {
    find: jest.fn().mockResolvedValue(agents),
  };
  const activityQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };
  const activityRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(activityQueryBuilder),
  };
  const usersService = {
    getAgencyUsageSummaryByAgentIds: jest.fn().mockResolvedValue(usage),
  };
  const agencyPlanService = {
    getEntitlements: jest.fn((currentAgency: Agency) => ({
      plan: {
        code: currentAgency.plan,
        label: currentAgency.planOverrides?.label ?? 'Free',
        status: currentAgency.subscription,
      },
      limits: {
        activeListings:
          currentAgency.planOverrides?.limits?.activeListings ?? 5,
        clients: currentAgency.planOverrides?.limits?.clients ?? 25,
        monthlyAppointments:
          currentAgency.planOverrides?.limits?.monthlyAppointments ?? 20,
        users: currentAgency.planOverrides?.limits?.users ?? 1,
        imagesPerListing:
          currentAgency.planOverrides?.limits?.imagesPerListing ?? 15,
      },
      features: {
        reportsOverview: true,
        reportsListingsBasic: true,
        reportsClientsBasic: true,
        reportsAppointmentsBasic: false,
        publicListings: true,
        publicLeadForms: true,
        agentListingMarket: true,
        customBranding:
          currentAgency.planOverrides?.features?.customBranding ?? false,
        multiUser: currentAgency.planOverrides?.features?.multiUser ?? false,
        customDomain:
          currentAgency.planOverrides?.features?.customDomain ?? false,
        apiAccess: currentAgency.planOverrides?.features?.apiAccess ?? false,
        dedicatedSupport:
          currentAgency.planOverrides?.features?.dedicatedSupport ?? false,
      },
    })),
  };
  const agencyLimitDowngradeEnforcementService = {
    enforceAgencyListingLimit: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => params.config?.[key]),
  };
  const monitoringService = {
    recordWarning: jest.fn(),
  };

  const queryBuilder = {
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(agency ? [agency] : []),
  };
  agencyRepo.createQueryBuilder.mockReturnValue(queryBuilder);

  return {
    service: new AdminAgencyPlansService(
      agencyRepo as never,
      agentRepo as never,
      activityRepo as never,
      usersService as never,
      agencyPlanService as never,
      agencyLimitDowngradeEnforcementService as never,
      configService as never,
      monitoringService as never,
    ),
    agencyRepo,
    agentRepo,
    activityRepo,
    activityQueryBuilder,
    usersService,
    agencyPlanService,
    agencyLimitDowngradeEnforcementService,
    configService,
    monitoringService,
    agency,
    queryBuilder,
  };
}

describe('AdminAgencyPlansService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-20T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns current agency plan, usage, entitlements and limit warnings', async () => {
    const { service } = buildService({
      agency: buildAgency({
        limitGraceStartedAt: new Date('2026-06-20T10:00:00.000Z'),
        limitGraceEndsAt: new Date('2026-06-27T10:00:00.000Z'),
        limitGraceEnforcedAt: null,
      }),
    });

    const response = await service.findAgencyPlan('agency-1');

    expect(response.agency).toMatchObject({
      id: 'agency-1',
      plan: AgencyPlan.FREE,
      limitGraceStartedAt: new Date('2026-06-20T10:00:00.000Z'),
      limitGraceEndsAt: new Date('2026-06-27T10:00:00.000Z'),
      limitGraceEnforcedAt: null,
    });
    expect(response.usage.activeListings).toBe(6);
    expect(response.limitWarnings).toEqual([
      {
        resource: 'activeListings',
        usage: 6,
        limit: 5,
        message: 'Aktualne użycie activeListings (6) przekracza nowy limit (5)',
      },
    ]);
  });

  it('lists agencies for admin selection with optional search', async () => {
    const { service, agencyRepo, queryBuilder } = buildService();

    const agencies = await service.findAgencies({ search: 'kowalski' });

    expect(agencyRepo.createQueryBuilder).toHaveBeenCalledWith('agency');
    expect(queryBuilder.orderBy).toHaveBeenCalledWith(
      'agency.createdAt',
      'DESC',
    );
    expect(queryBuilder.limit).toHaveBeenCalledWith(100);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'agency.name ILIKE :search',
      { search: '%kowalski%' },
    );
    expect(agencies).toEqual([
      expect.objectContaining({
        id: 'agency-1',
        name: 'Kowalski Real Estate',
        plan: AgencyPlan.FREE,
      }),
    ]);
  });

  it('returns recent automatic limit enforcement audit entries for support', async () => {
    const { service, activityRepo, activityQueryBuilder } = buildService();
    activityQueryBuilder.getMany.mockResolvedValue([
      {
        id: 'activity-1',
        agentId: 'agent-1',
        action: ActivityAction.ARCHIVED,
        createdAt: new Date('2026-06-20T10:30:00.000Z'),
        changes: [
          { field: 'agencyId', oldValue: null, newValue: 'agency-1' },
          { field: 'listingId', oldValue: null, newValue: 'listing-1' },
          {
            field: 'status',
            oldValue: ListingStatus.ACTIVE,
            newValue: ListingStatus.ARCHIVED,
          },
          {
            field: 'publicationStatus',
            oldValue: ListingPublicationStatus.PUBLISHED,
            newValue: ListingPublicationStatus.UNPUBLISHED,
          },
          { field: 'planLimit', oldValue: null, newValue: 5 },
          { field: 'usageBeforeEnforcement', oldValue: null, newValue: 9 },
          {
            field: 'reason',
            oldValue: null,
            newValue: 'plan_limit_downgrade_enforcement',
          },
          {
            field: 'enforcedAt',
            oldValue: null,
            newValue: '2026-06-20T10:00:00.000Z',
          },
        ],
      },
    ]);

    const response = await service.findAgencyLimitEnforcements('agency-1', '250');

    expect(activityRepo.createQueryBuilder).toHaveBeenCalledWith('activity');
    expect(activityQueryBuilder.where).toHaveBeenCalledWith(
      'activity.changes @> CAST(:agencyChange AS jsonb)',
      {
        agencyChange: JSON.stringify([
          { field: 'agencyId', newValue: 'agency-1' },
        ]),
      },
    );
    expect(activityQueryBuilder.andWhere).toHaveBeenCalledWith(
      'activity.changes @> CAST(:reasonChange AS jsonb)',
      {
        reasonChange: JSON.stringify([
          {
            field: 'reason',
            newValue: 'plan_limit_downgrade_enforcement',
          },
        ]),
      },
    );
    expect(activityQueryBuilder.orderBy).toHaveBeenCalledWith(
      'activity.createdAt',
      'DESC',
    );
    expect(activityQueryBuilder.limit).toHaveBeenCalledWith(100);
    expect(response).toEqual([
      {
        id: 'activity-1',
        agencyId: 'agency-1',
        listingId: 'listing-1',
        agentId: 'agent-1',
        action: ActivityAction.ARCHIVED,
        reason: 'plan_limit_downgrade_enforcement',
        previousStatus: ListingStatus.ACTIVE,
        newStatus: ListingStatus.ARCHIVED,
        previousPublicationStatus: ListingPublicationStatus.PUBLISHED,
        newPublicationStatus: ListingPublicationStatus.UNPUBLISHED,
        planLimit: 5,
        usageBeforeEnforcement: 9,
        enforcedAt: '2026-06-20T10:00:00.000Z',
        createdAt: new Date('2026-06-20T10:30:00.000Z'),
      },
    ]);
  });

  it('assigns a custom plan with trimmed overrides and updates planChangedAt', async () => {
    const { service, agencyRepo } = buildService();

    const response = await service.updateAgencyPlan('agency-1', {
      plan: AgencyPlan.CUSTOM,
      planOverrides: {
        label: ' Plan Premium ',
        priceMonthlyPln: 19900,
        priceYearlyPln: 199000,
        limits: {
          activeListings: 50,
          clients: 500,
          users: 3,
        },
        features: {
          customBranding: true,
          multiUser: true,
        },
      },
    });

    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: AgencyPlan.CUSTOM,
        planOverrides: expect.objectContaining({
          label: 'Plan Premium',
          priceMonthlyPln: 19900,
          limits: expect.objectContaining({ activeListings: 50 }),
          features: expect.objectContaining({ customBranding: true }),
        }),
        planChangedAt: expect.any(Date),
      }),
    );
    expect(response.entitlements.plan.label).toBe('Plan Premium');
    expect(response.limitWarnings).toEqual([]);
  });

  it('clears overrides when assigning a standard plan', async () => {
    const existingAgency = buildAgency({
      plan: AgencyPlan.CUSTOM,
      planOverrides: { label: 'Old custom' },
    });
    const { service, agencyRepo } = buildService({ agency: existingAgency });

    await service.updateAgencyPlan('agency-1', {
      plan: AgencyPlan.PROFESSIONAL,
      planOverrides: null,
    });

    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: AgencyPlan.PROFESSIONAL,
        planOverrides: null,
      }),
    );
  });

  it('starts listing limit grace period when the updated plan is below current usage', async () => {
    const { service, agencyRepo, monitoringService } = buildService({
      usage: {
        activeListings: 9,
        clients: 10,
        monthlyAppointments: 3,
        users: 1,
      },
      config: {
        PLAN_LIMIT_DOWNGRADE_GRACE_DAYS: 7,
      },
    });

    await service.updateAgencyPlan('agency-1', {
      plan: AgencyPlan.STARTER,
      planOverrides: null,
    });

    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: AgencyPlan.STARTER,
        limitGraceStartedAt: new Date('2026-06-20T10:00:00.000Z'),
        limitGraceEndsAt: new Date('2026-06-27T10:00:00.000Z'),
        limitGraceEnforcedAt: null,
      }),
    );
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_exceeded',
      expect.objectContaining({
        agencyId: 'agency-1',
        resource: 'activeListings',
        limit: 5,
        usage: 9,
      }),
    );
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_grace_started',
      expect.objectContaining({
        agencyId: 'agency-1',
        resource: 'activeListings',
        limit: 5,
        usage: 9,
        graceStartedAt: '2026-06-20T10:00:00.000Z',
        graceEndsAt: '2026-06-27T10:00:00.000Z',
      }),
    );
  });

  it('clears listing limit grace period when the updated plan fits current usage', async () => {
    const existingAgency = buildAgency({
      limitGraceStartedAt: new Date('2026-06-01T00:00:00.000Z'),
      limitGraceEndsAt: new Date('2026-06-08T00:00:00.000Z'),
      limitGraceEnforcedAt: new Date('2026-06-08T01:00:00.000Z'),
    });
    const { service, agencyRepo } = buildService({
      agency: existingAgency,
      usage: {
        activeListings: 3,
        clients: 10,
        monthlyAppointments: 3,
        users: 1,
      },
    });

    await service.updateAgencyPlan('agency-1', {
      plan: AgencyPlan.STARTER,
      planOverrides: null,
    });

    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        limitGraceStartedAt: null,
        limitGraceEndsAt: null,
        limitGraceEnforcedAt: null,
      }),
    );
  });

  it('rejects overrides for standard plans', async () => {
    const { service, agencyRepo } = buildService();

    await expect(
      service.updateAgencyPlan('agency-1', {
        plan: AgencyPlan.STARTER,
        planOverrides: {
          label: 'Should not be allowed',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(agencyRepo.save).not.toHaveBeenCalled();
  });

  it('resets agency-specific overrides without changing the base plan', async () => {
    const existingAgency = buildAgency({
      plan: AgencyPlan.CUSTOM,
      planOverrides: { label: 'Old custom' },
    });
    const { service, agencyRepo } = buildService({ agency: existingAgency });

    await service.resetAgencyPlanOverrides('agency-1');

    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: AgencyPlan.CUSTOM,
        planOverrides: null,
        planChangedAt: expect.any(Date),
      }),
    );
  });

  it('returns zero usage for agencies without agents', async () => {
    const { service, usersService } = buildService({ agents: [] });

    const response = await service.findAgencyPlan('agency-1');

    expect(usersService.getAgencyUsageSummaryByAgentIds).not.toHaveBeenCalled();
    expect(response.usage).toEqual({
      activeListings: 0,
      clients: 0,
      monthlyAppointments: 0,
      users: 0,
    });
  });

  it('throws when agency does not exist', async () => {
    const { service } = buildService({ agency: null });

    await expect(service.findAgencyPlan('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
