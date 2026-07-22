import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import {
  AgencyPlan,
  ListingAgentCollaborationMode,
  ListingAgentCollaborationStatus,
  ListingAgentProposalCommissionType,
  ListingAgentProposalStatus,
  ListingPublicationStatus,
  ListingStatus,
  PropertyType,
  SubscriptionStatus,
  TransactionType,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { ListingAgentProposal } from './entities';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

function buildAccess(agentListingMarket = true) {
  return {
    agent: {
      id: AGENT_ID,
      firstName: 'Jan',
      lastName: 'Agent',
      agency: {
        id: AGENCY_ID,
        name: 'Dobra Agencja',
        logoUrl: null,
      },
    },
    agency: {
      id: AGENCY_ID,
      name: 'Dobra Agencja',
      logoUrl: null,
    },
    user: { id: USER_ID },
    agencyAgentIds: [AGENT_ID],
    entitlements: {
      plan: {
        code: agentListingMarket ? AgencyPlan.STARTER : AgencyPlan.FREE,
        label: agentListingMarket ? 'Starter' : 'Free',
        status: SubscriptionStatus.ACTIVE,
      },
      limits: {
        activeListings: 25,
        clients: 250,
        monthlyAppointments: 150,
        users: 1,
        imagesPerListing: 30,
      },
      features: {
        reportsOverview: true,
        reportsListingsBasic: true,
        reportsClientsBasic: true,
        reportsAppointmentsBasic: true,
        publicListings: true,
        publicLeadForms: true,
        agentListingMarket,
        customBranding: false,
        multiUser: false,
        customDomain: false,
        apiAccess: false,
        dedicatedSupport: false,
      },
    },
  };
}

function buildListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: LISTING_ID,
    title: 'Mieszkanie testowe',
    publicTitle: 'Publiczne mieszkanie testowe',
    propertyType: PropertyType.APARTMENT,
    transactionType: TransactionType.SALE,
    price: 500000,
    currency: 'PLN',
    showPriceOnPublicPage: true,
    publicSlug: 'publiczne-mieszkanie-testowe',
    publishedAt: new Date('2026-07-01T00:00:00.000Z'),
    expiresAt: null,
    status: ListingStatus.ACTIVE,
    publicationStatus: ListingPublicationStatus.PUBLISHED,
    agentId: OTHER_AGENT_ID,
    ownerUserId: OWNER_ID,
    agentCollaborationEnabled: true,
    agentCollaborationMode: ListingAgentCollaborationMode.SINGLE_AGENT,
    agentCollaborationStatus: ListingAgentCollaborationStatus.OPEN,
    agentCollaborationPreferences: {},
    agentCollaborationOpenedAt: new Date('2026-07-02T00:00:00.000Z'),
    ownerUser: {
      id: OWNER_ID,
      email: 'owner@example.test',
    },
    address: {
      city: 'Warszawa',
      district: 'Mokotow',
    },
  } as Listing;
}

function buildProposal(
  overrides: Partial<ListingAgentProposal> = {},
): ListingAgentProposal {
  return {
    id: PROPOSAL_ID,
    listingId: LISTING_ID,
    ownerUserId: OWNER_ID,
    agentId: AGENT_ID,
    agencyId: AGENCY_ID,
    status: ListingAgentProposalStatus.SENT,
    commissionType: ListingAgentProposalCommissionType.PERCENTAGE,
    commissionValue: 2,
    minimumContractMonths: 3,
    exclusivity: null,
    services: ['Zdjecia', 'Portale'],
    marketingPlan: 'Plan promocji',
    valuationOpinion: null,
    proposedPrice: 510000,
    availability: null,
    message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
    validUntil: null,
    acceptedAt: null,
    rejectedAt: null,
    withdrawnAt: null,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    listing: buildListing(),
    agent: buildAccess(true).agent,
    agency: buildAccess(true).agency,
    ...overrides,
  } as ListingAgentProposal;
}

function createListingQueryBuilder(listing: Listing | null) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(listing),
  };
}

function createProposalQueryBuilder(
  proposals: ListingAgentProposal[],
  total = proposals.length,
) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([proposals, total]),
  };
}

function buildService({
  access = buildAccess(true),
  listing = buildListing(),
  existingProposal = null,
  ownedProposal = buildProposal(),
  queryProposals = [buildProposal()],
}: {
  access?: ReturnType<typeof buildAccess>;
  listing?: Listing | null;
  existingProposal?: ListingAgentProposal | null;
  ownedProposal?: ListingAgentProposal | null;
  queryProposals?: ListingAgentProposal[];
} = {}) {
  const listingQb = createListingQueryBuilder(listing);
  const proposalQb = createProposalQueryBuilder(queryProposals);
  const proposalRepo = {
    findOne: jest.fn(async (options: { where?: Record<string, unknown> }) =>
      options.where && 'listingId' in options.where
        ? existingProposal
        : ownedProposal,
    ),
    create: jest.fn((input) => input),
    save: jest.fn(async (proposal) => ({
      ...proposal,
      id: proposal.id ?? PROPOSAL_ID,
      createdAt: proposal.createdAt ?? new Date('2026-07-03T00:00:00.000Z'),
      updatedAt: new Date('2026-07-04T00:00:00.000Z'),
    })),
    createQueryBuilder: jest.fn().mockReturnValue(proposalQb),
  };
  const listingRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(listingQb),
  };
  const usersService = {
    getAgencyAccessContext: jest.fn().mockResolvedValue(access),
  };
  const emailService = {
    send: jest.fn().mockResolvedValue(undefined),
  };
  const configService = {
    get: jest.fn((_key: string, fallback?: unknown) => fallback),
  };
  const service = new ListingAgentProposalsService(
    proposalRepo as never,
    listingRepo as never,
    usersService as never,
    emailService as never,
    configService as never,
  );

  return {
    service,
    proposalRepo,
    listingRepo,
    usersService,
    emailService,
    listingQb,
    proposalQb,
  };
}

describe('ListingAgentProposalsService', () => {
  it('creates a sent proposal for an open collaboration listing and notifies the owner', async () => {
    const listing = buildListing();
    const { service, proposalRepo, listingQb, emailService } = buildService({
      listing,
      existingProposal: null,
    });

    const result = await service.createForListing(USER_ID, LISTING_ID, {
      commissionType: ListingAgentProposalCommissionType.PERCENTAGE,
      commissionValue: 2,
      services: [' Zdjecia ', 'Portale', 'Zdjecia'],
      message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
    });

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.agentId != :agentId',
      { agentId: AGENT_ID },
    );
    expect(proposalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: LISTING_ID,
        ownerUserId: OWNER_ID,
        agentId: AGENT_ID,
        agencyId: AGENCY_ID,
        status: ListingAgentProposalStatus.SENT,
        services: ['Zdjecia', 'Portale'],
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.test',
        subject: expect.stringContaining('Nowa oferta współpracy'),
      }),
    );
    expect(result).toMatchObject({
      id: PROPOSAL_ID,
      listingId: LISTING_ID,
      status: ListingAgentProposalStatus.SENT,
      listing: {
        slug: 'publiczne-mieszkanie-testowe',
        price: 500000,
      },
      agent: {
        id: AGENT_ID,
      },
    });
  });

  it('blocks free plans before checking listing availability', async () => {
    const { service, listingRepo } = buildService({
      access: buildAccess(false),
    });

    await expect(
      service.createForListing(USER_ID, LISTING_ID, {
        commissionType: ListingAgentProposalCommissionType.PERCENTAGE,
        commissionValue: 2,
        services: ['Portale'],
        message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
      }),
    ).rejects.toBeInstanceOf(FeatureAccessDeniedException);
    expect(listingRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('returns not found when the listing is not open for agent proposals', async () => {
    const { service } = buildService({ listing: null });

    await expect(
      service.createForListing(USER_ID, LISTING_ID, {
        commissionType: ListingAgentProposalCommissionType.PERCENTAGE,
        commissionValue: 2,
        services: ['Portale'],
        message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks another active proposal from the same agent for the same listing', async () => {
    const { service } = buildService({
      existingProposal: buildProposal(),
    });

    await expect(
      service.createForListing(USER_ID, LISTING_ID, {
        commissionType: ListingAgentProposalCommissionType.PERCENTAGE,
        commissionValue: 2,
        services: ['Portale'],
        message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps unique index races to duplicate proposal conflict', async () => {
    const { service, proposalRepo } = buildService({
      existingProposal: null,
    });
    const driverError = { code: '23505' } as Error & { code: string };
    proposalRepo.save.mockRejectedValueOnce(
      new QueryFailedError('INSERT listing_agent_proposals', [], driverError),
    );

    await expect(
      service.createForListing(USER_ID, LISTING_ID, {
        commissionType: ListingAgentProposalCommissionType.PERCENTAGE,
        commissionValue: 2,
        services: ['Portale'],
        message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates commission details consistently with commission type', async () => {
    const { service } = buildService();

    await expect(
      service.createForListing(USER_ID, LISTING_ID, {
        commissionType: ListingAgentProposalCommissionType.NONE,
        commissionValue: 1000,
        services: ['Portale'],
        message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists proposals sent by the current agent', async () => {
    const proposal = buildProposal();
    const { service, proposalQb } = buildService({
      queryProposals: [proposal],
    });

    const result = await service.findForAgent(USER_ID, {
      status: ListingAgentProposalStatus.SENT,
      page: 2,
      limit: 5,
      sortBy: 'updatedAt',
      sortOrder: 'ASC',
    });

    expect(proposalQb.where).toHaveBeenCalledWith(
      'proposal.agentId = :agentId',
      { agentId: AGENT_ID },
    );
    expect(proposalQb.andWhere).toHaveBeenCalledWith(
      'proposal.status = :status',
      { status: ListingAgentProposalStatus.SENT },
    );
    expect(proposalQb.orderBy).toHaveBeenCalledWith('proposal.updatedAt', 'ASC');
    expect(proposalQb.skip).toHaveBeenCalledWith(5);
    expect(proposalQb.take).toHaveBeenCalledWith(5);
    expect(result.data).toHaveLength(1);
    expect(result.meta).toMatchObject({
      total: 1,
      page: 2,
      limit: 5,
      totalPages: 1,
      sort: 'updatedAt:ASC',
    });
  });

  it('updates editable agent proposal and marks it as updated', async () => {
    const proposal = buildProposal();
    const { service, proposalRepo } = buildService({ ownedProposal: proposal });

    const result = await service.updateForAgent(USER_ID, PROPOSAL_ID, {
      commissionType: ListingAgentProposalCommissionType.FIXED,
      commissionValue: 8000,
      message: 'Aktualizuje warunki wspolpracy z wlascicielem.',
    });

    expect(proposalRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ListingAgentProposalStatus.UPDATED,
        commissionType: ListingAgentProposalCommissionType.FIXED,
        commissionValue: 8000,
      }),
    );
    expect(result.status).toBe(ListingAgentProposalStatus.UPDATED);
  });

  it('does not update terminal proposals', async () => {
    const { service } = buildService({
      ownedProposal: buildProposal({
        status: ListingAgentProposalStatus.ACCEPTED,
      }),
    });

    await expect(
      service.updateForAgent(USER_ID, PROPOSAL_ID, {
        message: 'Aktualizuje warunki wspolpracy z wlascicielem.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('withdraws active proposal sent by the current agent', async () => {
    const proposal = buildProposal();
    const { service, proposalRepo } = buildService({ ownedProposal: proposal });

    const result = await service.withdrawForAgent(USER_ID, PROPOSAL_ID);

    expect(proposalRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ListingAgentProposalStatus.WITHDRAWN,
        withdrawnAt: expect.any(Date),
      }),
    );
    expect(result.status).toBe(ListingAgentProposalStatus.WITHDRAWN);
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const AGENT_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_AGENT_ID = '33333333-3333-4333-8333-333333333333';
const AGENCY_ID = '44444444-4444-4444-8444-444444444444';
const OWNER_ID = '55555555-5555-4555-8555-555555555555';
const LISTING_ID = '66666666-6666-4666-8666-666666666666';
const PROPOSAL_ID = '77777777-7777-4777-8777-777777777777';
