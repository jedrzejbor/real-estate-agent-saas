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
  ListingStatus,
} from '../common/enums';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingQueryDto } from './dto/listing-query.dto';

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

  async create(
    userId: string,
    dto: CreateListingDto,
  ): Promise<Listing> {
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

    const latestStatusChange = await this.activityService.findLatestStatusChange(
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

    // Handle status transitions
    if (dto.status === ListingStatus.ACTIVE && !listing.publishedAt) {
      listing.publishedAt = new Date();
    }

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
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }
    return agent;
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
      publishedAt: listing.publishedAt?.toISOString() ?? null,
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
