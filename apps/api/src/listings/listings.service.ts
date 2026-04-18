import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Listing } from './entities/listing.entity';
import { Address } from './entities/address.entity';
import { Agent } from '../users/entities/agent.entity';
import { ListingStatus } from '../common/enums';
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
  ) {}

  // ── Create ──

  async create(
    userId: string,
    dto: CreateListingDto,
  ): Promise<Listing> {
    const agent = await this.resolveAgent(userId);

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

    return this.findOneOrFail(savedListing.id);
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

  // ── Update ──

  async update(
    id: string,
    userId: string,
    dto: UpdateListingDto,
  ): Promise<Listing> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);

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

    return this.findOneOrFail(id);
  }

  // ── Delete (soft → archived, or hard delete for drafts) ──

  async remove(id: string, userId: string): Promise<void> {
    const listing = await this.findOneOrFail(id);
    await this.assertOwnership(listing, userId);

    if (listing.status === ListingStatus.DRAFT) {
      await this.listingRepo.remove(listing);
      this.logger.log(`Draft listing hard-deleted: ${id}`);
    } else {
      listing.status = ListingStatus.ARCHIVED;
      await this.listingRepo.save(listing);
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
}
