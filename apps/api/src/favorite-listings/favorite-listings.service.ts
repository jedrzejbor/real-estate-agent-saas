import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  ListingPublicationStatus,
  ListingStatus,
} from '../common/enums';
import { Listing } from '../listings/entities';
import type { PublicListingCatalogItem } from '../listings/public-listing.model';
import { FavoriteListingQueryDto } from './dto';
import { FavoriteListing } from './entities';
import type {
  FavoriteListingIdsResponse,
  FavoriteListingListEntry,
  FavoriteListingsPage,
  ToggleFavoriteListingResult,
} from './favorite-listings.types';

const UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class FavoriteListingsService {
  constructor(
    @InjectRepository(FavoriteListing)
    private readonly favoriteListingRepo: Repository<FavoriteListing>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
  ) {}

  async findUserFavorites(
    userId: string,
    query: FavoriteListingQueryDto,
  ): Promise<FavoriteListingsPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;

    const [favorites, total] = await this.favoriteListingRepo
      .createQueryBuilder('favorite')
      .leftJoinAndSelect('favorite.listing', 'listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('listing.images', 'images')
      .leftJoinAndSelect('listing.agent', 'agent')
      .leftJoinAndSelect('agent.agency', 'agency')
      .where('favorite.userId = :userId', { userId })
      .orderBy('favorite.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: favorites.map((favorite) => this.toFavoriteListEntry(favorite)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findFavoriteListingIds(
    userId: string,
    listingIds: string[],
  ): Promise<FavoriteListingIdsResponse> {
    const uniqueListingIds = Array.from(new Set(listingIds));

    if (uniqueListingIds.length === 0) {
      return { listingIds: [] };
    }

    const favorites = await this.favoriteListingRepo
      .createQueryBuilder('favorite')
      .select('favorite.listingId', 'listingId')
      .where('favorite.userId = :userId', { userId })
      .andWhere('favorite.listingId IN (:...listingIds)', {
        listingIds: uniqueListingIds,
      })
      .getRawMany<{ listingId: string }>();

    return {
      listingIds: favorites.map((favorite) => favorite.listingId),
    };
  }

  async addFavorite(
    userId: string,
    listingId: string,
  ): Promise<ToggleFavoriteListingResult> {
    await this.findPublicListingForFavoriteOrFail(listingId);

    const existing = await this.favoriteListingRepo.findOne({
      where: { userId, listingId },
    });

    if (existing) {
      return this.toToggleResult(existing, true);
    }

    const favorite = this.favoriteListingRepo.create({ userId, listingId });

    try {
      const saved = await this.favoriteListingRepo.save(favorite);
      return this.toToggleResult(saved, true);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const saved = await this.favoriteListingRepo.findOneOrFail({
          where: { userId, listingId },
        });
        return this.toToggleResult(saved, true);
      }

      throw error;
    }
  }

  async removeFavorite(
    userId: string,
    listingId: string,
  ): Promise<ToggleFavoriteListingResult> {
    await this.favoriteListingRepo.delete({ userId, listingId });

    return {
      listingId,
      isFavorite: false,
    };
  }

  private async findPublicListingForFavoriteOrFail(
    listingId: string,
  ): Promise<Listing> {
    const listing = await this.listingRepo
      .createQueryBuilder('listing')
      .where('listing.id = :listingId', { listingId })
      .andWhere('listing.publicationStatus = :publicationStatus', {
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      })
      .andWhere('listing.status = :status', { status: ListingStatus.ACTIVE })
      .andWhere('listing.publicSlug IS NOT NULL')
      .andWhere('listing.publishedAt IS NOT NULL')
      .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > :now)', {
        now: new Date(),
      })
      .getOne();

    if (!listing) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    return listing;
  }

  private toFavoriteListEntry(
    favorite: FavoriteListing,
  ): FavoriteListingListEntry {
    if (!isListingPubliclyAvailable(favorite.listing)) {
      return {
        id: favorite.id,
        listingId: favorite.listingId,
        createdAt: favorite.createdAt,
        isAvailable: false,
        unavailableReason: 'not_public',
      };
    }

    return {
      id: favorite.id,
      listingId: favorite.listingId,
      createdAt: favorite.createdAt,
      isAvailable: true,
      listing: toPublicCatalogItem(favorite.listing),
    };
  }

  private toToggleResult(
    favorite: FavoriteListing,
    isFavorite: boolean,
  ): ToggleFavoriteListingResult {
    return {
      listingId: favorite.listingId,
      isFavorite,
      favoriteId: favorite.id,
      createdAt: favorite.createdAt,
    };
  }
}

function isListingPubliclyAvailable(listing?: Listing | null): listing is Listing {
  return Boolean(
    listing &&
      listing.publicSlug &&
      listing.publicationStatus === ListingPublicationStatus.PUBLISHED &&
      listing.status === ListingStatus.ACTIVE &&
      listing.publishedAt &&
      !isListingExpired(listing),
  );
}

function toPublicCatalogItem(listing: Listing): PublicListingCatalogItem {
  const images = [...(listing.images ?? [])].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];

  return {
    id: listing.id,
    slug: listing.publicSlug as string,
    title: listing.publicTitle || listing.title,
    propertyType: listing.propertyType,
    transactionType: listing.transactionType,
    price: listing.showPriceOnPublicPage ? listing.price : null,
    currency: listing.currency,
    areaM2: listing.areaM2 ?? null,
    plotAreaM2: listing.plotAreaM2 ?? null,
    rooms: listing.rooms ?? null,
    address: listing.address
      ? {
          city: listing.address.city,
          district: listing.address.district ?? null,
          voivodeship: listing.address.voivodeship ?? null,
        }
      : null,
    primaryImage: primaryImage
      ? {
          id: primaryImage.id,
          url: primaryImage.url,
          altText: primaryImage.altText ?? null,
        }
      : null,
    images: images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText ?? null,
    })),
    mapPoint: null,
    imageCount: listing.images?.length ?? 0,
    agent: listing.agent
      ? {
          id: listing.agent.id,
          firstName: listing.agent.firstName ?? null,
          lastName: listing.agent.lastName ?? null,
          agency: listing.agent.agency
            ? {
                id: listing.agent.agency.id,
                name: listing.agent.agency.name,
                logoUrl: listing.agent.agency.logoUrl ?? null,
              }
            : null,
        }
      : null,
    publishedAt: listing.publishedAt as Date,
    updatedAt: listing.updatedAt,
  };
}

function isListingExpired(listing: Pick<Listing, 'expiresAt'>): boolean {
  return Boolean(listing.expiresAt && listing.expiresAt <= new Date());
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError &&
    error.driverError.code === UNIQUE_VIOLATION_CODE
  );
}
