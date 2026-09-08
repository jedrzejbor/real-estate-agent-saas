import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ReleaseFlagsService } from '../release-flags';
import type { PublicListingProductContract } from './contracts';
import { ListingProductCatalog } from './entities';
import { toPublicListingProduct } from './listing-product.presenter';
import { ListingProductType } from './listing-commerce.types';

@Injectable()
export class ListingProductsService {
  constructor(
    @InjectRepository(ListingProductCatalog)
    private readonly productRepo: Repository<ListingProductCatalog>,
    private readonly releaseFlagsService: ReleaseFlagsService,
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
    return products
      .filter(
        (product) =>
          flags.privateListingFeaturedEnabled ||
          product.type !== ListingProductType.FEATURED,
      )
      .map(toPublicListingProduct);
  }
}
