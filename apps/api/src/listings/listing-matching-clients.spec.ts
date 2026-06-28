import {
  ClientSource,
  ClientStatus,
  ListingStatus,
  PropertyType,
  TransactionType,
} from '../common/enums';
import { MatchingService } from '../matching';
import { ListingsService } from './listings.service';

describe('ListingsService matching clients', () => {
  it('returns agent-scoped active CRM clients sorted by score', async () => {
    const listingRepo = {
      findOne: jest.fn().mockResolvedValue(
        buildListing({
          id: 'listing-1',
          price: 800000,
          areaM2: 60,
          rooms: 3,
        }),
      ),
    };
    const clientRepo = {
      find: jest.fn().mockResolvedValue([
        buildClient({
          id: 'client-low',
          preference: {
            propertyType: PropertyType.HOUSE,
            preferredCity: 'Kraków',
            minArea: 80,
            maxPrice: 950000,
            minRooms: 4,
          },
        }),
        buildClient({
          id: 'client-best',
          preference: {
            propertyType: PropertyType.APARTMENT,
            preferredCity: 'Warszawa',
            minArea: 50,
            maxPrice: 900000,
            minRooms: 2,
          },
        }),
        buildClient({
          id: 'client-over-budget',
          budgetMax: 700000,
          preference: {
            propertyType: PropertyType.APARTMENT,
            preferredCity: 'Warszawa',
            minArea: 50,
            maxPrice: 700000,
            minRooms: 2,
          },
        }),
      ]),
    };

    const service = buildService({ listingRepo, clientRepo });

    const result = await service.findMatchingClients('listing-1', 'user-1');

    expect(clientRepo.find).toHaveBeenCalledWith({
      where: {
        agentId: 'agent-1',
        status: expect.any(Object),
      },
      relations: ['preference'],
    });
    expect(result.map((item) => item.client.id)).toEqual([
      'client-best',
      'client-low',
    ]);
    expect(result[0]?.score).toBeGreaterThan(result[1]?.score ?? 0);
    expect(result[0]?.client.email).toBe('client@example.com');
    expect(result[0]?.reasons.length).toBeLessThanOrEqual(3);
  });

  it('rejects access to listings from another agent scope', async () => {
    const clientRepo = {
      find: jest.fn(),
    };
    const service = buildService({
      listingRepo: {
        findOne: jest.fn().mockResolvedValue(
          buildListing({
            id: 'listing-1',
            agentId: 'other-agent',
          }),
        ),
      },
      clientRepo,
    });

    await expect(
      service.findMatchingClients('listing-1', 'user-1'),
    ).rejects.toThrow('Brak dostępu do tej oferty');
    expect(clientRepo.find).not.toHaveBeenCalled();
  });

  it('filters dismissed client matches', async () => {
    const clientRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          buildClient({ id: 'client-visible' }),
          buildClient({ id: 'client-dismissed' }),
        ]),
    };
    const matchingDismissalRepo = {
      find: jest.fn().mockResolvedValue([{ clientId: 'client-dismissed' }]),
    };
    const service = buildService({ clientRepo, matchingDismissalRepo });

    const result = await service.findMatchingClients('listing-1', 'user-1');

    expect(matchingDismissalRepo.find).toHaveBeenCalledWith({
      where: { agentId: 'agent-1', listingId: 'listing-1' },
      select: ['clientId'],
    });
    expect(result.map((item) => item.client.id)).toEqual(['client-visible']);
  });

  it('dismisses a client match only inside the listing scope', async () => {
    const matchingDismissalRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input) => input),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = buildService({
      clientRepo: {
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(buildClient({ id: 'client-1' })),
      },
      matchingDismissalRepo,
    });

    await service.dismissMatchingClient('listing-1', 'client-1', 'user-1');

    expect(matchingDismissalRepo.save).toHaveBeenCalledWith({
      agentId: 'agent-1',
      clientId: 'client-1',
      listingId: 'listing-1',
    });
  });
});

function buildService({
  listingRepo = {
    findOne: jest.fn().mockResolvedValue(buildListing()),
  },
  clientRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  },
  matchingDismissalRepo,
}: {
  listingRepo?: { findOne: jest.Mock };
  clientRepo?: { find?: jest.Mock; findOne?: jest.Mock };
  matchingDismissalRepo?: {
    find?: jest.Mock;
    findOne?: jest.Mock;
    create?: jest.Mock;
    save?: jest.Mock;
  };
}) {
  return new ListingsService(
    listingRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {
      resolveAgentForUser: jest.fn().mockResolvedValue({ id: 'agent-1' }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    clientRepo as never,
    new MatchingService(),
    matchingDismissalRepo as never,
  );
}

function buildListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    title: 'Mieszkanie testowe',
    agentId: 'agent-1',
    status: ListingStatus.ACTIVE,
    propertyType: PropertyType.APARTMENT,
    transactionType: TransactionType.SALE,
    price: 800000,
    currency: 'PLN',
    areaM2: 60,
    rooms: 3,
    address: {
      city: 'Warszawa',
      district: 'Mokotów',
    },
    images: [],
    ...overrides,
  };
}

function buildClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-1',
    firstName: 'Anna',
    lastName: 'Nowak',
    email: 'client@example.com',
    phone: '500500500',
    source: ClientSource.WEBSITE,
    status: ClientStatus.ACTIVE,
    agentId: 'agent-1',
    budgetMin: null,
    budgetMax: 900000,
    preference: {
      propertyType: PropertyType.APARTMENT,
      preferredCity: 'Warszawa',
      minArea: 50,
      maxPrice: 900000,
      minRooms: 2,
    },
    ...overrides,
  };
}
