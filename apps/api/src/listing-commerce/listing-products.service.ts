import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ReleaseFlagsService } from '../release-flags';
import type { PublicListingProductContract } from './contracts';
import { ListingProductCatalog } from './entities';
import { toPublicListingProduct } from './listing-product.presenter';
import { ListingProductType } from './listing-commerce.types';
import { ListingPromotionsService } from './listing-promotions.service';

@Injectable()
export class ListingProductsService {
  constructor(
    @InjectRepository(ListingProductCatalog)
    private readonly productRepo: Repository<ListingProductCatalog>,
    private readonly releaseFlagsService: ReleaseFlagsService,
    private readonly promotionsService: ListingPromotionsService,
  ) {}

  async findPublicProducts(): Promise<PublicListingProductContract[]> {
    if (!this.releaseFlagsService.getFlags().privateListingPricingEnabled) {
      return [];
    }

    const products = await this.productRepo.find({
      where: {
        isActive: true,
        isPublic: true,
        archivedAt: IsNull(),
      },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });

    const flags = this.releaseFlagsService.getFlags();
    const publicProducts = products.filter(
      (product) =>
        flags.privateListingFeaturedEnabled ||
        product.type !== ListingProductType.FEATURED,
    );

    if (!flags.privateListingPromotionsEnabled) {
      return publicProducts.map(toPublicListingProduct);
    }

    const now = new Date();
    return Promise.all(
      publicProducts.map(async (product) => {
        const discounts = await this.promotionsService.resolveDiscounts({
          products: [product],
          now,
        });
        const discountGrossAmount = discounts.reduce(
          (sum, discount) => sum + discount.grossAmount,
          0,
        );
        return {
          ...toPublicListingProduct(product),
          promotionPreview:
            discountGrossAmount > 0
              ? {
                  label:
                    discounts.length === 1
                      ? discounts[0].label
                      : 'Aktywne promocje',
                  discountGrossAmount,
                  priceGrossAmount: Math.max(
                    0,
                    product.priceGrossAmount - discountGrossAmount,
                  ),
                }
              : null,
        };
      }),
    );
  }
}
