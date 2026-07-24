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

const OWNER_PRIVATE_KEYS = [
  'ownerUser',
  'ownerUserId',
  'ownerEmail',
  'ownerPhone',
  'contactEmail',
  'contactPhone',
];
const EXACT_ADDRESS_KEYS = ['street', 'postalCode', 'lat', 'lng'];
const LISTING_AGENT_PROPOSAL_KEYS = [
  'proposals',
  'listingAgentProposals',
  'acceptedTermsSnapshot',
  'commissionType',
  'commissionValue',
  'minimumContractMonths',
  'exclusivity',
  'marketingPlan',
  'valuationOpinion',
  'availability',
  'message',
];

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
    ownerUser: {
      id: 'owner-1',
      email: 'owner@example.test',
    },
    ownerEmail: 'owner@example.test',
    ownerPhone: '+48123123123',
    contactEmail: 'owner@example.test',
    contactPhone: '+48123123123',
    address: {
      city: 'Warszawa',
      district: 'Mokotów',
      voivodeship: 'mazowieckie',
      street: 'Prywatna 10',
      postalCode: '00-001',
      lat: 52.1,
      lng: 21.1,
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
      phone: '+48999888777',
      agency: {
        id: 'agency-2',
        name: 'Nowak Estate',
        logoUrl: null,
      },
    },
    listingAgentProposals: [
      {
        id: 'proposal-1',
        commissionType: 'percentage',
        commissionValue: '2.00',
        minimumContractMonths: 3,
        exclusivity: 'exclusive',
        marketingPlan: 'Prywatny plan marketingowy',
        valuationOpinion: 'Prywatna wycena',
        availability: 'Prywatna dostępność',
        message: 'Prywatna wiadomość agenta',
      },
    ],
    proposals: [
      {
        id: 'proposal-2',
        acceptedTermsSnapshot: {
          commissionType: 'fixed',
          commissionValue: '9000.00',
        },
      },
    ],
    ...overrides,
  } as Listing;
}

function createListingQueryBuilder(
  listings: Listing[],
  total = listings.length,
) {
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

  it('does not expose owner private, exact address or proposal fields in the agent market payload', async () => {
    const listing = buildListing();
    const { service } = buildService({ listings: [listing] });

    const result = await service.findAll(USER_ID, { page: 1, limit: 24 });
    const payload = result.data[0];

    expect(payload).not.toContainOwnerPrivateFields();
    expect(payload).not.toContainExactAddressFields();
    expect(payload).not.toContainListingAgentProposalFields();
    expect(payload.agent).not.toHaveProperty('phone');
    expect(payload.address).toEqual({
      city: 'Warszawa',
      district: 'Mokotów',
      voivodeship: 'mazowieckie',
    });
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

expect.extend({
  toContainOwnerPrivateFields(received: unknown) {
    const foundKeys = findKeys(received, OWNER_PRIVATE_KEYS);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain owner private fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain owner private fields',
    };
  },
  toContainExactAddressFields(received: unknown) {
    const foundKeys = findKeys(received, EXACT_ADDRESS_KEYS);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain exact address fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain exact address fields',
    };
  },
  toContainListingAgentProposalFields(received: unknown) {
    const foundKeys = findKeys(received, LISTING_AGENT_PROPOSAL_KEYS);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain listing agent proposal fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain listing agent proposal fields',
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainOwnerPrivateFields(): R;
      toContainExactAddressFields(): R;
      toContainListingAgentProposalFields(): R;
    }
  }
}

function findKeys(value: unknown, keys: string[], path = '$'): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findKeys(item, keys, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nestedValue]) => {
      const currentPath = `${path}.${key}`;
      const matches = keys.includes(key) ? [currentPath] : [];
      return [...matches, ...findKeys(nestedValue, keys, currentPath)];
    },
  );
}

const USER_ID = '11111111-1111-4111-8111-111111111111';
