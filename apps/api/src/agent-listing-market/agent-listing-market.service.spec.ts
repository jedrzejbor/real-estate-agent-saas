import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import {
  AgencyPlan,
  ListingAgentCollaborationMode,
  ListingAgentCollaborationStatus,
  ListingPublicationStatus,
  ListingStatus,
  PropertyType,
  SubscriptionStatus,
  TransactionType,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { AgentListingMarketService } from './agent-listing-market.service';

function buildAccess(agentListingMarket = true) {
  return {
    agent: { id: 'agent-1' },
    agency: { id: 'agency-1' },
    user: { id: USER_ID },
    agencyAgentIds: ['agent-1'],
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
    id: 'listing-1',
    title: 'Mieszkanie testowe',
    publicTitle: 'Publiczne mieszkanie testowe',
    propertyType: PropertyType.APARTMENT,
    transactionType: TransactionType.SALE,
    price: 500000,
    currency: 'PLN',
    areaM2: 50,
    plotAreaM2: null,
    rooms: 2,
    showPriceOnPublicPage: true,
    publicSlug: 'publiczne-mieszkanie-testowe',
    publishedAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    expiresAt: null,
    status: ListingStatus.ACTIVE,
    publicationStatus: ListingPublicationStatus.PUBLISHED,
    agentId: 'agent-2',
    ownerUserId: 'owner-1',
    agentCollaborationEnabled: true,
    agentCollaborationMode: ListingAgentCollaborationMode.SINGLE_AGENT,
    agentCollaborationStatus: ListingAgentCollaborationStatus.OPEN,
    agentCollaborationPreferences: {
      allowsMultipleAgents: false,
      expectedServices: ['photos', 'portals'],
    },
    agentCollaborationOpenedAt: new Date('2026-07-03T00:00:00.000Z'),
    address: {
      city: 'Warszawa',
      district: 'Mokotów',
      voivodeship: 'mazowieckie',
    },
    images: [
      {
        id: 'image-2',
        url: 'https://example.com/2.jpg',
        altText: 'Drugie zdjęcie',
        order: 2,
        isPrimary: false,
      },
      {
        id: 'image-1',
        url: 'https://example.com/1.jpg',
        altText: 'Pierwsze zdjęcie',
        order: 1,
        isPrimary: true,
      },
    ],
    agent: {
      id: 'agent-2',
      firstName: 'Anna',
      lastName: 'Nowak',
      agency: {
        id: 'agency-2',
        name: 'Nowak Estate',
        logoUrl: null,
      },
    },
    ...overrides,
  } as Listing;
}

function createListingQueryBuilder(listings: Listing[], total = listings.length) {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([listings, total]),
  };

  return qb;
}

function createProposalQueryBuilder(rows: Array<{ listingId: string }>) {
  return {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

function buildService({
  access = buildAccess(true),
  listings = [buildListing()],
  proposalRows = [],
}: {
  access?: ReturnType<typeof buildAccess>;
  listings?: Listing[];
  proposalRows?: Array<{ listingId: string }>;
} = {}) {
  const listingQb = createListingQueryBuilder(listings);
  const proposalQb = createProposalQueryBuilder(proposalRows);
  const listingRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(listingQb),
  };
  const proposalRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(proposalQb),
  };
  const usersService = {
    getAgencyAccessContext: jest.fn().mockResolvedValue(access),
  };
  const service = new AgentListingMarketService(
    listingRepo as never,
    proposalRepo as never,
    usersService as never,
  );

  return { service, listingQb, proposalQb, usersService };
}

describe('AgentListingMarketService', () => {
  it('lists open collaboration listings with safe public payload and proposal state', async () => {
    const listing = buildListing();
    const { service, listingQb, proposalQb } = buildService({
      listings: [listing],
      proposalRows: [{ listingId: listing.id }],
    });

    const result = await service.findAll(USER_ID, { page: 1, limit: 24 });

    expect(listingQb.where).toHaveBeenCalledWith(
      'listing.agentCollaborationEnabled = :enabled',
      { enabled: true },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.agentCollaborationStatus = :collaborationStatus',
      { collaborationStatus: ListingAgentCollaborationStatus.OPEN },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.agentId != :agentId',
      { agentId: 'agent-1' },
    );
    expect(proposalQb.where).toHaveBeenCalledWith(
      'proposal.agentId = :agentId',
      { agentId: 'agent-1' },
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      id: listing.id,
      slug: 'publiczne-mieszkanie-testowe',
      title: 'Publiczne mieszkanie testowe',
      hasSubmittedProposal: true,
      collaboration: {
        mode: ListingAgentCollaborationMode.SINGLE_AGENT,
        preferences: {
          allowsMultipleAgents: false,
          expectedServices: ['photos', 'portals'],
        },
      },
      address: {
        city: 'Warszawa',
        district: 'Mokotów',
      },
    });
    expect(result.data[0]).not.toHaveProperty('ownerUser');
    expect(result.data[0].primaryImage?.id).toBe('image-1');
  });

  it('applies filters and pagination without changing the public catalog endpoint', async () => {
    const { service, listingQb } = buildService();

    await service.findAll(USER_ID, {
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      collaborationMode: ListingAgentCollaborationMode.MULTI_AGENT,
      city: ' Warszawa ',
      search: ' Mokotów ',
      priceMin: 300000,
      priceMax: 700000,
      page: 2,
      limit: 10,
      sortBy: 'price',
      sortOrder: 'ASC',
    });

    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.propertyType = :propertyType',
      { propertyType: PropertyType.APARTMENT },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.transactionType = :transactionType',
      { transactionType: TransactionType.SALE },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.agentCollaborationMode = :collaborationMode',
      { collaborationMode: ListingAgentCollaborationMode.MULTI_AGENT },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'LOWER(address.city) = LOWER(:city)',
      { city: 'Warszawa' },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.price >= :priceMin',
      { priceMin: 300000 },
    );
    expect(listingQb.andWhere).toHaveBeenCalledWith(
      'listing.price <= :priceMax',
      { priceMax: 700000 },
    );
    expect(listingQb.orderBy).toHaveBeenCalledWith('listing.price', 'ASC');
    expect(listingQb.skip).toHaveBeenCalledWith(10);
    expect(listingQb.take).toHaveBeenCalledWith(10);
  });

  it('blocks free plans before querying listings', async () => {
    const { service, listingQb } = buildService({
      access: buildAccess(false),
    });

    await expect(service.findAll(USER_ID, {})).rejects.toBeInstanceOf(
      FeatureAccessDeniedException,
    );
    expect(listingQb.getManyAndCount).not.toHaveBeenCalled();
  });

  it('does not query submitted proposals for empty listing pages', async () => {
    const { service, proposalQb } = buildService({ listings: [] });

    const result = await service.findAll(USER_ID, {});

    expect(result.data).toEqual([]);
    expect(proposalQb.getRawMany).not.toHaveBeenCalled();
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
