import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import { ReleaseFlagsService } from '../release-flags';
import type { ListingQuoteContract } from './contracts';
import { CreateListingQuoteDto } from './dto';
import { ListingProductCatalog } from './entities';
import { buildListingQuote } from './listing-quote.calculator';
import {
  assertCanPurchaseListingProducts,
  ListingProductUnavailableError,
} from './listing-purchase.policy';
import { ListingProductType } from './listing-commerce.types';
import { ListingManualAdjustmentsService } from './listing-manual-adjustments.service';
import { ListingPromotionsService } from './listing-promotions.service';

export interface AuthorizedListingQuote {
  quote: ListingQuoteContract;
  products: ListingProductCatalog[];
}

interface ListingQuotePersistence {
  findOwnedListing(
    listingId: string,
    buyerUserId: string,
  ): Promise<Listing | null>;
  findOwnedSubmission(
    listingId: string,
    buyerUserId: string,
  ): Promise<PublicListingSubmission | null>;
  findAvailableProducts(codes: string[]): Promise<ListingProductCatalog[]>;
}

@Injectable()
export class ListingQuotesService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(PublicListingSubmission)
    private readonly submissionRepo: Repository<PublicListingSubmission>,
    @InjectRepository(ListingProductCatalog)
    private readonly productRepo: Repository<ListingProductCatalog>,
    private readonly releaseFlagsService: ReleaseFlagsService,
    private readonly promotionsService: ListingPromotionsService,
    private readonly manualAdjustmentsService: ListingManualAdjustmentsService,
  ) {}

  async createQuote(
    buyerUserId: string,
    dto: CreateListingQuoteDto,
  ): Promise<ListingQuoteContract> {
    const result = await this.buildAuthorizedQuote(
      this.repositoryPersistence(),
      buyerUserId,
      dto,
      new Date(),
    );
    return result.quote;
  }

  /** Shared transaction-aware entry point used while persisting an order. */
  createQuoteInTransaction(
    manager: EntityManager,
    buyerUserId: string,
    dto: CreateListingQuoteDto,
    quotedAt: Date,
  ): Promise<AuthorizedListingQuote> {
    return this.buildAuthorizedQuote(
      this.transactionPersistence(manager),
      buyerUserId,
      dto,
      quotedAt,
    );
  }

  private async buildAuthorizedQuote(
    persistence: ListingQuotePersistence,
    buyerUserId: string,
    dto: CreateListingQuoteDto,
    now: Date,
  ): Promise<AuthorizedListingQuote> {
    const flags = this.releaseFlagsService.getFlags();
    if (!flags.privateListingCheckoutEnabled) {
      throw new ServiceUnavailableException(
        'Wycena produktów ogłoszeniowych jest obecnie niedostępna',
      );
    }
    if (dto.promotionCode?.trim() && !flags.privateListingPromotionsEnabled) {
      throw new BadRequestException(
        'Kody promocyjne nie są jeszcze obsługiwane w checkout',
      );
    }

    const listing = await persistence.findOwnedListing(
      dto.listingId,
      buyerUserId,
    );
    if (!listing) {
      // Do not disclose whether a listing owned by another user exists.
      throw new NotFoundException('Ogłoszenie nie istnieje');
    }

    const submission = await persistence.findOwnedSubmission(
      listing.id,
      buyerUserId,
    );
    if (!submission) {
      throw new BadRequestException(
        'Checkout jest dostępny wyłącznie dla ogłoszeń klientów indywidualnych',
      );
    }

    const productCodes = dto.items.map((item) => item.productCode);
    if (new Set(productCodes).size !== productCodes.length) {
      throw new BadRequestException(
        'Każdy produkt może wystąpić w wycenie tylko raz',
      );
    }

    const products = await persistence.findAvailableProducts(productCodes);
    if (products.length !== productCodes.length) {
      throw new BadRequestException(
        'Co najmniej jeden wybrany produkt jest niedostępny',
      );
    }

    const currencies = new Set(products.map((product) => product.currency));
    if (currencies.size !== 1) {
      throw new BadRequestException(
        'Produkty w jednej wycenie muszą mieć tę samą walutę',
      );
    }
    if (
      !flags.privateListingFeaturedEnabled &&
      products.some((product) => product.type === ListingProductType.FEATURED)
    ) {
      throw new BadRequestException('Wyróżnienia nie są jeszcze dostępne');
    }

    try {
      assertCanPurchaseListingProducts(
        {
          listingStatus: listing.status,
          publicationStatus: listing.publicationStatus,
          publishedAt: listing.publishedAt ?? null,
          expiresAt: listing.expiresAt ?? null,
          moderationStatus: submission.status,
          hasLegacyAdminApproval: hasLegacyAdminApproval(submission.metadata),
          now,
        },
        products.map((product) => product.type),
      );
    } catch (error) {
      if (error instanceof ListingProductUnavailableError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    try {
      const promotionDiscounts = flags.privateListingPromotionsEnabled
        ? await this.promotionsService.resolveDiscounts({
            products,
            promotionCode: dto.promotionCode,
            now,
          })
        : [];
      const manualAdjustmentDiscounts =
        await this.manualAdjustmentsService.resolveDiscounts({
          listingId: listing.id,
          products,
          now,
        });

      return {
        quote: buildListingQuote({
          listingId: listing.id,
          requestedItems: dto.items,
          productsByCode: new Map(
            products.map((product) => [product.code, product]),
          ),
          quotedAt: now,
          discounts: [...promotionDiscounts, ...manualAdjustmentDiscounts],
        }),
        products,
      };
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException('Nie można obliczyć wyceny produktów');
      }
      throw error;
    }
  }

  private repositoryPersistence(): ListingQuotePersistence {
    return {
      findOwnedListing: (listingId, buyerUserId) =>
        this.listingRepo.findOne({
          where: { id: listingId, ownerUserId: buyerUserId },
        }),
      findOwnedSubmission: (listingId, buyerUserId) =>
        this.submissionRepo.findOne({
          where: { publishedListingId: listingId, ownerUserId: buyerUserId },
          order: { createdAt: 'DESC' },
        }),
      findAvailableProducts: (codes) =>
        this.productRepo.find({
          where: {
            code: In(codes),
            isActive: true,
            isPublic: true,
            archivedAt: IsNull(),
          },
        }),
    };
  }

  private transactionPersistence(
    manager: EntityManager,
  ): ListingQuotePersistence {
    return {
      findOwnedListing: (listingId, buyerUserId) =>
        manager.findOne(Listing, {
          where: { id: listingId, ownerUserId: buyerUserId },
          lock: { mode: 'pessimistic_write' },
        }),
      findOwnedSubmission: (listingId, buyerUserId) =>
        manager.findOne(PublicListingSubmission, {
          where: { publishedListingId: listingId, ownerUserId: buyerUserId },
          order: { createdAt: 'DESC' },
        }),
      findAvailableProducts: (codes) =>
        manager.find(ListingProductCatalog, {
          where: {
            code: In(codes),
            isActive: true,
            isPublic: true,
            archivedAt: IsNull(),
          },
          lock: { mode: 'pessimistic_read' },
        }),
    };
  }
}

function hasLegacyAdminApproval(metadata: Record<string, unknown>): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const approval = metadata.adminApproval;
  return Boolean(approval && typeof approval === 'object');
}
