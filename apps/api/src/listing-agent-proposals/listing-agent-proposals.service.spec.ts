import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import {
  AgencyPlan,
  ListingAgentAssignmentStatus,
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
import { Address, Listing, ListingImage } from '../listings/entities';
import {
  ListingAgentAssignment,
  ListingAgentProposal,
  ListingAgentProposalMessage,
} from './entities';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

function buildAccess(agentListingMarket = true) {
  return {
    agent: {
      id: AGENT_ID,
      userId: AGENT_USER_ID,
      firstName: 'Jan',
      lastName: 'Agent',
      user: {
        id: USER_ID,
        email: 'agent@example.test',
      },
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
    images: [
      {
        id: 'image-1',
        url: 'https://cdn.example.test/image.jpg',
        order: 0,
        isPrimary: true,
        altText: 'Salon',
      },
    ],
    ...overrides,
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
    ownerUser: {
      id: OWNER_ID,
      email: 'owner@example.test',
    },
    agent: buildAccess(true).agent,
    agency: buildAccess(true).agency,
    ...overrides,
  } as ListingAgentProposal;
}

function buildMessage(
  overrides: Partial<ListingAgentProposalMessage> = {},
): ListingAgentProposalMessage {
  return {
    id: 'message-1',
    proposalId: PROPOSAL_ID,
    senderUserId: OWNER_ID,
    body: 'Dzien dobry, chcialbym doprecyzowac warunki wspolpracy.',
    readAt: null,
    metadata: {},
    createdAt: new Date('2026-07-06T00:00:00.000Z'),
    ...overrides,
  } as ListingAgentProposalMessage;
}

function buildAssignment(
  overrides: Partial<ListingAgentAssignment> = {},
): ListingAgentAssignment {
  return {
    id: 'assignment-1',
    listingId: LISTING_ID,
    proposalId: PROPOSAL_ID,
    ownerUserId: OWNER_ID,
    agentId: AGENT_ID,
    agencyId: AGENCY_ID,
    status: ListingAgentAssignmentStatus.ACTIVE,
    acceptedTermsSnapshot: {},
    agentListingId: null,
    createdAt: new Date('2026-07-05T00:00:00.000Z'),
    revokedAt: null,
    completedAt: null,
    listing: buildListing(),
    proposal: buildProposal({ status: ListingAgentProposalStatus.ACCEPTED }),
    ...overrides,
  } as ListingAgentAssignment;
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
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    getManyAndCount: jest.fn().mockResolvedValue([proposals, total]),
  };
}

function createAssignmentQueryBuilder(
  assignments: ListingAgentAssignment[],
  total = assignments.length,
) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([assignments, total]),
  };
}

function createMessageQueryBuilder(unreadCount = 0) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: unreadCount }),
    getCount: jest.fn().mockResolvedValue(unreadCount),
  };
}

function buildService({
  access = buildAccess(true),
  listing = buildListing(),
  existingProposal = null,
  ownedProposal = buildProposal(),
  queryProposals = [buildProposal()],
  queryAssignments = [buildAssignment()],
  ownedAssignment = buildAssignment(),
  activeListingCount = 0,
  messages = [buildMessage()],
  unreadCount = 0,
}: {
  access?: ReturnType<typeof buildAccess>;
  listing?: Listing | null;
  existingProposal?: ListingAgentProposal | null;
  ownedProposal?: ListingAgentProposal | null;
  queryProposals?: ListingAgentProposal[];
  queryAssignments?: ListingAgentAssignment[];
  ownedAssignment?: ListingAgentAssignment | null;
  activeListingCount?: number;
  messages?: ListingAgentProposalMessage[];
  unreadCount?: number;
} = {}) {
  const listingQb = createListingQueryBuilder(listing);
  const proposalQb = createProposalQueryBuilder(queryProposals);
  const assignmentQb = createAssignmentQueryBuilder(queryAssignments);
  const messageQb = createMessageQueryBuilder(unreadCount);
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
    findOne: jest.fn().mockResolvedValue(listing),
    count: jest.fn().mockResolvedValue(activeListingCount),
    create: jest.fn((input) => input),
    save: jest.fn(async (entity) => ({
      ...entity,
      id: entity.id ?? 'agent-listing-1',
      createdAt: entity.createdAt ?? new Date('2026-07-07T00:00:00.000Z'),
      updatedAt: entity.updatedAt ?? new Date('2026-07-07T00:00:00.000Z'),
    })),
  };
  const addressRepo = {
    create: jest.fn((input) => input),
    save: jest.fn(async (entity) => entity),
  };
  const listingImageRepo = {
    create: jest.fn((input) => input),
    save: jest.fn(async (entity) => entity),
  };
  const assignmentRepo = {
    findOne: jest.fn().mockResolvedValue(ownedAssignment),
    createQueryBuilder: jest.fn().mockReturnValue(assignmentQb),
    create: jest.fn((input) => input),
    save: jest.fn(async (assignment) => ({
      ...assignment,
      id: 'assignment-1',
      createdAt: new Date('2026-07-05T00:00:00.000Z'),
      revokedAt: null,
      completedAt: null,
    })),
  };
  const messageRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(messageQb),
    findAndCount: jest.fn().mockResolvedValue([messages, messages.length]),
    create: jest.fn((input) => input),
    save: jest.fn(async (message) => ({
      ...message,
      id: message.id ?? 'message-2',
      createdAt: message.createdAt ?? new Date('2026-07-06T01:00:00.000Z'),
    })),
  };
  const dataSource = {
    transaction: jest.fn(async (callback) =>
      callback({
        getRepository: (entity: unknown) => {
          if (entity === ListingAgentProposal) return proposalRepo;
          if (entity === Address) return addressRepo;
          if (entity === ListingImage) return listingImageRepo;
          if (
            typeof entity === 'function' &&
            entity.name === 'Listing'
          ) {
            return listingRepo;
          }
          return assignmentRepo;
        },
      }),
    ),
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
    addressRepo as never,
    listingImageRepo as never,
    assignmentRepo as never,
    messageRepo as never,
    dataSource as never,
    usersService as never,
    emailService as never,
    configService as never,
  );

  return {
    service,
    proposalRepo,
    listingRepo,
    addressRepo,
    listingImageRepo,
    assignmentRepo,
    assignmentQb,
    messageRepo,
    dataSource,
    usersService,
    emailService,
    listingQb,
    proposalQb,
    messageQb,
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

  it('lists assignments accepted for the current agent', async () => {
    const assignment = buildAssignment();
    const { service, assignmentQb } = buildService({
      queryAssignments: [assignment],
    });

    const result = await service.findAssignmentsForAgent(USER_ID, {
      status: ListingAgentAssignmentStatus.ACTIVE,
      page: 2,
      limit: 5,
      sortBy: 'createdAt',
      sortOrder: 'ASC',
    });

    expect(assignmentQb.where).toHaveBeenCalledWith(
      'assignment.agentId = :agentId',
      { agentId: AGENT_ID },
    );
    expect(assignmentQb.andWhere).toHaveBeenCalledWith(
      'assignment.status = :status',
      { status: ListingAgentAssignmentStatus.ACTIVE },
    );
    expect(assignmentQb.orderBy).toHaveBeenCalledWith(
      'assignment.createdAt',
      'ASC',
    );
    expect(assignmentQb.skip).toHaveBeenCalledWith(5);
    expect(assignmentQb.take).toHaveBeenCalledWith(5);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: assignment.id,
      listing: {
        id: LISTING_ID,
        title: 'Publiczne mieszkanie testowe',
      },
      proposal: {
        id: PROPOSAL_ID,
        status: ListingAgentProposalStatus.ACCEPTED,
      },
    });
  });

  it('creates CRM listing copy for an accepted agent assignment', async () => {
    const assignment = buildAssignment({
      listing: buildListing({
        showExactAddressOnPublicPage: false,
        address: {
          street: 'Tajna 10',
          city: 'Warszawa',
          district: 'Mokotow',
          postalCode: '00-001',
          lat: 52.1,
          lng: 21.1,
        } as never,
      }),
      proposal: buildProposal({
        status: ListingAgentProposalStatus.ACCEPTED,
        proposedPrice: 520000,
      }),
    });
    const { service, listingRepo, addressRepo, listingImageRepo, assignmentRepo } =
      buildService({
        ownedAssignment: assignment,
      });

    const result = await service.createListingCopyForAgentAssignment(
      USER_ID,
      assignment.id,
    );

    expect(listingRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: AGENT_ID,
        ownerUserId: null,
        sourceListingId: LISTING_ID,
        agentAssignmentId: assignment.id,
        status: ListingStatus.DRAFT,
        publicationStatus: ListingPublicationStatus.DRAFT,
        price: 520000,
        agentCollaborationEnabled: false,
      }),
    );
    expect(addressRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        street: undefined,
        postalCode: undefined,
        lat: undefined,
        lng: undefined,
      }),
    );
    expect(listingImageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://cdn.example.test/image.jpg',
        isPrimary: true,
      }),
    );
    expect(assignmentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        agentListingId: 'agent-listing-1',
      }),
    );
    expect(result.agentListingId).toBe('agent-listing-1');
  });

  it('blocks creating CRM listing copy twice for the same assignment', async () => {
    const { service } = buildService({
      ownedAssignment: buildAssignment({
        agentListingId: 'existing-listing-id',
      }),
    });

    await expect(
      service.createListingCopyForAgentAssignment(USER_ID, 'assignment-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks creating CRM listing copy without an active accepted assignment', async () => {
    const { service } = buildService({
      ownedAssignment: null,
    });

    await expect(
      service.createListingCopyForAgentAssignment(USER_ID, 'assignment-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks creating CRM listing copy when active listing limit is reached', async () => {
    const { service } = buildService({
      activeListingCount: 25,
    });

    await expect(
      service.createListingCopyForAgentAssignment(USER_ID, 'assignment-1'),
    ).rejects.toBeInstanceOf(PlanLimitReachedException);
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

  it('lists proposals received by the current seller', async () => {
    const { service, proposalQb } = buildService({
      queryProposals: [buildProposal()],
    });

    const result = await service.findForSeller(OWNER_ID, {
      listingId: LISTING_ID,
      page: 1,
      limit: 20,
    });

    expect(proposalQb.where).toHaveBeenCalledWith(
      'proposal.ownerUserId = :ownerUserId',
      { ownerUserId: OWNER_ID },
    );
    expect(proposalQb.andWhere).toHaveBeenCalledWith(
      'proposal.listingId = :listingId',
      { listingId: LISTING_ID },
    );
    expect(result.data).toHaveLength(1);
  });

  it('shows only seller-owned proposal details', async () => {
    const proposal = buildProposal();
    const { service, proposalRepo } = buildService({ ownedProposal: proposal });

    const result = await service.findOneForSeller(OWNER_ID, PROPOSAL_ID);

    expect(proposalRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROPOSAL_ID, ownerUserId: OWNER_ID },
      }),
    );
    expect(result.id).toBe(PROPOSAL_ID);
  });

  it('accepts seller proposal, creates assignment and closes single-agent recruitment', async () => {
    const proposal = buildProposal({
      listing: buildListing({
        agentCollaborationMode: ListingAgentCollaborationMode.SINGLE_AGENT,
      }),
    });
    const { service, proposalRepo, listingRepo, assignmentRepo, proposalQb } =
      buildService({ ownedProposal: proposal });

    const result = await service.acceptForSeller(OWNER_ID, PROPOSAL_ID);

    expect(assignmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: LISTING_ID,
        proposalId: PROPOSAL_ID,
        ownerUserId: OWNER_ID,
        agentId: AGENT_ID,
        agencyId: AGENCY_ID,
        status: ListingAgentAssignmentStatus.ACTIVE,
        acceptedTermsSnapshot: expect.objectContaining({
          proposalId: PROPOSAL_ID,
          services: ['Zdjecia', 'Portale'],
        }),
      }),
    );
    expect(proposalRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ListingAgentProposalStatus.ACCEPTED,
        acceptedAt: expect.any(Date),
      }),
    );
    expect(listingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        agentCollaborationStatus: ListingAgentCollaborationStatus.ASSIGNED,
        agentCollaborationClosedAt: expect.any(Date),
      }),
    );
    expect(proposalQb.update).toHaveBeenCalledWith(ListingAgentProposal);
    expect(result.assignment).toMatchObject({
      proposalId: PROPOSAL_ID,
      status: ListingAgentAssignmentStatus.ACTIVE,
    });
  });

  it('keeps multi-agent recruitment open after accepting a proposal', async () => {
    const proposal = buildProposal({
      listing: buildListing({
        agentCollaborationMode: ListingAgentCollaborationMode.MULTI_AGENT,
      }),
    });
    const { service, listingRepo, proposalQb } = buildService({
      ownedProposal: proposal,
    });

    await service.acceptForSeller(OWNER_ID, PROPOSAL_ID);

    expect(listingRepo.save).not.toHaveBeenCalled();
    expect(proposalQb.update).not.toHaveBeenCalled();
  });

  it('rejects seller proposal and notifies the agent', async () => {
    const proposal = buildProposal();
    const { service, proposalRepo, emailService } = buildService({
      ownedProposal: proposal,
    });

    const result = await service.rejectForSeller(OWNER_ID, PROPOSAL_ID);

    expect(proposalRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ListingAgentProposalStatus.REJECTED,
        rejectedAt: expect.any(Date),
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'agent@example.test',
        subject: expect.stringContaining('odrzucił'),
      }),
    );
    expect(result.assignment).toBeNull();
  });

  it('closes recruitment for an owned listing without changing existing proposals', async () => {
    const listing = buildListing();
    const { service, listingRepo, proposalRepo } = buildService({ listing });

    const result = await service.closeRecruitmentForSeller(OWNER_ID, LISTING_ID);

    expect(listingRepo.findOne).toHaveBeenCalledWith({
      where: { id: LISTING_ID, ownerUserId: OWNER_ID },
    });
    expect(listingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        agentCollaborationStatus: ListingAgentCollaborationStatus.CLOSED,
        agentCollaborationClosedAt: expect.any(Date),
      }),
    );
    expect(proposalRepo.save).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      listingId: LISTING_ID,
      agentCollaborationEnabled: true,
      agentCollaborationStatus: ListingAgentCollaborationStatus.CLOSED,
    });
  });

  it('blocks closing already closed recruitment', async () => {
    const { service } = buildService({
      listing: buildListing({
        agentCollaborationStatus: ListingAgentCollaborationStatus.CLOSED,
      }),
    });

    await expect(
      service.closeRecruitmentForSeller(OWNER_ID, LISTING_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reopens recruitment for an owned public listing', async () => {
    const listing = buildListing({
      agentCollaborationStatus: ListingAgentCollaborationStatus.CLOSED,
      agentCollaborationClosedAt: new Date('2026-07-04T00:00:00.000Z'),
    });
    const { service, listingRepo } = buildService({ listing });

    const result = await service.reopenRecruitmentForSeller(OWNER_ID, LISTING_ID);

    expect(listingRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        agentCollaborationEnabled: true,
        agentCollaborationStatus: ListingAgentCollaborationStatus.OPEN,
        agentCollaborationOpenedAt: expect.any(Date),
        agentCollaborationClosedAt: null,
      }),
    );
    expect(result).toMatchObject({
      listingId: LISTING_ID,
      agentCollaborationEnabled: true,
      agentCollaborationStatus: ListingAgentCollaborationStatus.OPEN,
      agentCollaborationClosedAt: null,
    });
  });

  it('blocks reopening recruitment for a non-public listing', async () => {
    const { service } = buildService({
      listing: buildListing({
        agentCollaborationStatus: ListingAgentCollaborationStatus.CLOSED,
        publicationStatus: ListingPublicationStatus.DRAFT,
      }),
    });

    await expect(
      service.reopenRecruitmentForSeller(OWNER_ID, LISTING_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found when seller controls a listing they do not own', async () => {
    const { service } = buildService({ listing: null });

    await expect(
      service.closeRecruitmentForSeller(OWNER_ID, LISTING_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists proposal messages for a participant and marks received messages as read', async () => {
    const message = buildMessage({
      senderUserId: AGENT_USER_ID,
      body: 'Moge przygotowac profesjonalny plan sprzedazy.',
    });
    const { service, messageRepo, messageQb } = buildService({
      messages: [message],
      unreadCount: 1,
      ownedProposal: buildProposal(),
    });

    const result = await service.findMessages(OWNER_ID, PROPOSAL_ID, {
      page: 1,
      limit: 50,
    });

    expect(messageRepo.findAndCount).toHaveBeenCalledWith({
      where: { proposalId: PROPOSAL_ID },
      order: { createdAt: 'ASC', id: 'ASC' },
      skip: 0,
      take: 50,
    });
    expect(messageQb.update).toHaveBeenCalledWith(ListingAgentProposalMessage);
    expect(result.data[0]).toMatchObject({
      id: 'message-1',
      senderUserId: AGENT_USER_ID,
      senderRole: 'agent',
    });
    expect(result.meta.unreadCount).toBe(1);
  });

  it('sends proposal message as an agent participant and notifies the owner', async () => {
    const { service, messageRepo, emailService } = buildService({
      ownedProposal: buildProposal(),
    });

    const result = await service.createMessage(AGENT_USER_ID, PROPOSAL_ID, {
      body: 'Dzien dobry, moge zaczac od audytu ceny i promocji.',
    });

    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: PROPOSAL_ID,
        senderUserId: AGENT_USER_ID,
        body: 'Dzien dobry, moge zaczac od audytu ceny i promocji.',
        readAt: null,
        metadata: { senderRole: 'agent' },
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@example.test',
        subject: expect.stringContaining('Nowa wiadomość'),
      }),
    );
    expect(result).toMatchObject({
      senderUserId: AGENT_USER_ID,
      senderRole: 'agent',
    });
  });

  it('blocks proposal messages from users outside the proposal participants', async () => {
    const { service } = buildService({ ownedProposal: buildProposal() });

    await expect(
      service.createMessage('not-participant', PROPOSAL_ID, {
        body: 'Nie powinienem miec dostepu do tego watku.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks empty proposal messages after trimming', async () => {
    const { service } = buildService({ ownedProposal: buildProposal() });

    await expect(
      service.createMessage(OWNER_ID, PROPOSAL_ID, { body: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks sending messages in a closed proposal', async () => {
    const { service } = buildService({
      ownedProposal: buildProposal({
        status: ListingAgentProposalStatus.CLOSED,
      }),
    });

    await expect(
      service.createMessage(OWNER_ID, PROPOSAL_ID, {
        body: 'Ta wiadomosc nie powinna zostac wyslana.',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const AGENT_USER_ID = USER_ID;
const AGENT_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_AGENT_ID = '33333333-3333-4333-8333-333333333333';
const AGENCY_ID = '44444444-4444-4444-8444-444444444444';
const OWNER_ID = '55555555-5555-4555-8555-555555555555';
const LISTING_ID = '66666666-6666-4666-8666-666666666666';
const PROPOSAL_ID = '77777777-7777-4777-8777-777777777777';
