import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  ListingAgentCollaborationStatus,
  ListingPublicationStatus,
  ListingStatus,
} from '../common/enums';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import { Listing } from '../listings/entities';
import type { PublicListingCatalogItem } from '../listings/public-listing.model';
import { ListingAgentProposal } from '../listing-agent-proposals';
import { UsersService } from '../users';
import { AgentListingMarketQueryDto } from './dto';
import type {
  AgentListingMarketItem,
  AgentListingMarketPage,
} from './agent-listing-market.types';

@Injectable()
export class AgentListingMarketService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(ListingAgentProposal)
    private readonly proposalRepo: Repository<ListingAgentProposal>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    userId: string,
    query: AgentListingMarketQueryDto,
  ): Promise<AgentListingMarketPage> {
    const access = await this.usersService.getAgencyAccessContext(userId);

    if (!access.entitlements.features.agentListingMarket) {
      throw new FeatureAccessDeniedException({
        feature: 'agentListingMarket',
        planCode: access.entitlements.plan.code,
        message:
          'Oferty szukające agenta są dostępne w płatnych planach agentów.',
      });
    }

    const {
      page = 1,
      limit = 24,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      propertyType,
      transactionType,
      collaborationMode,
      city,
      search,
      priceMin,
      priceMax,
    } = query;

    const qb = this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('listing.images', 'images')
      .leftJoinAndSelect('listing.agent', 'agent')
      .leftJoinAndSelect('agent.agency', 'agency')
      .where('listing.agentCollaborationEnabled = :enabled', {
        enabled: true,
      })
      .andWhere('listing.agentCollaborationStatus = :collaborationStatus', {
        collaborationStatus: ListingAgentCollaborationStatus.OPEN,
      })
      .andWhere('listing.ownerUserId IS NOT NULL')
      .andWhere('listing.agentId != :agentId', { agentId: access.agent.id })
      .andWhere('listing.publicationStatus = :publicationStatus', {
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      })
      .andWhere('listing.status = :listingStatus', {
        listingStatus: ListingStatus.ACTIVE,
      })
      .andWhere('listing.publicSlug IS NOT NULL')
      .andWhere('listing.publishedAt IS NOT NULL')
      .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > :now)', {
        now: new Date(),
      });

    if (propertyType) {
      qb.andWhere('listing.propertyType = :propertyType', { propertyType });
    }

    if (transactionType) {
      qb.andWhere('listing.transactionType = :transactionType', {
        transactionType,
      });
    }

    if (collaborationMode) {
      qb.andWhere('listing.agentCollaborationMode = :collaborationMode', {
        collaborationMode,
      });
    }

    if (city?.trim()) {
      qb.andWhere('LOWER(address.city) = LOWER(:city)', {
        city: city.trim(),
      });
    }

    if (priceMin !== undefined) {
      qb.andWhere('listing.price >= :priceMin', { priceMin });
    }

    if (priceMax !== undefined) {
      qb.andWhere('listing.price <= :priceMax', { priceMax });
    }

    if (search?.trim()) {
      const searchValue = `%${search.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(listing.title) LIKE LOWER(:search)', {
              search: searchValue,
            })
            .orWhere('LOWER(listing.publicTitle) LIKE LOWER(:search)', {
              search: searchValue,
            })
            .orWhere('LOWER(address.city) LIKE LOWER(:search)', {
              search: searchValue,
            })
            .orWhere('LOWER(address.district) LIKE LOWER(:search)', {
              search: searchValue,
            });
        }),
      );
    }

    const sortColumn = getSortColumn(sortBy);
    qb.orderBy(sortColumn, sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .addOrderBy('listing.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [listings, total] = await qb.getManyAndCount();
    const submittedProposalListingIds = await this.findSubmittedProposalListingIds(
      access.agent.id,
      listings.map((listing) => listing.id),
    );

    return {
      data: listings.map((listing) =>
        toAgentListingMarketItem(listing, submittedProposalListingIds),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sort: `${sortBy}:${sortOrder}`,
      },
    };
  }

  private async findSubmittedProposalListingIds(
    agentId: string,
    listingIds: string[],
  ): Promise<Set<string>> {
    if (listingIds.length === 0) {
      return new Set();
    }

    const rows = await this.proposalRepo
      .createQueryBuilder('proposal')
      .select('proposal.listingId', 'listingId')
      .where('proposal.agentId = :agentId', { agentId })
      .andWhere('proposal.listingId IN (:...listingIds)', { listingIds })
      .getRawMany<{ listingId: string }>();

    return new Set(rows.map((row) => row.listingId));
  }
}

function getSortColumn(sortBy: string): string {
  switch (sortBy) {
    case 'price':
      return 'listing.price';
    case 'publishedAt':
      return 'listing.publishedAt';
    case 'updatedAt':
      return 'listing.updatedAt';
    case 'createdAt':
    default:
      return 'listing.agentCollaborationOpenedAt';
  }
}

function toAgentListingMarketItem(
  listing: Listing,
  submittedProposalListingIds: Set<string>,
): AgentListingMarketItem {
  return {
    ...toPublicCatalogItem(listing),
    collaboration: {
      mode: listing.agentCollaborationMode ?? null,
      openedAt: listing.agentCollaborationOpenedAt ?? null,
      preferences: listing.agentCollaborationPreferences ?? null,
    },
    hasSubmittedProposal: submittedProposalListingIds.has(listing.id),
  };
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
