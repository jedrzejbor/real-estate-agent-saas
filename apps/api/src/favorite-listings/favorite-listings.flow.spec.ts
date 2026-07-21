import type { DeleteResult, Repository } from 'typeorm';
import {
  ListingPublicationStatus,
  ListingStatus,
  PropertyType,
  TransactionType,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { FavoriteListing } from './entities';
import { FavoriteListingsService } from './favorite-listings.service';

describe('FavoriteListingsService flow', () => {
  it('adds a favorite, exposes it in ids and profile list, then removes it', async () => {
    const listing = buildPublicListing();
    const favorites: FavoriteListing[] = [];
    const favoriteRepo = createFavoriteListingRepository(favorites, [listing]);
    const listingRepo = createListingRepository([listing]);
    const service = new FavoriteListingsService(
      favoriteRepo as unknown as Repository<FavoriteListing>,
      listingRepo as unknown as Repository<Listing>,
    );

    await expect(
      service.addFavorite(USER_ID, LISTING_ID),
    ).resolves.toMatchObject({
      listingId: LISTING_ID,
      isFavorite: true,
    });

    await expect(
      service.findFavoriteListingIds(USER_ID, [LISTING_ID]),
    ).resolves.toEqual({
      listingIds: [LISTING_ID],
    });

    await expect(
      service.findUserFavorites(USER_ID, { page: 1, limit: 24 }),
    ).resolves.toMatchObject({
      data: [
        {
          listingId: LISTING_ID,
          isAvailable: true,
          listing: {
            id: LISTING_ID,
            slug: 'testowa-oferta',
            title: 'Publiczna testowa oferta',
          },
        },
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 24,
        totalPages: 1,
      },
    });

    await expect(
      service.removeFavorite(USER_ID, LISTING_ID),
    ).resolves.toEqual({
      listingId: LISTING_ID,
      isFavorite: false,
    });

    await expect(
      service.findFavoriteListingIds(USER_ID, [LISTING_ID]),
    ).resolves.toEqual({
      listingIds: [],
    });
    await expect(
      service.findUserFavorites(USER_ID, { page: 1, limit: 24 }),
    ).resolves.toMatchObject({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 24,
        totalPages: 0,
      },
    });
  });

  it('keeps favorite lists isolated between users through add, list and remove flow', async () => {
    const listings = [
      buildPublicListing(),
      buildPublicListing({
        id: OTHER_LISTING_ID,
        publicSlug: 'inna-testowa-oferta',
        title: 'Inna testowa oferta',
        publicTitle: 'Inna publiczna testowa oferta',
      }),
    ];
    const favorites: FavoriteListing[] = [];
    const favoriteRepo = createFavoriteListingRepository(favorites, listings);
    const listingRepo = createListingRepository(listings);
    const service = new FavoriteListingsService(
      favoriteRepo as unknown as Repository<FavoriteListing>,
      listingRepo as unknown as Repository<Listing>,
    );

    await service.addFavorite(USER_ID, LISTING_ID);
    await service.addFavorite(OTHER_USER_ID, OTHER_LISTING_ID);

    await expect(
      service.findFavoriteListingIds(USER_ID, [LISTING_ID, OTHER_LISTING_ID]),
    ).resolves.toEqual({
      listingIds: [LISTING_ID],
    });
    await expect(
      service.findUserFavorites(USER_ID, { page: 1, limit: 24 }),
    ).resolves.toMatchObject({
      data: [
        {
          listingId: LISTING_ID,
          listing: {
            id: LISTING_ID,
            slug: 'testowa-oferta',
          },
        },
      ],
      meta: {
        total: 1,
      },
    });

    await service.removeFavorite(USER_ID, LISTING_ID);

    await expect(
      service.findFavoriteListingIds(OTHER_USER_ID, [
        LISTING_ID,
        OTHER_LISTING_ID,
      ]),
    ).resolves.toEqual({
      listingIds: [OTHER_LISTING_ID],
    });
    await expect(
      service.findUserFavorites(OTHER_USER_ID, { page: 1, limit: 24 }),
    ).resolves.toMatchObject({
      data: [
        {
          listingId: OTHER_LISTING_ID,
          listing: {
            id: OTHER_LISTING_ID,
            slug: 'inna-testowa-oferta',
          },
        },
      ],
      meta: {
        total: 1,
      },
    });
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';
const LISTING_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_LISTING_ID = '33333333-3333-4333-8333-333333333333';

function createFavoriteListingRepository(
  favorites: FavoriteListing[],
  listings: Listing[],
) {
  let nextFavoriteNumber = 1;

  return {
    createQueryBuilder: () =>
      createFavoriteListingQueryBuilder(favorites, listings),
    findOne: jest.fn(async ({ where }: { where: FavoriteWhere }) =>
      favorites.find(
        (favorite) =>
          favorite.userId === where.userId &&
          favorite.listingId === where.listingId,
      ) ?? null,
    ),
    findOneOrFail: jest.fn(async ({ where }: { where: FavoriteWhere }) => {
      const favorite = favorites.find(
        (item) =>
          item.userId === where.userId && item.listingId === where.listingId,
      );

      if (!favorite) {
        throw new Error('Favorite not found');
      }

      return favorite;
    }),
    create: jest.fn((input: FavoriteWhere) => input),
    save: jest.fn(async (input: FavoriteWhere) => {
      const listing = listings.find((item) => item.id === input.listingId);
      const favorite = {
        id: `favorite-${nextFavoriteNumber++}`,
        userId: input.userId,
        listingId: input.listingId,
        listing,
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
      } as FavoriteListing;

      favorites.push(favorite);
      return favorite;
    }),
    delete: jest.fn(async (where: FavoriteWhere): Promise<DeleteResult> => {
      const index = favorites.findIndex(
        (favorite) =>
          favorite.userId === where.userId &&
          favorite.listingId === where.listingId,
      );

      if (index >= 0) {
        favorites.splice(index, 1);
      }

      return { affected: index >= 0 ? 1 : 0, raw: [] };
    }),
  };
}

function createListingRepository(listings: Listing[]) {
  return {
    createQueryBuilder: () => createListingQueryBuilder(listings),
  };
}

function createFavoriteListingQueryBuilder(
  favorites: FavoriteListing[],
  listings: Listing[],
) {
  let userId: string | undefined;
  let listingIds: string[] | undefined;
  let offset = 0;
  let limit = 24;

  const queryBuilder: FavoriteListingQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn((_: string, params?: { userId?: string }) => {
      userId = params?.userId;
      return queryBuilder;
    }),
    andWhere: jest.fn((_: string, params?: { listingIds?: string[] }) => {
      listingIds = params?.listingIds;
      return queryBuilder;
    }),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn((value: number) => {
      offset = value;
      return queryBuilder;
    }),
    take: jest.fn((value: number) => {
      limit = value;
      return queryBuilder;
    }),
    getRawMany: jest.fn(async () =>
      favorites
        .filter(
          (favorite) =>
            favorite.userId === userId &&
            (!listingIds || listingIds.includes(favorite.listingId)),
        )
        .map((favorite) => ({ listingId: favorite.listingId })),
    ),
    getManyAndCount: jest.fn(async () => {
      const userFavorites = favorites
        .filter((favorite) => favorite.userId === userId)
        .map((favorite) => ({
          ...favorite,
          listing:
            favorite.listing ??
            listings.find((listing) => listing.id === favorite.listingId),
        }))
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

      return [userFavorites.slice(offset, offset + limit), userFavorites.length];
    }),
  };

  return queryBuilder;
}

function createListingQueryBuilder(listings: Listing[]) {
  let listingId: string | undefined;

  const queryBuilder: ListingLookupQueryBuilder = {
    where: jest.fn((_: string, params?: { listingId?: string }) => {
      listingId = params?.listingId;
      return queryBuilder;
    }),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(async () => {
      const listing = listings.find((item) => item.id === listingId);

      if (!listing) return null;

      return isPublicListing(listing) ? listing : null;
    }),
  };

  return queryBuilder;
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
    bathrooms: null,
    floor: null,
    totalFloors: null,
    yearBuilt: null,
    showPriceOnPublicPage: true,
    showExactAddressOnPublicPage: false,
    estateflowBrandingEnabled: true,
    showPublicViewCount: false,
    publishedAt: new Date('2026-07-01T10:00:00.000Z'),
    expiresAt: null,
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
    updatedAt: new Date('2026-07-02T09:00:00.000Z'),
    isPremium: false,
    agentId: 'agent-1',
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
  } as unknown as Listing;
}

function isPublicListing(listing: Listing): boolean {
  return Boolean(
    listing.publicSlug &&
      listing.publicationStatus === ListingPublicationStatus.PUBLISHED &&
      listing.status === ListingStatus.ACTIVE &&
      listing.publishedAt &&
      (!listing.expiresAt || listing.expiresAt > new Date()),
  );
}

interface FavoriteWhere {
  userId: string;
  listingId: string;
}

interface FavoriteListingQueryBuilder {
  select: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getRawMany: jest.Mock;
  getManyAndCount: jest.Mock;
}

interface ListingLookupQueryBuilder {
  where: jest.Mock;
  andWhere: jest.Mock;
  getOne: jest.Mock;
}
