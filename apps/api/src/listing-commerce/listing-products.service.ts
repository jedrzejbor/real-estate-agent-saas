import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ReleaseFlagsService } from '../release-flags';
import type { PublicListingProductContract } from './contracts';
import { ListingProductCatalog } from './entities';
import { toPublicListingProduct } from './listing-product.presenter';

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

    return products.map(toPublicListingProduct);
  }
}
