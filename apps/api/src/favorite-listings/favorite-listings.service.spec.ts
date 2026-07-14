import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  ListingPublicationStatus,
  ListingStatus,
  PropertyType,
  TransactionType,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { FavoriteListing } from './entities';
import { FavoriteListingsService } from './favorite-listings.service';

describe('FavoriteListingsService', () => {
  let favoriteRepo: MockRepository;
  let listingRepo: MockRepository;
  let service: FavoriteListingsService;

  beforeEach(() => {
    favoriteRepo = createMockRepository();
    listingRepo = createMockRepository();
    service = new FavoriteListingsService(
      favoriteRepo as unknown as Repository<FavoriteListing>,
      listingRepo as unknown as Repository<Listing>,
    );
  });

  it('adds a public listing to favorites', async () => {
    mockPublicListingLookup(buildPublicListing());
    favoriteRepo.findOne.mockResolvedValue(null);
    favoriteRepo.create.mockReturnValue(
      buildFavorite({ id: 'favorite-1' }) as FavoriteListing,
    );
    favoriteRepo.save.mockResolvedValue(
      buildFavorite({ id: 'favorite-1' }) as FavoriteListing,
    );

    await expect(
      service.addFavorite(USER_ID, LISTING_ID),
    ).resolves.toMatchObject({
      listingId: LISTING_ID,
      favoriteId: 'favorite-1',
      isFavorite: true,
    });

    expect(favoriteRepo.create).toHaveBeenCalledWith({
      userId: USER_ID,
      listingId: LISTING_ID,
    });
  });

  it('returns existing favorite when adding the same listing again', async () => {
    const existing = buildFavorite({ id: 'favorite-existing' });
    mockPublicListingLookup(buildPublicListing());
    favoriteRepo.findOne.mockResolvedValue(existing as FavoriteListing);

    await expect(
      service.addFavorite(USER_ID, LISTING_ID),
    ).resolves.toMatchObject({
      listingId: LISTING_ID,
      favoriteId: 'favorite-existing',
      isFavorite: true,
    });

    expect(favoriteRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a listing that is not publicly available', async () => {
    mockPublicListingLookup(null);

    await expect(service.addFavorite(USER_ID, LISTING_ID)).rejects.toThrow(
      NotFoundException,
    );
    expect(favoriteRepo.create).not.toHaveBeenCalled();
  });

  it('removes favorite idempotently', async () => {
    favoriteRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

    await expect(
      service.removeFavorite(USER_ID, LISTING_ID),
    ).resolves.toEqual({
      listingId: LISTING_ID,
      isFavorite: false,
    });

    expect(favoriteRepo.delete).toHaveBeenCalledWith({
      userId: USER_ID,
      listingId: LISTING_ID,
    });
  });

  it('returns requested favorite listing ids in input order for the current user', async () => {
    const queryBuilder = createFavoriteIdsQueryBuilder([
      { listingId: OTHER_LISTING_ID },
      { listingId: LISTING_ID },
    ]);
    favoriteRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      service.findFavoriteListingIds(USER_ID, [
        LISTING_ID,
        LISTING_ID,
        OTHER_LISTING_ID,
      ]),
    ).resolves.toEqual({ listingIds: [LISTING_ID, OTHER_LISTING_ID] });

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'favorite.userId = :userId',
      { userId: USER_ID },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'favorite.listingId IN (:...listingIds)',
      { listingIds: [LISTING_ID, OTHER_LISTING_ID] },
    );
  });

  it('returns an empty id list when current user has no requested favorites', async () => {
    const queryBuilder = createFavoriteIdsQueryBuilder([]);
    favoriteRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      service.findFavoriteListingIds(USER_ID, [LISTING_ID]),
    ).resolves.toEqual({
      listingIds: [],
    });
  });

  it('returns an empty favorite id list without querying when input is empty', async () => {
    await expect(service.findFavoriteListingIds(USER_ID, [])).resolves.toEqual({
      listingIds: [],
    });

    expect(favoriteRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('marks unavailable favorites in the profile list without exposing listing data', async () => {
    const unavailableFavorite = buildFavorite({
      id: 'favorite-unavailable',
      listing: {
        ...buildPublicListing(),
        publicationStatus: ListingPublicationStatus.UNPUBLISHED,
      },
    });
    const queryBuilder = createFavoritesListQueryBuilder(
      [unavailableFavorite as FavoriteListing],
      1,
    );
    favoriteRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(
      service.findUserFavorites(USER_ID, { page: 1, limit: 24 }),
    ).resolves.toMatchObject({
      data: [
        {
          id: 'favorite-unavailable',
          listingId: LISTING_ID,
          isAvailable: false,
          unavailableReason: 'not_public',
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 24,
        totalPages: 1,
      },
    });
  });

  function mockPublicListingLookup(listing: Listing | null) {
    listingRepo.createQueryBuilder.mockReturnValue(
      createPublicListingLookupQueryBuilder(listing),
    );
  }
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LISTING_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_LISTING_ID = '33333333-3333-4333-8333-333333333333';

type MockRepository = {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  findOneOrFail: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
};

function createMockRepository(): MockRepository {
  return {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
}

function createPublicListingLookupQueryBuilder(listing: Listing | null) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(listing),
  };
}

function createFavoriteIdsQueryBuilder(rows: Array<{ listingId: string }>) {
  return {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

function createFavoritesListQueryBuilder(
  favorites: FavoriteListing[],
  total: number,
) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([favorites, total]),
  };
}

function buildFavorite(
  overrides: Partial<FavoriteListing> = {},
): Partial<FavoriteListing> {
  return {
    id: 'favorite-1',
    userId: USER_ID,
    listingId: LISTING_ID,
    createdAt: new Date('2026-07-12T10:00:00.000Z'),
    listing: buildPublicListing(),
    ...overrides,
  };
}

function buildPublicListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: LISTING_ID,
    publicSlug: 'testowa-oferta',
    publicationStatus: ListingPublicationStatus.PUBLISHED,
    status: ListingStatus.ACTIVE,
    title: 'Testowa oferta',
    publicTitle: 'Publiczna testowa oferta',
    description: 'Opis',
    propertyType: PropertyType.APARTMENT,
    transactionType: TransactionType.SALE,
    price: 850000,
    currency: 'PLN',
    areaM2: 64,
    plotAreaM2: null,
    rooms: 3,
    showPriceOnPublicPage: true,
    showExactAddressOnPublicPage: false,
    estateflowBrandingEnabled: true,
    showPublicViewCount: false,
    publishedAt: new Date('2026-07-01T10:00:00.000Z'),
    expiresAt: null,
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
    updatedAt: new Date('2026-07-02T09:00:00.000Z'),
    isPremium: false,
    address: {
      id: 'address-1',
      city: 'Warszawa',
      district: 'Mokotow',
      voivodeship: 'mazowieckie',
    },
    images: [
      {
        id: 'image-1',
        url: '/uploads/listing.jpg',
        order: 0,
        isPrimary: true,
        altText: 'Testowa oferta',
      },
    ],
    agent: {
      id: 'agent-1',
      firstName: 'Anna',
      lastName: 'Agent',
      agency: {
        id: 'agency-1',
        name: 'Test Agency',
        logoUrl: null,
      },
    },
    ...overrides,
  } as Listing;
}
