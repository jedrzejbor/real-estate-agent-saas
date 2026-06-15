import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { ActivityService } from '../activity';
import { MonitoringService } from '../monitoring';
import { Listing } from './entities/listing.entity';
import { Address } from './entities/address.entity';
import { ListingImage } from './entities/listing-image.entity';
import { AnalyticsEvent } from '../analytics/entities/analytics-event.entity';
import { Agent } from '../users/entities/agent.entity';
import { Location } from '../locations/entities';
import { UsersService } from '../users';
import {
  ActivityAction,
  ActivityEntityType,
  ListingPublicationStatus,
  ListingStatus,
} from '../common/enums';
import {
  calculateListingCommissionAmount,
  normalizeListingCommissionInput,
} from './listing-commission';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import { assertSafeImageUpload } from '../common/image-upload-security';
import { assertPublicListingModerationPassed } from '../common/public-listing-moderation';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingImageDto } from './dto/listing-image.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import {
  PublicListingCatalogQueryDto,
  PublicListingCatalogSort,
} from './dto/public-listing-catalog-query.dto';
import {
  PublicAgentProfileView,
  PublicListingCatalogItem,
  PublicListingCatalogMapMarker,
  PublicListingCatalogResponse,
  PublicListingMapPoint,
  PublicListingSitemapEntry,
  PublicListingView,
} from './public-listing.model';
import { LOCATION_CATALOG } from '../locations/location-catalog';
import { normalizeLocationSearch } from '../locations/locations-normalization';

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface UploadedListingImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

interface PublicCatalogBbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

interface PublicLocationPoint {
  lat: number;
  lng: number;
}

const PUBLIC_CATALOG_DEFAULT_MAP_LIMIT = 150;
const PUBLIC_CATALOG_MAX_BBOX_WIDTH_DEGREES = 9;
const PUBLIC_CATALOG_MAX_BBOX_HEIGHT_DEGREES = 7;
const PUBLIC_CATALOG_MAX_BBOX_AREA_DEGREES = 36;

const PUBLIC_LOCATION_CENTROIDS: Record<string, PublicLocationPoint> = {
  ...LOCATION_CATALOG.reduce<Record<string, PublicLocationPoint>>(
    (centroids, location) => {
      const key = normalizePublicLocationKey(location.name);
      if (key) {
        centroids[key] = { lat: location.lat, lng: location.lng };
      }
      return centroids;
    },
    {},
  ),
  warszawa: { lat: 52.2297, lng: 21.0122 },
  krakow: { lat: 50.0647, lng: 19.945 },
  lodz: { lat: 51.7592, lng: 19.456 },
  wroclaw: { lat: 51.1079, lng: 17.0385 },
  poznan: { lat: 52.4064, lng: 16.9252 },
  gdansk: { lat: 54.352, lng: 18.6466 },
  szczecin: { lat: 53.4285, lng: 14.5528 },
  bydgoszcz: { lat: 53.1235, lng: 18.0084 },
  lublin: { lat: 51.2465, lng: 22.5684 },
  bialystok: { lat: 53.1325, lng: 23.1688 },
  katowice: { lat: 50.2649, lng: 19.0238 },
  gdynia: { lat: 54.5189, lng: 18.5305 },
  czestochowa: { lat: 50.8118, lng: 19.1203 },
  radom: { lat: 51.4027, lng: 21.1471 },
  torun: { lat: 53.0138, lng: 18.5984 },
  kielce: { lat: 50.8661, lng: 20.6286 },
  rzeszow: { lat: 50.0413, lng: 21.999 },
  gliwice: { lat: 50.2945, lng: 18.6714 },
  zabrze: { lat: 50.3249, lng: 18.7857 },
  olsztyn: { lat: 53.7784, lng: 20.4801 },
  'bielsko-biala': { lat: 49.8224, lng: 19.0584 },
  bytom: { lat: 50.348, lng: 18.9328 },
  'zielona-gora': { lat: 51.9356, lng: 15.5062 },
  opole: { lat: 50.6751, lng: 17.9213 },
  'gorzow-wielkopolski': { lat: 52.7368, lng: 15.2288 },
  dolnoslaskie: { lat: 51.133, lng: 16.884 },
  'kujawsko-pomorskie': { lat: 53.121, lng: 18.006 },
  lubelskie: { lat: 51.249, lng: 22.572 },
  lubuskie: { lat: 52.228, lng: 15.256 },
  lodzkie: { lat: 51.618, lng: 19.362 },
  malopolskie: { lat: 49.722, lng: 20.25 },
  mazowieckie: { lat: 52.247, lng: 21.014 },
  opolskie: { lat: 50.633, lng: 17.926 },
  podkarpackie: { lat: 49.958, lng: 22.056 },
  podlaskie: { lat: 53.135, lng: 23.145 },
  pomorskie: { lat: 54.294, lng: 18.153 },
  slaskie: { lat: 50.297, lng: 19.023 },
  swietokrzyskie: { lat: 50.79, lng: 20.722 },
  'warminsko-mazurskie': { lat: 53.867, lng: 20.702 },
  wielkopolskie: { lat: 52.279, lng: 17.353 },
  zachodniopomorskie: { lat: 53.569, lng: 15.347 },
};

function normalizePublicLocationKey(value?: string | null): string | null {
  const normalized = value
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || null;
}

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);
  private readonly publicLocationCentroidCache = new Map<
    string,
    PublicLocationPoint
  >();

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(ListingImage)
    private readonly listingImageRepo: Repository<ListingImage>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
    private readonly usersService: UsersService,
    private readonly activityService: ActivityService,
    private readonly configService: ConfigService,
    private readonly monitoringService: MonitoringService,
  ) {}

  // ── Create ──

  async create(userId: string, dto: CreateListingDto): Promise<Listing> {
    const { agent } = await this.assertListingCreateWithinPlanLimit(userId);

    const { address: addressDto, ...listingData } = dto;
    const commission = normalizeListingCommissionInput(listingData);

    const listing = this.listingRepo.create({
      ...listingData,
      ...commission,
      agentId: agent.id,
    });

    const savedListing = await this.listingRepo.save(listing);

    // Create address linked to listing
    const address = this.addressRepo.create({
      ...addressDto,
      listing: savedListing,
    });
    await this.addressRepo.save(address);

    this.logger.log(
      `Listing created: "${savedListing.title}" (${savedListing.id}) by agent ${agent.id}`,
    );

    const createdListing = await this.findOneOrFail(savedListing.id);
    await this.attachPublicViewCounts([createdListing]);
    this.attachCommissionAmounts([createdListing]);

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.LISTING,
      entityId: createdListing.id,
      action: ActivityAction.CREATED,
      description: 'Utworzono ofertę',
    });

    return createdListing;
  }

  // ── Read (list with filters & pagination) ──

  async findAll(
    userId: string,
    query: ListingQueryDto,
  ): Promise<PaginatedResult<Listing>> {
    const agent = await this.resolveAgent(userId);
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = query;

    const qb = this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('listing.images', 'images')
      .where('listing.agentId = :agentId', { agentId: agent.id });

    this.applyFilters(qb, filters);

    // Sorting — only allow whitelisted columns
    const allowedSortColumns = ['price', 'createdAt', 'areaM2'];
    const column = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`listing.${column}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    await this.attachPublicViewCounts(data);
    this.attachCommissionAmounts(data);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Read (single) ──

  async findOne(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    await this.attachPublicViewCounts([listing]);
    this.attachCommissionAmounts([listing]);
    return listing;
  }

  async findHistory(id: string, userId: string) {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);

    return this.activityService.findEntityHistory(
      userId,
      ActivityEntityType.LISTING,
      id,
    );
  }

  async rollbackStatus(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);

    const latestStatusChange =
      await this.activityService.findLatestStatusChange(
        userId,
        ActivityEntityType.LISTING,
        id,
      );

    if (!latestStatusChange) {
      throw new BadRequestException('Brak zmiany statusu do cofnięcia');
    }

    const statusChange = latestStatusChange.changes.find(
      (change) => change.field === 'status',
    );

    if (
      !statusChange ||
      typeof statusChange.oldValue !== 'string' ||
      typeof statusChange.newValue !== 'string'
    ) {
      throw new BadRequestException('Nieprawidłowy wpis historii statusu');
    }

    if (listing.status !== statusChange.newValue) {
      throw new BadRequestException(
        'Nie można cofnąć statusu, ponieważ bieżący status nie odpowiada ostatniej zmianie statusu',
      );
    }

    const previousState = this.createListingSnapshot(listing);
    listing.status = statusChange.oldValue as ListingStatus;
    this.syncPublicationWithListingStatus(listing);
    await this.listingRepo.save(listing);

    const updatedListing = await this.findOneOrFail(id);
    const changes = this.activityService.buildChanges(
      previousState,
      this.createListingSnapshot(updatedListing),
    );

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.LISTING,
      entityId: updatedListing.id,
      action: ActivityAction.STATUS_ROLLED_BACK,
      description: 'Cofnięto status oferty',
      changes,
    });

    await this.attachPublicViewCounts([updatedListing]);
    this.attachCommissionAmounts([updatedListing]);
    return updatedListing;
  }

  // ── Update ──

  async update(
    id: string,
    userId: string,
    dto: UpdateListingDto,
  ): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const previousState = this.createListingSnapshot(listing);

    const { address: addressDto, ...listingData } = dto;
    const commission = normalizeListingCommissionInput(listingData, {
      current: listing,
      partial: true,
    });

    // Merge listing fields
    Object.assign(listing, listingData, commission);
    this.syncPublicationWithListingStatus(listing);

    await this.listingRepo.save(listing);

    // Update address if provided
    if (addressDto && listing.address) {
      Object.assign(listing.address, addressDto);
      await this.addressRepo.save(listing.address);
    }

    this.logger.log(`Listing updated: ${id}`);

    const updatedListing = await this.findOneOrFail(id);
    const nextState = this.createListingSnapshot(updatedListing);
    const changes = this.activityService.buildChanges(previousState, nextState);

    if (changes.length > 0) {
      const isStatusChange = changes.some(
        (change) => change.field === 'status',
      );

      await this.activityService.log({
        userId,
        entityType: ActivityEntityType.LISTING,
        entityId: updatedListing.id,
        action: isStatusChange
          ? ActivityAction.STATUS_CHANGED
          : ActivityAction.UPDATED,
        description: isStatusChange
          ? 'Zmieniono status oferty'
          : 'Zaktualizowano ofertę',
        changes,
      });
    }

    await this.attachPublicViewCounts([updatedListing]);
    this.attachCommissionAmounts([updatedListing]);
    return updatedListing;
  }

  async addImages(
    id: string,
    userId: string,
    files: UploadedListingImageFile[],
  ): Promise<Listing> {
    if (!files.length) {
      throw new BadRequestException('Wybierz co najmniej jedno zdjęcie');
    }

    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const previousState = this.createListingSnapshot(listing);
    const access = await this.usersService.getAgencyAccessContext(userId);
    const currentImages = this.getOrderedImages(listing);
    const imageLimit = access.entitlements.limits.imagesPerListing;

    if (
      imageLimit !== null &&
      currentImages.length + files.length > imageLimit
    ) {
      throw new PlanLimitReachedException({
        resource: 'images',
        limit: imageLimit,
        currentUsage: currentImages.length,
        attemptedUsage: currentImages.length + files.length,
        planCode: access.entitlements.plan.code,
        message:
          'Osiągnięto limit zdjęć dla tej oferty. Usuń zdjęcie albo przejdź na wyższy plan.',
      });
    }

    const nextOrder =
      currentImages.length > 0
        ? Math.max(...currentImages.map((image) => image.order)) + 1
        : 0;
    const isFirstImage = currentImages.length === 0;
    const uploadedFiles = await this.persistUploadedImages(files);

    try {
      const images = uploadedFiles.map((file, index) =>
        this.listingImageRepo.create({
          listing,
          url: file.url,
          order: nextOrder + index,
          isPrimary: isFirstImage && index === 0,
          altText: listing.publicTitle || listing.title,
        }),
      );

      await this.listingImageRepo.save(images);

      if (isFirstImage && !listing.shareImageUrl) {
        listing.shareImageUrl = images[0].url;
        await this.listingRepo.save(listing);
      }
    } catch (error) {
      await Promise.all(
        uploadedFiles.map((file) => this.removeLocalUpload(file.url)),
      );
      throw error;
    }

    const updatedListing = await this.findOneOrFail(id);
    await this.logListingImageUpdate(userId, updatedListing, previousState);

    return updatedListing;
  }

  async updateImage(
    id: string,
    imageId: string,
    userId: string,
    dto: UpdateListingImageDto,
  ): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const image = this.findListingImage(listing, imageId);
    const previousState = this.createListingSnapshot(listing);

    image.altText = dto.altText?.trim() || null;
    await this.listingImageRepo.save(image);

    const updatedListing = await this.findOneOrFail(id);
    await this.logListingImageUpdate(userId, updatedListing, previousState);

    return updatedListing;
  }

  async setPrimaryImage(
    id: string,
    imageId: string,
    userId: string,
  ): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const images = this.getOrderedImages(listing);
    const targetImage = this.findListingImage(listing, imageId);
    const previousState = this.createListingSnapshot(listing);
    const oldPrimaryUrl = images.find((image) => image.isPrimary)?.url ?? null;

    for (const image of images) {
      image.isPrimary = image.id === targetImage.id;
    }

    targetImage.order = 0;
    const remainingImages = images.filter(
      (image) => image.id !== targetImage.id,
    );
    remainingImages.forEach((image, index) => {
      image.order = index + 1;
    });

    await this.listingImageRepo.save([targetImage, ...remainingImages]);

    if (!listing.shareImageUrl || listing.shareImageUrl === oldPrimaryUrl) {
      listing.shareImageUrl = targetImage.url;
      await this.listingRepo.save(listing);
    }

    const updatedListing = await this.findOneOrFail(id);
    await this.logListingImageUpdate(userId, updatedListing, previousState);

    return updatedListing;
  }

  async reorderImages(
    id: string,
    userId: string,
    imageIds: string[],
  ): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const images = this.getOrderedImages(listing);
    const previousState = this.createListingSnapshot(listing);

    if (imageIds.length !== images.length) {
      throw new BadRequestException(
        'Przekazana kolejność musi obejmować wszystkie zdjęcia oferty',
      );
    }

    const imagesById = new Map(images.map((image) => [image.id, image]));
    const orderedImages = imageIds.map((imageId) => {
      const image = imagesById.get(imageId);

      if (!image) {
        throw new BadRequestException('Nieprawidłowa lista zdjęć oferty');
      }

      return image;
    });

    orderedImages.forEach((image, index) => {
      image.order = index;
    });

    await this.listingImageRepo.save(orderedImages);

    const updatedListing = await this.findOneOrFail(id);
    await this.logListingImageUpdate(userId, updatedListing, previousState);

    return updatedListing;
  }

  async removeImage(
    id: string,
    imageId: string,
    userId: string,
  ): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const image = this.findListingImage(listing, imageId);
    const previousState = this.createListingSnapshot(listing);
    const wasPrimary = image.isPrimary;
    const removedImageUrl = image.url;

    await this.listingImageRepo.remove(image);
    await this.removeLocalUpload(removedImageUrl);

    const refreshedListing = await this.findOneOrFail(id);
    const remainingImages = this.getOrderedImages(refreshedListing);

    if (wasPrimary && remainingImages.length > 0) {
      remainingImages[0].isPrimary = true;
      await this.listingImageRepo.save(remainingImages[0]);
    }

    if (refreshedListing.shareImageUrl === removedImageUrl) {
      refreshedListing.shareImageUrl = remainingImages[0]?.url ?? null;
      await this.listingRepo.save(refreshedListing);
    }

    const updatedListing = await this.findOneOrFail(id);
    await this.logListingImageUpdate(userId, updatedListing, previousState);

    return updatedListing;
  }

  async publish(id: string, userId: string): Promise<Listing> {
    return this.monitoringService.monitor(
      {
        flow: 'listing_publish',
        failureEvent: 'publish_failed',
        successEvent: 'listing_published',
        context: { listingId: id, userId },
        successContext: (listing) => ({
          listingId: listing.id,
          agentId: listing.agentId,
          status: listing.status,
          publicSlug: listing.publicSlug,
          publicationStatus: listing.publicationStatus,
        }),
      },
      () => this.publishCore(id, userId),
    );
  }

  private async publishCore(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const access = await this.usersService.getAgencyAccessContext(userId);

    if (!access.entitlements.features.publicListings) {
      throw new FeatureAccessDeniedException({
        feature: 'publicListings',
        planCode: access.entitlements.plan.code,
        message: 'Publiczne strony ofert nie są dostępne w Twoim planie.',
      });
    }

    this.assertListingCanBePublished(listing);
    assertPublicListingModerationPassed({
      title: listing.publicTitle || listing.title,
      description: listing.publicDescription || listing.description,
      price: listing.price,
      areaM2: listing.areaM2,
      transactionType: listing.transactionType,
      imageUrls: listing.images?.map((image) => image.url) ?? [],
    });

    const previousState = this.createListingSnapshot(listing);

    listing.publicSlug =
      listing.publicSlug ?? (await this.generateUniquePublicSlug(listing));
    listing.publicTitle = listing.publicTitle?.trim() || listing.title;
    listing.publicDescription =
      listing.publicDescription?.trim() || listing.description;
    listing.seoTitle =
      listing.seoTitle?.trim() || this.buildDefaultSeoTitle(listing);
    listing.seoDescription =
      listing.seoDescription?.trim() ||
      this.buildDefaultSeoDescription(listing);
    listing.estateflowBrandingEnabled = access.entitlements.features
      .customBranding
      ? listing.estateflowBrandingEnabled
      : true;
    if (listing.status === ListingStatus.DRAFT) {
      listing.status = ListingStatus.ACTIVE;
    }
    listing.publicationStatus = ListingPublicationStatus.PUBLISHED;
    listing.publishedAt = listing.publishedAt ?? new Date();
    listing.unpublishedAt = null;
    listing.expiresAt = listing.ownerUserId
      ? (listing.expiresAt ?? buildSellerListingExpiresAt(new Date()))
      : listing.expiresAt;

    await this.listingRepo.save(listing);

    const publishedListing = await this.findOneOrFail(id);
    const changes = this.activityService.buildChanges(
      previousState,
      this.createListingSnapshot(publishedListing),
    );

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.LISTING,
      entityId: publishedListing.id,
      action: ActivityAction.PUBLISHED,
      description:
        previousState.status === ListingStatus.DRAFT
          ? 'Opublikowano ofertę i oznaczono ją jako aktywną'
          : 'Opublikowano publiczną stronę oferty',
      changes,
    });

    await this.attachPublicViewCounts([publishedListing]);
    this.attachCommissionAmounts([publishedListing]);
    return publishedListing;
  }

  async unpublish(id: string, userId: string): Promise<Listing> {
    return this.monitoringService.monitor(
      {
        flow: 'listing_unpublish',
        failureEvent: 'unpublish_failed',
        successEvent: 'listing_unpublished',
        context: { listingId: id, userId },
        successContext: (listing) => ({
          listingId: listing.id,
          agentId: listing.agentId,
          publicSlug: listing.publicSlug,
          publicationStatus: listing.publicationStatus,
        }),
      },
      () => this.unpublishCore(id, userId),
    );
  }

  private async unpublishCore(id: string, userId: string): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);

    if (listing.publicationStatus !== ListingPublicationStatus.PUBLISHED) {
      throw new BadRequestException('Oferta nie jest obecnie opublikowana');
    }

    const previousState = this.createListingSnapshot(listing);

    listing.publicationStatus = ListingPublicationStatus.UNPUBLISHED;
    listing.unpublishedAt = new Date();

    await this.listingRepo.save(listing);

    const unpublishedListing = await this.findOneOrFail(id);
    const changes = this.activityService.buildChanges(
      previousState,
      this.createListingSnapshot(unpublishedListing),
    );

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.LISTING,
      entityId: unpublishedListing.id,
      action: ActivityAction.UNPUBLISHED,
      description: 'Wyłączono publiczną stronę oferty',
      changes,
    });

    await this.attachPublicViewCounts([unpublishedListing]);
    this.attachCommissionAmounts([unpublishedListing]);
    return unpublishedListing;
  }

  async findPublicBySlug(slug: string): Promise<PublicListingView> {
    const listing = await this.listingRepo.findOne({
      where: {
        publicSlug: slug,
        status: ListingStatus.ACTIVE,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
      relations: ['address', 'images', 'agent', 'agent.agency'],
    });

    if (
      !listing ||
      !listing.publicSlug ||
      !listing.publishedAt ||
      isListingExpired(listing)
    ) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    await this.attachPublicViewCounts([listing]);
    return this.toPublicListingView(listing);
  }

  async findPublicCatalog(
    query: PublicListingCatalogQueryDto,
  ): Promise<PublicListingCatalogResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const sort = query.sort ?? PublicListingCatalogSort.NEWEST;
    const mapLimit = query.mapLimit ?? PUBLIC_CATALOG_DEFAULT_MAP_LIMIT;
    const bbox = this.parsePublicCatalogBbox(query.bbox);

    const qb = this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('listing.images', 'images')
      .leftJoinAndSelect('listing.agent', 'agent')
      .leftJoinAndSelect('agent.agency', 'agency')
      .where('listing.publicationStatus = :publicationStatus', {
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      })
      .andWhere('listing.status = :status', { status: ListingStatus.ACTIVE })
      .andWhere('listing.publicSlug IS NOT NULL')
      .andWhere('listing.publishedAt IS NOT NULL')
      .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > :now)', {
        now: new Date(),
      });

    this.applyPublicCatalogFilters(qb, query);
    this.applyPublicCatalogSort(qb, sort);

    if (bbox) {
      const listingsInSortOrder = await qb.getMany();
      await this.hydrateApproximatePublicLocationPoints(listingsInSortOrder);
      const listingsInsideBbox = listingsInSortOrder.filter((listing) => {
        const mapPoint = this.getPublicListingMapPoint(listing);
        return mapPoint ? this.isMapPointInsideBbox(mapPoint, bbox) : false;
      });
      const total = listingsInsideBbox.length;
      const paginatedListings = listingsInsideBbox.slice(
        (page - 1) * limit,
        page * limit,
      );
      const mapMarkers = this.buildPublicCatalogMapMarkers(
        listingsInsideBbox,
        mapLimit,
      );

      return {
        data: paginatedListings.map((listing) =>
          this.toPublicCatalogItem(listing),
        ),
        mapMarkers,
        meta: this.buildPublicCatalogMeta({
          total,
          page,
          limit,
          sort,
          bbox,
          mapLimit,
          pointsTotal: listingsInsideBbox.filter((listing) =>
            Boolean(this.getPublicListingMapPoint(listing)),
          ).length,
          pointsReturned: mapMarkers.length,
        }),
      };
    }

    const [listings, total] = await qb
      .clone()
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const mapCandidateListings = await qb.clone().getMany();
    await this.hydrateApproximatePublicLocationPoints(mapCandidateListings);
    const mapMarkers = this.buildPublicCatalogMapMarkers(
      mapCandidateListings,
      mapLimit,
    );
    const pointsTotal = mapCandidateListings.filter((listing) =>
      Boolean(this.getPublicListingMapPoint(listing)),
    ).length;

    return {
      data: listings.map((listing) => this.toPublicCatalogItem(listing)),
      mapMarkers,
      meta: this.buildPublicCatalogMeta({
        total,
        page,
        limit,
        sort,
        bbox: null,
        mapLimit,
        pointsTotal,
        pointsReturned: mapMarkers.length,
      }),
    };
  }

  async findPublicAgentProfile(
    agentId: string,
  ): Promise<PublicAgentProfileView> {
    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['agency'],
    });

    if (!agent) {
      throw new NotFoundException('Publiczny profil nie znaleziony');
    }

    const listings = await this.listingRepo.find({
      where: {
        agentId,
        status: ListingStatus.ACTIVE,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
      relations: ['address', 'images'],
      order: {
        publishedAt: 'DESC',
      },
    });

    const publicListings = listings
      .filter((listing) =>
        Boolean(
          listing.publicSlug &&
          listing.publishedAt &&
          !isListingExpired(listing),
        ),
      )
      .map((listing) => ({
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
              street: listing.showExactAddressOnPublicPage
                ? (listing.address.street ?? null)
                : null,
              postalCode: listing.showExactAddressOnPublicPage
                ? (listing.address.postalCode ?? null)
                : null,
              lat: listing.showExactAddressOnPublicPage
                ? (listing.address.lat ?? null)
                : null,
              lng: listing.showExactAddressOnPublicPage
                ? (listing.address.lng ?? null)
                : null,
            }
          : null,
        imageUrl:
          listing.images?.slice().sort((a, b) => {
            if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
            return a.order - b.order;
          })[0]?.url ?? null,
        publishedAt: listing.publishedAt as Date,
      }));

    if (publicListings.length === 0) {
      throw new NotFoundException('Publiczny profil nie znaleziony');
    }

    return {
      id: agent.id,
      firstName: agent.firstName ?? null,
      lastName: agent.lastName ?? null,
      phone: agent.phone ?? null,
      bio: agent.bio ?? null,
      avatarUrl: agent.avatarUrl ?? null,
      agency: agent.agency
        ? {
            id: agent.agency.id,
            name: agent.agency.name,
            address: agent.agency.address ?? null,
            logoUrl: agent.agency.logoUrl ?? null,
          }
        : null,
      listings: publicListings,
      updatedAt: publicListings.reduce(
        (latest, listing) =>
          listing.publishedAt > latest ? listing.publishedAt : latest,
        agent.updatedAt,
      ),
    };
  }

  async findPublicSitemapEntries(): Promise<PublicListingSitemapEntry[]> {
    return this.listingRepo
      .find({
        select: {
          publicSlug: true,
          updatedAt: true,
        },
        where: {
          status: ListingStatus.ACTIVE,
          publicationStatus: ListingPublicationStatus.PUBLISHED,
        },
        order: {
          updatedAt: 'DESC',
        },
      })
      .then((listings) =>
        listings
          .filter((listing): listing is Listing & { publicSlug: string } =>
            Boolean(listing.publicSlug && !isListingExpired(listing)),
          )
          .map((listing) => ({
            slug: listing.publicSlug,
            updatedAt: listing.updatedAt,
          })),
      );
  }

  // ── Delete (soft → archived, or hard delete for drafts) ──

  async remove(id: string, userId: string): Promise<void> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);
    const previousState = this.createListingSnapshot(listing);

    if (listing.status === ListingStatus.DRAFT) {
      await this.activityService.log({
        userId,
        entityType: ActivityEntityType.LISTING,
        entityId: listing.id,
        action: ActivityAction.DELETED,
        description: 'Usunięto ofertę',
      });

      await this.listingRepo.remove(listing);
      this.logger.log(`Draft listing hard-deleted: ${id}`);
    } else {
      listing.status = ListingStatus.ARCHIVED;
      this.syncPublicationWithListingStatus(listing);
      await this.listingRepo.save(listing);

      const archivedListing = await this.findOneOrFail(id);
      const changes = this.activityService.buildChanges(
        previousState,
        this.createListingSnapshot(archivedListing),
      );

      await this.activityService.log({
        userId,
        entityType: ActivityEntityType.LISTING,
        entityId: listing.id,
        action: ActivityAction.ARCHIVED,
        description: 'Zarchiwizowano ofertę',
        changes,
      });

      this.logger.log(`Listing archived: ${id}`);
    }
  }

  // ── Private helpers ──

  /** Resolve the Agent entity from a User id. */
  private async resolveAgent(userId: string): Promise<Agent> {
    return this.usersService.resolveAgentForUser(userId);
  }

  private async assertListingCreateWithinPlanLimit(
    userId: string,
  ): Promise<{ agent: Agent }> {
    const access = await this.usersService.getAgencyAccessContext(userId);
    const limit = access.entitlements.limits.activeListings;

    if (limit !== null) {
      const currentUsage = await this.listingRepo.count({
        where: {
          agentId: In(access.agencyAgentIds),
          status: Not(ListingStatus.ARCHIVED),
        },
      });

      if (currentUsage >= limit) {
        throw new PlanLimitReachedException({
          resource: 'listings',
          limit,
          currentUsage,
          attemptedUsage: currentUsage + 1,
          planCode: access.entitlements.plan.code,
          message:
            'Osiągnięto limit aktywnych ofert w Twoim planie. Przejdź na wyższy plan, aby dodać kolejną ofertę.',
        });
      }
    }

    return { agent: access.agent };
  }

  private assertListingCanBePublished(listing: Listing): void {
    if (
      listing.status !== ListingStatus.DRAFT &&
      listing.status !== ListingStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Opublikować można tylko szkic albo aktywną ofertę',
      );
    }

    if (!listing.title?.trim()) {
      throw new BadRequestException('Tytuł oferty jest wymagany do publikacji');
    }

    if (!listing.address?.city?.trim()) {
      throw new BadRequestException('Miasto jest wymagane do publikacji');
    }

    if (!listing.price || Number(listing.price) <= 0) {
      throw new BadRequestException('Cena jest wymagana do publikacji');
    }
  }

  private syncPublicationWithListingStatus(listing: Listing): void {
    if (
      listing.status === ListingStatus.ACTIVE ||
      listing.publicationStatus !== ListingPublicationStatus.PUBLISHED
    ) {
      return;
    }

    listing.publicationStatus = ListingPublicationStatus.UNPUBLISHED;
    listing.unpublishedAt = new Date();
  }

  private async generateUniquePublicSlug(listing: Listing): Promise<string> {
    const city = listing.address?.city ?? '';
    const baseSlug = this.slugify(
      [listing.title, city].filter(Boolean).join(' '),
    );
    const fallbackSlug = `oferta-${listing.id.slice(0, 8)}`;
    const slugBase = (baseSlug || fallbackSlug).slice(0, 140);

    for (let attempt = 0; attempt < 20; attempt++) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const candidate = `${slugBase}${suffix}`.slice(0, 160);
      const existing = await this.listingRepo.findOne({
        where: { publicSlug: candidate },
        select: ['id'],
      });

      if (!existing || existing.id === listing.id) {
        return candidate;
      }
    }

    return `${slugBase}-${listing.id.slice(0, 8)}`.slice(0, 160);
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  private buildDefaultSeoTitle(listing: Listing): string {
    const city = listing.address?.city ? `, ${listing.address.city}` : '';
    return `${listing.publicTitle || listing.title}${city}`.slice(0, 70);
  }

  private buildDefaultSeoDescription(listing: Listing): string | null {
    const source = listing.publicDescription || listing.description;

    if (source?.trim()) {
      return source.trim().replace(/\s+/g, ' ').slice(0, 180);
    }

    const city = listing.address?.city ? ` w ${listing.address.city}` : '';
    return `Sprawdź szczegóły oferty nieruchomości${city} w EstateFlow.`.slice(
      0,
      180,
    );
  }

  private toPublicListingView(listing: Listing): PublicListingView {
    if (
      !listing.publicSlug ||
      !listing.publishedAt ||
      isListingExpired(listing)
    ) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const address = listing.address
      ? {
          city: listing.address.city,
          district: listing.address.district ?? null,
          voivodeship: listing.address.voivodeship ?? null,
          street: listing.showExactAddressOnPublicPage
            ? (listing.address.street ?? null)
            : null,
          postalCode: listing.showExactAddressOnPublicPage
            ? (listing.address.postalCode ?? null)
            : null,
          lat: listing.showExactAddressOnPublicPage
            ? (listing.address.lat ?? null)
            : null,
          lng: listing.showExactAddressOnPublicPage
            ? (listing.address.lng ?? null)
            : null,
        }
      : null;

    return {
      id: listing.id,
      slug: listing.publicSlug,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      title: listing.publicTitle || listing.title,
      description: listing.publicDescription ?? listing.description ?? null,
      propertyType: listing.propertyType,
      transactionType: listing.transactionType,
      price: listing.showPriceOnPublicPage ? listing.price : null,
      currency: listing.currency,
      areaM2: listing.areaM2 ?? null,
      plotAreaM2: listing.plotAreaM2 ?? null,
      rooms: listing.rooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      floor: listing.floor ?? null,
      totalFloors: listing.totalFloors ?? null,
      yearBuilt: listing.yearBuilt ?? null,
      address,
      images: (listing.images ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((image) => ({
          id: image.id,
          url: image.url,
          order: image.order,
          isPrimary: image.isPrimary,
          altText: image.altText ?? null,
        })),
      agent: listing.agent
        ? {
            id: listing.agent.id,
            firstName: listing.agent.firstName ?? null,
            lastName: listing.agent.lastName ?? null,
            phone: listing.agent.phone ?? null,
            bio: listing.agent.bio ?? null,
            avatarUrl: listing.agent.avatarUrl ?? null,
            agency: listing.agent.agency
              ? {
                  id: listing.agent.agency.id,
                  name: listing.agent.agency.name,
                  logoUrl: listing.agent.agency.logoUrl ?? null,
                }
              : null,
          }
        : null,
      seoTitle: listing.seoTitle ?? this.buildDefaultSeoTitle(listing),
      seoDescription:
        listing.seoDescription ?? this.buildDefaultSeoDescription(listing),
      shareImageUrl: listing.shareImageUrl ?? null,
      estateflowBrandingEnabled: listing.estateflowBrandingEnabled,
      showPublicViewCount: listing.showPublicViewCount,
      publicViewCount: listing.showPublicViewCount
        ? (listing.publicViewCount ?? 0)
        : null,
      publishedAt: listing.publishedAt,
      updatedAt: listing.updatedAt,
    };
  }

  private toPublicCatalogItem(listing: Listing): PublicListingCatalogItem {
    if (
      !listing.publicSlug ||
      !listing.publishedAt ||
      isListingExpired(listing)
    ) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const images = this.getOrderedImages(listing);
    const primaryImage = images[0] ?? null;

    return {
      id: listing.id,
      slug: listing.publicSlug,
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
      mapPoint: this.getPublicListingMapPoint(listing),
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
      publishedAt: listing.publishedAt,
      updatedAt: listing.updatedAt,
    };
  }

  private buildPublicCatalogMapMarkers(
    listings: Listing[],
    mapLimit: number,
  ): PublicListingCatalogMapMarker[] {
    const markers: PublicListingCatalogMapMarker[] = [];

    for (const listing of listings) {
      if (markers.length >= mapLimit) {
        break;
      }

      if (
        !listing.publicSlug ||
        !listing.publishedAt ||
        isListingExpired(listing)
      ) {
        continue;
      }

      const mapPoint = this.getPublicListingMapPoint(listing);

      if (!mapPoint) {
        continue;
      }

      const primaryImage = this.getOrderedImages(listing)[0] ?? null;

      markers.push({
        id: listing.id,
        slug: listing.publicSlug,
        title: listing.publicTitle || listing.title,
        price: listing.showPriceOnPublicPage ? listing.price : null,
        currency: listing.currency,
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
        mapPoint,
      });
    }

    return markers;
  }

  private async hydrateApproximatePublicLocationPoints(
    listings: Listing[],
  ): Promise<void> {
    const requested = new Map<
      string,
      {
        citySearchKey: string;
        voivodeshipSearchKey: string | null;
      }
    >();

    for (const listing of listings) {
      const address = listing.address;

      if (!address || listing.showExactAddressOnPublicPage) {
        continue;
      }

      const cacheKey = this.buildAddressLocationCacheKey(address);
      const citySearchKey = normalizeLocationSearch(address.city);

      if (
        !cacheKey ||
        !citySearchKey ||
        this.publicLocationCentroidCache.has(cacheKey)
      ) {
        continue;
      }

      requested.set(cacheKey, {
        citySearchKey,
        voivodeshipSearchKey: normalizeLocationSearch(address.voivodeship),
      });
    }

    if (requested.size === 0) {
      return;
    }

    const citySearchKeys = [
      ...new Set([...requested.values()].map((item) => item.citySearchKey)),
    ];
    const locations = await this.locationRepo.find({
      where: {
        active: true,
        normalizedName: In(citySearchKeys),
      },
      select: [
        'name',
        'normalizedName',
        'voivodeship',
        'lat',
        'lng',
        'priority',
      ],
      order: {
        priority: 'DESC',
      },
    });

    for (const [cacheKey, request] of requested) {
      const candidates = locations.filter(
        (location) =>
          location.normalizedName === request.citySearchKey &&
          (!request.voivodeshipSearchKey ||
            normalizeLocationSearch(location.voivodeship) ===
              request.voivodeshipSearchKey),
      );
      const bestLocation = candidates[0];

      if (!bestLocation) {
        continue;
      }

      const lat = this.toValidLatitude(bestLocation.lat);
      const lng = this.toValidLongitude(bestLocation.lng);

      if (lat === null || lng === null) {
        continue;
      }

      this.publicLocationCentroidCache.set(cacheKey, { lat, lng });
    }
  }

  private getPublicListingMapPoint(
    listing: Listing,
  ): PublicListingMapPoint | null {
    if (listing.showExactAddressOnPublicPage) {
      const lat = this.toValidLatitude(listing.address?.lat);
      const lng = this.toValidLongitude(listing.address?.lng);

      if (lat !== null && lng !== null) {
        return {
          lat,
          lng,
          precision: 'exact',
        };
      }
    }

    const approximatePoint = this.getApproximatePublicLocationPoint(
      listing.address,
    );

    return approximatePoint
      ? {
          ...approximatePoint,
          precision: 'approximate',
        }
      : null;
  }

  private getApproximatePublicLocationPoint(
    address?: Address | null,
  ): PublicLocationPoint | null {
    if (!address) {
      return null;
    }

    const cacheKey = this.buildAddressLocationCacheKey(address);
    const cachedPoint = cacheKey
      ? this.publicLocationCentroidCache.get(cacheKey)
      : null;

    if (cachedPoint) {
      return cachedPoint;
    }

    const lookupKeys = [
      address.city,
      address.voivodeship,
      this.normalizePublicLocationKey(
        address.voivodeship?.replace(/^wojew[oó]dztwo\s+/i, ''),
      ),
    ]
      .map((value) => this.normalizePublicLocationKey(value))
      .filter((value): value is string => Boolean(value));

    for (const key of lookupKeys) {
      const point = PUBLIC_LOCATION_CENTROIDS[key];

      if (point) {
        return point;
      }
    }

    return null;
  }

  private buildAddressLocationCacheKey(address: Address): string | null {
    const cityKey = normalizePublicLocationKey(address.city);

    if (!cityKey) {
      return null;
    }

    return [
      cityKey,
      normalizePublicLocationKey(address.voivodeship) ?? '',
    ].join('|');
  }

  private normalizePublicLocationKey(value?: string | null): string | null {
    return normalizePublicLocationKey(value);
  }

  private toValidLatitude(value?: number | string | null): number | null {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) &&
      numberValue >= -90 &&
      numberValue <= 90
      ? numberValue
      : null;
  }

  private toValidLongitude(value?: number | string | null): number | null {
    const numberValue = Number(value);

    return Number.isFinite(numberValue) &&
      numberValue >= -180 &&
      numberValue <= 180
      ? numberValue
      : null;
  }

  private parsePublicCatalogBbox(value?: string): PublicCatalogBbox | null {
    if (!value?.trim()) {
      return null;
    }

    const parts = value.split(',').map((part) => Number(part.trim()));

    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
      throw new BadRequestException(
        'Parametr bbox musi mieć format west,south,east,north',
      );
    }

    const [west, south, east, north] = parts;

    if (
      west < -180 ||
      west > 180 ||
      east < -180 ||
      east > 180 ||
      south < -90 ||
      south > 90 ||
      north < -90 ||
      north > 90 ||
      west >= east ||
      south >= north
    ) {
      throw new BadRequestException(
        'Parametr bbox zawiera niepoprawny zakres współrzędnych',
      );
    }

    const width = east - west;
    const height = north - south;
    const area = width * height;

    if (
      width > PUBLIC_CATALOG_MAX_BBOX_WIDTH_DEGREES ||
      height > PUBLIC_CATALOG_MAX_BBOX_HEIGHT_DEGREES ||
      area > PUBLIC_CATALOG_MAX_BBOX_AREA_DEGREES
    ) {
      throw new BadRequestException(
        'Zaznaczony obszar mapy jest zbyt szeroki. Zawęź zakres wyszukiwania.',
      );
    }

    return { west, south, east, north };
  }

  private isMapPointInsideBbox(
    mapPoint: PublicListingMapPoint,
    bbox: PublicCatalogBbox,
  ): boolean {
    return (
      mapPoint.lng >= bbox.west &&
      mapPoint.lng <= bbox.east &&
      mapPoint.lat >= bbox.south &&
      mapPoint.lat <= bbox.north
    );
  }

  private buildPublicCatalogMeta({
    total,
    page,
    limit,
    sort,
    bbox,
    mapLimit,
    pointsTotal,
    pointsReturned,
  }: {
    total: number;
    page: number;
    limit: number;
    sort: PublicListingCatalogSort;
    bbox: PublicCatalogBbox | null;
    mapLimit: number;
    pointsTotal: number;
    pointsReturned: number;
  }): PublicListingCatalogResponse['meta'] {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sort,
      map: {
        limit: mapLimit,
        pointsTotal,
        pointsReturned,
        truncated: pointsReturned < pointsTotal,
        bbox,
      },
    };
  }

  private applyPublicCatalogFilters(
    qb: SelectQueryBuilder<Listing>,
    query: PublicListingCatalogQueryDto,
  ): void {
    if (query.agentId) {
      qb.andWhere('listing.agentId = :agentId', { agentId: query.agentId });
    }

    const city = query.city?.trim();
    const district = query.district?.trim();
    const voivodeship = query.voivodeship?.trim();
    const q = query.q?.trim();

    if (city) {
      qb.andWhere('LOWER(address.city) LIKE LOWER(:city)', {
        city: `%${city}%`,
      });
    }

    if (district) {
      qb.andWhere('LOWER(address.district) LIKE LOWER(:district)', {
        district: `%${district}%`,
      });
    }

    if (voivodeship) {
      qb.andWhere('LOWER(address.voivodeship) LIKE LOWER(:voivodeship)', {
        voivodeship: `%${voivodeship}%`,
      });
    }

    if (query.propertyType) {
      qb.andWhere('listing.propertyType = :propertyType', {
        propertyType: query.propertyType,
      });
    }

    if (query.transactionType) {
      qb.andWhere('listing.transactionType = :transactionType', {
        transactionType: query.transactionType,
      });
    }

    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      qb.andWhere('listing.showPriceOnPublicPage = true');
    }

    if (query.priceMin !== undefined) {
      qb.andWhere('listing.price >= :priceMin', { priceMin: query.priceMin });
    }

    if (query.priceMax !== undefined) {
      qb.andWhere('listing.price <= :priceMax', { priceMax: query.priceMax });
    }

    if (query.areaMin !== undefined) {
      qb.andWhere('listing.areaM2 >= :areaMin', { areaMin: query.areaMin });
    }

    if (query.areaMax !== undefined) {
      qb.andWhere('listing.areaM2 <= :areaMax', { areaMax: query.areaMax });
    }

    if (query.roomsMin !== undefined) {
      qb.andWhere('listing.rooms >= :roomsMin', { roomsMin: query.roomsMin });
    }

    if (query.roomsMax !== undefined) {
      qb.andWhere('listing.rooms <= :roomsMax', { roomsMax: query.roomsMax });
    }

    if (q) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(listing.publicTitle) LIKE LOWER(:q)', {
              q: `%${q}%`,
            })
            .orWhere('LOWER(listing.title) LIKE LOWER(:q)', { q: `%${q}%` })
            .orWhere('LOWER(listing.publicDescription) LIKE LOWER(:q)', {
              q: `%${q}%`,
            })
            .orWhere('LOWER(listing.description) LIKE LOWER(:q)', {
              q: `%${q}%`,
            })
            .orWhere('LOWER(address.city) LIKE LOWER(:q)', { q: `%${q}%` })
            .orWhere('LOWER(address.district) LIKE LOWER(:q)', {
              q: `%${q}%`,
            })
            .orWhere('LOWER(address.voivodeship) LIKE LOWER(:q)', {
              q: `%${q}%`,
            });
        }),
      );
    }
  }

  private applyPublicCatalogSort(
    qb: SelectQueryBuilder<Listing>,
    sort: PublicListingCatalogSort,
  ): void {
    switch (sort) {
      case PublicListingCatalogSort.PRICE_ASC:
        this.addPublicPriceSortSelects(qb);
        qb.orderBy('public_price_sort_missing', 'ASC')
          .addOrderBy('public_price_sort_value', 'ASC')
          .addOrderBy('listing.publishedAt', 'DESC');
        break;
      case PublicListingCatalogSort.PRICE_DESC:
        this.addPublicPriceSortSelects(qb);
        qb.orderBy('public_price_sort_missing', 'ASC')
          .addOrderBy('public_price_sort_value', 'DESC')
          .addOrderBy('listing.publishedAt', 'DESC');
        break;
      case PublicListingCatalogSort.AREA_ASC:
        this.addDisplayedAreaSortSelects(qb);
        qb.orderBy('displayed_area_sort_missing', 'ASC')
          .addOrderBy('displayed_area_sort_value', 'ASC')
          .addOrderBy('listing.publishedAt', 'DESC');
        break;
      case PublicListingCatalogSort.AREA_DESC:
        this.addDisplayedAreaSortSelects(qb);
        qb.orderBy('displayed_area_sort_missing', 'ASC')
          .addOrderBy('displayed_area_sort_value', 'DESC')
          .addOrderBy('listing.publishedAt', 'DESC');
        break;
      case PublicListingCatalogSort.NEWEST:
      default:
        qb.orderBy('listing.publishedAt', 'DESC');
        break;
    }

    qb.addOrderBy('listing.id', 'DESC');
  }

  private addPublicPriceSortSelects(qb: SelectQueryBuilder<Listing>): void {
    qb.addSelect(
      'CASE WHEN listing.showPriceOnPublicPage = true AND listing.price IS NOT NULL THEN 0 ELSE 1 END',
      'public_price_sort_missing',
    ).addSelect(
      'CASE WHEN listing.showPriceOnPublicPage = true AND listing.price IS NOT NULL THEN listing.price ELSE NULL END',
      'public_price_sort_value',
    );
  }

  private addDisplayedAreaSortSelects(qb: SelectQueryBuilder<Listing>): void {
    qb.addSelect(
      'CASE WHEN COALESCE(listing.areaM2, listing.plotAreaM2) IS NOT NULL THEN 0 ELSE 1 END',
      'displayed_area_sort_missing',
    ).addSelect(
      'COALESCE(listing.areaM2, listing.plotAreaM2)',
      'displayed_area_sort_value',
    );
  }

  /** Find listing by id with relations, or throw. */
  private async findOneOrFail(id: string): Promise<Listing> {
    const listing = await this.listingRepo.findOne({
      where: { id },
      relations: ['address', 'images', 'agent'],
    });
    if (!listing) {
      throw new NotFoundException('Oferta nie znaleziona');
    }
    this.attachCommissionAmounts([listing]);
    return listing;
  }

  /** Verify the listing belongs to the current user's agent profile. */
  private async assertOwnership(
    listing: Listing,
    userId: string,
  ): Promise<void> {
    const agent = await this.resolveAgent(userId);
    if (listing.agentId !== agent.id) {
      throw new ForbiddenException('Brak dostępu do tej oferty');
    }
  }

  private getOrderedImages(listing: Listing): ListingImage[] {
    return (listing.images ?? []).slice().sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private findListingImage(listing: Listing, imageId: string): ListingImage {
    const image = (listing.images ?? []).find((item) => item.id === imageId);

    if (!image) {
      throw new NotFoundException('Zdjęcie oferty nie znalezione');
    }

    return image;
  }

  private buildUploadPublicUrl(filename: string): string {
    const configuredBaseUrl =
      this.configService.get<string>('API_PUBLIC_URL') ||
      this.configService.get<string>('PUBLIC_API_URL') ||
      `http://localhost:${this.configService.get('PORT', 4000)}`;
    const baseUrl = configuredBaseUrl.replace(/\/+$/, '');

    return `${baseUrl}/uploads/listings/${filename}`;
  }

  private async persistUploadedImages(
    files: UploadedListingImageFile[],
  ): Promise<Array<{ filename: string; url: string }>> {
    const uploadDir = join(process.cwd(), 'uploads', 'listings');
    await mkdir(uploadDir, { recursive: true });

    const savedFiles: Array<{ filename: string; url: string }> = [];

    for (const file of files) {
      assertSafeImageUpload(file);

      const filename = `${randomUUID()}${normalizeImageExtension(
        file.originalname,
        file.mimetype,
      )}`;
      const filePath = join(uploadDir, filename);

      await writeFile(filePath, file.buffer);
      savedFiles.push({
        filename,
        url: this.buildUploadPublicUrl(filename),
      });
    }

    return savedFiles;
  }

  private async removeLocalUpload(imageUrl: string): Promise<void> {
    let pathname: string;

    try {
      pathname = new URL(imageUrl).pathname;
    } catch {
      pathname = imageUrl;
    }

    if (!pathname.startsWith('/uploads/listings/')) {
      return;
    }

    const relativePath = pathname.replace(/^\/uploads\//, '');

    try {
      await unlink(join(process.cwd(), 'uploads', relativePath));
    } catch (error) {
      this.logger.warn(
        `Could not remove listing image file ${relativePath}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async logListingImageUpdate(
    userId: string,
    listing: Listing,
    previousState: Record<string, unknown>,
  ): Promise<void> {
    const changes = this.activityService.buildChanges(
      previousState,
      this.createListingSnapshot(listing),
    );

    if (changes.length === 0) {
      return;
    }

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.LISTING,
      entityId: listing.id,
      action: ActivityAction.UPDATED,
      description: 'Zaktualizowano zdjęcia oferty',
      changes,
    });
  }

  /** Apply optional filters to the query builder. */
  private applyFilters(
    qb: SelectQueryBuilder<Listing>,
    filters: Omit<ListingQueryDto, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
  ): void {
    if (filters.propertyType) {
      qb.andWhere('listing.propertyType = :propertyType', {
        propertyType: filters.propertyType,
      });
    }

    if (filters.status) {
      qb.andWhere('listing.status = :status', { status: filters.status });
    }

    if (filters.transactionType) {
      qb.andWhere('listing.transactionType = :transactionType', {
        transactionType: filters.transactionType,
      });
    }

    if (filters.city) {
      qb.andWhere('LOWER(address.city) LIKE LOWER(:city)', {
        city: `%${filters.city}%`,
      });
    }

    if (filters.priceMin !== undefined) {
      qb.andWhere('listing.price >= :priceMin', { priceMin: filters.priceMin });
    }

    if (filters.priceMax !== undefined) {
      qb.andWhere('listing.price <= :priceMax', { priceMax: filters.priceMax });
    }

    if (filters.areaMin !== undefined) {
      qb.andWhere('listing.areaM2 >= :areaMin', { areaMin: filters.areaMin });
    }

    if (filters.areaMax !== undefined) {
      qb.andWhere('listing.areaM2 <= :areaMax', { areaMax: filters.areaMax });
    }

    if (filters.roomsMin !== undefined) {
      qb.andWhere('listing.rooms >= :roomsMin', {
        roomsMin: filters.roomsMin,
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(LOWER(listing.title) LIKE LOWER(:search) OR LOWER(listing.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }
  }

  private async attachPublicViewCounts(listings: Listing[]): Promise<void> {
    if (listings.length === 0) return;

    const listingIds = listings.map((listing) => listing.id);
    const rows = await this.analyticsEventRepo
      .createQueryBuilder('event')
      .select("event.properties ->> 'listingId'", 'listingId')
      .addSelect('COUNT(*)::int', 'viewCount')
      .where('event.name = :eventName', {
        eventName: 'public_listing_viewed',
      })
      .andWhere("event.properties ->> 'listingId' IN (:...listingIds)", {
        listingIds,
      })
      .groupBy("event.properties ->> 'listingId'")
      .getRawMany<{ listingId: string; viewCount: string }>();
    const counts = new Map(
      rows.map((row) => [row.listingId, Number(row.viewCount)]),
    );

    for (const listing of listings) {
      listing.publicViewCount = counts.get(listing.id) ?? 0;
    }
  }

  private attachCommissionAmounts(listings: Listing[]): void {
    for (const listing of listings) {
      listing.commissionAmount = calculateListingCommissionAmount(listing);
    }
  }

  private createListingSnapshot(listing: Listing): Record<string, unknown> {
    return {
      title: listing.title,
      description: listing.description ?? null,
      propertyType: listing.propertyType,
      status: listing.status,
      transactionType: listing.transactionType,
      price: listing.price,
      currency: listing.currency,
      commissionType: listing.commissionType ?? null,
      commissionValue: listing.commissionValue ?? null,
      commissionAmount: calculateListingCommissionAmount(listing),
      areaM2: listing.areaM2 ?? null,
      plotAreaM2: listing.plotAreaM2 ?? null,
      rooms: listing.rooms ?? null,
      bathrooms: listing.bathrooms ?? null,
      floor: listing.floor ?? null,
      totalFloors: listing.totalFloors ?? null,
      yearBuilt: listing.yearBuilt ?? null,
      isPremium: listing.isPremium,
      publicSlug: listing.publicSlug ?? null,
      publicationStatus: listing.publicationStatus,
      publicTitle: listing.publicTitle ?? null,
      publicDescription: listing.publicDescription ?? null,
      seoTitle: listing.seoTitle ?? null,
      seoDescription: listing.seoDescription ?? null,
      shareImageUrl: listing.shareImageUrl ?? null,
      showPriceOnPublicPage: listing.showPriceOnPublicPage,
      showExactAddressOnPublicPage: listing.showExactAddressOnPublicPage,
      estateflowBrandingEnabled: listing.estateflowBrandingEnabled,
      showPublicViewCount: listing.showPublicViewCount,
      publishedAt: listing.publishedAt?.toISOString() ?? null,
      unpublishedAt: listing.unpublishedAt?.toISOString() ?? null,
      expiresAt: listing.expiresAt?.toISOString() ?? null,
      'address.street': listing.address?.street ?? null,
      'address.city': listing.address?.city ?? null,
      'address.postalCode': listing.address?.postalCode ?? null,
      'address.district': listing.address?.district ?? null,
      'address.voivodeship': listing.address?.voivodeship ?? null,
      'address.lat': listing.address?.lat ?? null,
      'address.lng': listing.address?.lng ?? null,
      images: this.getOrderedImages(listing).map((image) => ({
        id: image.id,
        url: image.url,
        order: image.order,
        isPrimary: image.isPrimary,
        altText: image.altText ?? null,
      })),
    };
  }
}

const SELLER_LISTING_PUBLICATION_TTL_MS = 60 * 24 * 60 * 60 * 1000;

function buildSellerListingExpiresAt(now: Date): Date {
  return new Date(now.getTime() + SELLER_LISTING_PUBLICATION_TTL_MS);
}

function isListingExpired(listing: Pick<Listing, 'expiresAt'>): boolean {
  return Boolean(
    listing.expiresAt && listing.expiresAt.getTime() <= Date.now(),
  );
}

function normalizeImageExtension(
  originalName: string,
  mimetype: string,
): string {
  const extension = extname(originalName).toLowerCase();

  if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return extension;
  }

  switch (mimetype) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/jpeg':
    default:
      return '.jpg';
  }
}
