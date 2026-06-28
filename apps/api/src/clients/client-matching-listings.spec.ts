import { AgencyLimitEnforcementService } from '../users/agency-limit-enforcement.service';
import { ListingStatus, PropertyType, TransactionType } from '../common/enums';
import { MatchingService } from '../matching';
import { ClientsService } from './clients.service';

describe('ClientsService matching listings', () => {
  it('returns agent-scoped active listings sorted by score', async () => {
    const clientRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'client-1',
        agentId: 'agent-1',
        budgetMax: 900000,
        preference: {
          propertyType: PropertyType.APARTMENT,
          preferredCity: 'Warszawa',
          minArea: 50,
          maxPrice: 900000,
          minRooms: 2,
        },
      }),
    };
    const listingRepo = {
      find: jest.fn().mockResolvedValue([
        buildListing({
          id: 'listing-low',
          price: 880000,
          areaM2: 52,
          rooms: 2,
          address: {
            city: 'Kraków',
            district: 'Kazimierz',
          },
        }),
        buildListing({
          id: 'listing-best',
          price: 760000,
          areaM2: 64,
          rooms: 3,
        }),
        buildListing({
          id: 'listing-too-expensive',
          price: 1200000,
        }),
      ]),
    };

    const service = buildService({ clientRepo, listingRepo });

    const result = await service.findMatchingListings('client-1', 'user-1');

    expect(listingRepo.find).toHaveBeenCalledWith({
      where: {
        agentId: 'agent-1',
        status: ListingStatus.ACTIVE,
      },
      relations: ['address'],
    });
    expect(result.map((item) => item.listing.id)).toEqual([
      'listing-best',
      'listing-low',
    ]);
    expect(result[0]?.score).toBeGreaterThan(result[1]?.score ?? 0);
    expect(result[0]?.reasons.length).toBeLessThanOrEqual(3);
  });

  it('rejects access to clients from another agent scope', async () => {
    const service = buildService({
      clientRepo: {
        findOne: jest.fn().mockResolvedValue({
          id: 'client-1',
          agentId: 'other-agent',
          preference: null,
        }),
      },
      listingRepo: {
        find: jest.fn(),
      },
    });

    await expect(
      service.findMatchingListings('client-1', 'user-1'),
    ).rejects.toThrow('Brak dostępu do tego klienta');
  });

  it('filters dismissed listing matches', async () => {
    const listingRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          buildListing({ id: 'listing-visible' }),
          buildListing({ id: 'listing-dismissed' }),
        ]),
    };
    const matchingDismissalRepo = {
      find: jest.fn().mockResolvedValue([{ listingId: 'listing-dismissed' }]),
    };
    const service = buildService({ listingRepo, matchingDismissalRepo });

    const result = await service.findMatchingListings('client-1', 'user-1');

    expect(matchingDismissalRepo.find).toHaveBeenCalledWith({
      where: { agentId: 'agent-1', clientId: 'client-1' },
      select: ['listingId'],
    });
    expect(result.map((item) => item.listing.id)).toEqual(['listing-visible']);
  });

  it('dismisses a listing match only inside the client scope', async () => {
    const matchingDismissalRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input) => input),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = buildService({
      listingRepo: {
        find: jest.fn(),
        findOne: jest.fn().mockResolvedValue(buildListing({ id: 'listing-1' })),
      },
      matchingDismissalRepo,
    });

    await service.dismissMatchingListing('client-1', 'listing-1', 'user-1');

    expect(matchingDismissalRepo.save).toHaveBeenCalledWith({
      agentId: 'agent-1',
      clientId: 'client-1',
      listingId: 'listing-1',
    });
  });
});

function buildService({
  clientRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: 'client-1',
      agentId: 'agent-1',
      budgetMax: 900000,
      preference: {
        propertyType: PropertyType.APARTMENT,
        preferredCity: 'Warszawa',
        minArea: 50,
        maxPrice: 900000,
        minRooms: 2,
      },
    }),
  },
  listingRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  },
  matchingDismissalRepo,
}: {
  clientRepo?: { findOne: jest.Mock };
  listingRepo?: { find?: jest.Mock; findOne?: jest.Mock };
  matchingDismissalRepo?: {
    find?: jest.Mock;
    findOne?: jest.Mock;
    create?: jest.Mock;
    save?: jest.Mock;
  };
}) {
  return new ClientsService(
    clientRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    listingRepo as never,
    {
      resolveAgentForUser: jest.fn().mockResolvedValue({ id: 'agent-1' }),
    } as never,
    new AgencyLimitEnforcementService(),
    {} as never,
    {} as never,
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
    ...overrides,
  };
}
