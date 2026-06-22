import {
  AgencyPlan,
  ListingPublicationStatus,
  ListingStatus,
  SubscriptionStatus,
} from '../common/enums';
import { Listing } from '../listings/entities/listing.entity';
import { Agency, Agent } from './entities';
import { AgencyLimitDowngradeEnforcementService } from './agency-limit-downgrade-enforcement.service';
import { AgencyLimitEnforcementService } from './agency-limit-enforcement.service';

const entitlements = {
  plan: {
    code: AgencyPlan.FREE,
    label: 'Free',
    status: SubscriptionStatus.ACTIVE,
  },
  limits: {
    activeListings: 2,
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

function buildAgency(input: Partial<Agency> = {}): Agency {
  return {
    id: 'agency-1',
    name: 'Agency',
    plan: AgencyPlan.FREE,
    subscription: SubscriptionStatus.ACTIVE,
    limitGraceStartedAt: new Date('2026-06-18T00:00:00.000Z'),
    limitGraceEndsAt: new Date('2026-06-19T00:00:00.000Z'),
    limitGraceEnforcedAt: null,
    ...input,
  } as Agency;
}

function buildListing(input: Partial<Listing> & { id: string }): Listing {
  return {
    agentId: 'agent-1',
    status: ListingStatus.ACTIVE,
    publicationStatus: ListingPublicationStatus.PUBLISHED,
    isPremium: false,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...input,
    id: input.id,
    title: input.title ?? input.id,
  } as Listing;
}

function buildService(input: {
  agency?: Agency;
  agents?: Agent[];
  listings?: Listing[];
  retainedListingIds?: string[];
}) {
  const agency = input.agency ?? buildAgency();
  const agencyRepo = {
    findOne: jest.fn().mockResolvedValue(agency),
    createQueryBuilder: jest.fn(),
    save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
  };
  const agentRepo = {
    find: jest
      .fn()
      .mockResolvedValue(input.agents ?? ([{ id: 'agent-1' }] as Agent[])),
  };
  const listingRepo = {
    find: jest.fn().mockResolvedValue(input.listings ?? []),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
  };
  const activityRepo = {
    create: jest.fn((value) => value),
    save: jest.fn().mockResolvedValue([]),
  };
  const retainedListingChoiceRepo = {
    find: jest.fn().mockResolvedValue(
      (input.retainedListingIds ?? []).map((listingId, index) => ({
        id: `choice-${index}`,
        listingId,
        createdAt: new Date(`2026-06-18T00:00:0${index}.000Z`),
      })),
    ),
  };
  const monitoringService = {
    recordFailure: jest.fn(),
    recordWarning: jest.fn(),
  };
  const service = new AgencyLimitDowngradeEnforcementService(
    agencyRepo as never,
    agentRepo as never,
    listingRepo as never,
    activityRepo as never,
    retainedListingChoiceRepo as never,
    { getEntitlements: jest.fn().mockReturnValue(entitlements) } as never,
    new AgencyLimitEnforcementService(),
    monitoringService as never,
  );

  return {
    service,
    agency,
    agencyRepo,
    agentRepo,
    listingRepo,
    activityRepo,
    retainedListingChoiceRepo,
    monitoringService,
  };
}

describe('AgencyLimitDowngradeEnforcementService', () => {
  it('continues expired grace period enforcement when one agency fails', async () => {
    const firstAgency = buildAgency({ id: 'agency-failing' });
    const secondAgency = buildAgency({ id: 'agency-success' });
    const { service, monitoringService } = buildService({});
    const error = new Error('enforcement failed');

    jest.spyOn(service, 'enforceAgencyListingLimit').mockImplementation(
      async (agencyId) => {
        if (agencyId === firstAgency.id) {
          throw error;
        }

        return {
          agencyId,
          status: 'skipped_within_limit',
          limit: 2,
          activeListingsUsage: 1,
          keptListingIds: ['listing-1'],
          excessListingIds: [],
          archivedListingIds: [],
          unpublishedListingIds: [],
        };
      },
    );
    (service as never as { agencyRepo: { createQueryBuilder: jest.Mock } })
      .agencyRepo.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([firstAgency, secondAgency]),
      });

    const results = await service.enforceExpiredListingGracePeriods(
      new Date('2026-06-20T00:00:00.000Z'),
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ agencyId: secondAgency.id });
    expect(monitoringService.recordFailure).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_agency_enforcement_failed',
      error,
      { agencyId: firstAgency.id },
    );
  });

  it('skips enforcement while grace period is still active', async () => {
    const { service, listingRepo } = buildService({
      agency: buildAgency({
        limitGraceEndsAt: new Date('2026-06-25T00:00:00.000Z'),
      }),
    });

    const result = await service.enforceAgencyListingLimit('agency-1', {
      now: new Date('2026-06-19T12:00:00.000Z'),
    });

    expect(result.status).toBe('skipped_grace_active');
    expect(listingRepo.find).not.toHaveBeenCalled();
  });

  it('skips enforcement when usage fits the plan limit', async () => {
    const listings = [
      buildListing({ id: 'listing-1' }),
      buildListing({ id: 'listing-2' }),
    ];
    const { service, listingRepo } = buildService({ listings });

    const result = await service.enforceAgencyListingLimit('agency-1', {
      now: new Date('2026-06-20T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'skipped_within_limit',
      activeListingsUsage: 2,
      keptListingIds: ['listing-1', 'listing-2'],
    });
    expect(listingRepo.update).not.toHaveBeenCalled();
  });

  it('archives excess listings after grace period and unpublishes public excess', async () => {
    const listings = [
      buildListing({
        id: 'old-published',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      }),
      buildListing({
        id: 'new-published',
        createdAt: new Date('2026-06-10T00:00:00.000Z'),
      }),
      buildListing({
        id: 'premium-published',
        isPremium: true,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
      buildListing({
        id: 'draft-excess',
        publicationStatus: ListingPublicationStatus.DRAFT,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      }),
    ];
    const { service, agencyRepo, listingRepo, activityRepo, monitoringService } =
      buildService({ listings });

    const result = await service.enforceAgencyListingLimit('agency-1', {
      now: new Date('2026-06-20T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'enforced',
      limit: 2,
      activeListingsUsage: 4,
      keptListingIds: ['premium-published', 'new-published'],
      excessListingIds: ['old-published', 'draft-excess'],
      archivedListingIds: ['old-published', 'draft-excess'],
      unpublishedListingIds: ['old-published'],
    });
    expect(listingRepo.update).toHaveBeenCalledTimes(1);
    expect(listingRepo.update).toHaveBeenCalledWith(
      { id: expect.any(Object) },
      expect.objectContaining({
        status: ListingStatus.ARCHIVED,
        publicationStatus: ListingPublicationStatus.UNPUBLISHED,
        unpublishedAt: new Date('2026-06-20T00:00:00.000Z'),
      }),
    );
    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        limitGraceEnforcedAt: new Date('2026-06-20T00:00:00.000Z'),
      }),
    );
    expect(activityRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({
        agentId: 'agent-1',
        entityId: 'old-published',
        action: 'archived',
        description:
          'Oferta została automatycznie zarchiwizowana po zakończeniu karencji limitu planu.',
      }),
      expect.objectContaining({
        agentId: 'agent-1',
        entityId: 'draft-excess',
        action: 'archived',
      }),
    ]);
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_enforced',
      expect.objectContaining({
        agencyId: 'agency-1',
        limit: 2,
        usage: 4,
        excessCount: 2,
        archivedCount: 2,
        unpublishedCount: 1,
      }),
    );
  });

  it('keeps retained listing choices before applying fallback ordering', async () => {
    const listings = [
      buildListing({
        id: 'old-published',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      }),
      buildListing({
        id: 'new-published',
        createdAt: new Date('2026-06-10T00:00:00.000Z'),
      }),
      buildListing({
        id: 'premium-published',
        isPremium: true,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      }),
    ];
    const { service } = buildService({
      listings,
      retainedListingIds: ['old-published'],
    });

    const result = await service.enforceAgencyListingLimit('agency-1', {
      now: new Date('2026-06-20T00:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'enforced',
      keptListingIds: ['old-published', 'premium-published'],
      archivedListingIds: ['new-published'],
    });
  });
});
