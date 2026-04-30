import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository, SelectQueryBuilder } from 'typeorm';
import { ActivityService } from '../activity';
import { Listing } from './entities/listing.entity';
import { Address } from './entities/address.entity';
import { Agent } from '../users/entities/agent.entity';
import { UsersService } from '../users';
import {
  ActivityAction,
  ActivityEntityType,
  ListingPublicationStatus,
  ListingStatus,
} from '../common/enums';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import { assertPublicListingModerationPassed } from '../common/public-listing-moderation';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';
import {
  PublicAgentProfileView,
  PublicListingSitemapEntry,
  PublicListingView,
} from './public-listing.model';

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

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly usersService: UsersService,
    private readonly activityService: ActivityService,
  ) {}

  // ── Create ──

  async create(userId: string, dto: CreateListingDto): Promise<Listing> {
    const { agent } = await this.assertListingCreateWithinPlanLimit(userId);

    const { address: addressDto, ...listingData } = dto;

    const listing = this.listingRepo.create({
      ...listingData,
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

    // Merge listing fields
    Object.assign(listing, listingData);

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
      const isStatusOnlyChange =
        changes.length === 1 && changes[0].field === 'status';

      await this.activityService.log({
        userId,
        entityType: ActivityEntityType.LISTING,
        entityId: updatedListing.id,
        action: isStatusOnlyChange
          ? ActivityAction.STATUS_CHANGED
          : ActivityAction.UPDATED,
        description: isStatusOnlyChange
          ? 'Zmieniono status oferty'
          : 'Zaktualizowano ofertę',
        changes,
      });
    }

    return updatedListing;
  }

  async publish(id: string, userId: string): Promise<Listing> {
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
    listing.publicationStatus = ListingPublicationStatus.PUBLISHED;
    listing.publishedAt = listing.publishedAt ?? new Date();
    listing.unpublishedAt = null;

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
      description: 'Opublikowano publiczną stronę oferty',
      changes,
    });

    return publishedListing;
  }

  async unpublish(id: string, userId: string): Promise<Listing> {
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

    return unpublishedListing;
  }

  async findPublicBySlug(slug: string): Promise<PublicListingView> {
    const listing = await this.listingRepo.findOne({
      where: {
        publicSlug: slug,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
      relations: ['address', 'images', 'agent', 'agent.agency'],
    });

    if (!listing || !listing.publicSlug || !listing.publishedAt) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    return this.toPublicListingView(listing);
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
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
      relations: ['address', 'images'],
      order: {
        publishedAt: 'DESC',
      },
    });

    const publicListings = listings
      .filter((listing) => Boolean(listing.publicSlug && listing.publishedAt))
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
          publicationStatus: ListingPublicationStatus.PUBLISHED,
        },
        order: {
          updatedAt: 'DESC',
        },
      })
      .then((listings) =>
        listings
          .filter((listing): listing is Listing & { publicSlug: string } =>
            Boolean(listing.publicSlug),
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
          planCode: access.entitlements.plan.code,
          message:
            'Osiągnięto limit aktywnych ofert w Twoim planie. Przejdź na wyższy plan, aby dodać kolejną ofertę.',
        });
      }
    }

    return { agent: access.agent };
  }

  private assertListingCanBePublished(listing: Listing): void {
    if (listing.status === ListingStatus.ARCHIVED) {
      throw new BadRequestException(
        'Nie można opublikować zarchiwizowanej oferty',
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
    if (!listing.publicSlug || !listing.publishedAt) {
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
      publishedAt: listing.publishedAt,
      updatedAt: listing.updatedAt,
    };
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

  private createListingSnapshot(listing: Listing): Record<string, unknown> {
    return {
      title: listing.title,
      description: listing.description ?? null,
      propertyType: listing.propertyType,
      status: listing.status,
      transactionType: listing.transactionType,
      price: listing.price,
      currency: listing.currency,
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
      publishedAt: listing.publishedAt?.toISOString() ?? null,
      unpublishedAt: listing.unpublishedAt?.toISOString() ?? null,
      'address.street': listing.address?.street ?? null,
      'address.city': listing.address?.city ?? null,
      'address.postalCode': listing.address?.postalCode ?? null,
      'address.district': listing.address?.district ?? null,
      'address.voivodeship': listing.address?.voivodeship ?? null,
      'address.lat': listing.address?.lat ?? null,
      'address.lng': listing.address?.lng ?? null,
    };
  }
}
