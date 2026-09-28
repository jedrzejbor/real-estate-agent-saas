import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ListingProductsService } from './listing-products.service';

@Controller('listing-products')
export class ListingProductsController {
  constructor(private readonly listingProductsService: ListingProductsService) {}

  /** GET /api/listing-products — active public one-off listing products. */
  @Public()
  @Get()
  async findPublicProducts() {
    return this.listingProductsService.findPublicProducts();
  }
}
