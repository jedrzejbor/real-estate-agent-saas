import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
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
  ) {}

  async createQuote(
    buyerUserId: string,
    dto: CreateListingQuoteDto,
  ): Promise<ListingQuoteContract> {
    const flags = this.releaseFlagsService.getFlags();
    if (!flags.privateListingCheckoutEnabled) {
      throw new ServiceUnavailableException(
        'Wycena produktów ogłoszeniowych jest obecnie niedostępna',
      );
    }
    if (dto.promotionCode?.trim()) {
      throw new BadRequestException(
        'Kody promocyjne nie są jeszcze obsługiwane w checkout',
      );
    }

    const listing = await this.listingRepo.findOne({
      where: { id: dto.listingId, ownerUserId: buyerUserId },
    });
    if (!listing) {
      // Do not disclose whether a listing owned by another user exists.
      throw new NotFoundException('Ogłoszenie nie istnieje');
    }

    const submission = await this.submissionRepo.findOne({
      where: {
        publishedListingId: listing.id,
        ownerUserId: buyerUserId,
      },
      order: { createdAt: 'DESC' },
    });
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

    const products = await this.productRepo.find({
      where: {
        code: In(productCodes),
        isActive: true,
        isPublic: true,
        archivedAt: IsNull(),
      },
    });
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

    const now = new Date();
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
      return buildListingQuote({
        listingId: listing.id,
        requestedItems: dto.items,
        productsByCode: new Map(
          products.map((product) => [product.code, product]),
        ),
        quotedAt: now,
      });
    } catch (error) {
      if (error instanceof RangeError) {
        throw new BadRequestException('Nie można obliczyć wyceny produktów');
      }
      throw error;
    }
  }
}

function hasLegacyAdminApproval(metadata: Record<string, unknown>): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const approval = metadata.adminApproval;
  return Boolean(approval && typeof approval === 'object');
}
