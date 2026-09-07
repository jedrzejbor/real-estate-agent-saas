import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminListingProductsService } from './admin-listing-products.service';
import {
  CreateListingProductDto,
  ListingProductActionDto,
  UpdateListingProductDto,
} from './dto';

@Controller('admin/listing-products')
@Roles(UserRole.ADMIN)
export class AdminListingProductsController {
  constructor(
    private readonly adminListingProductsService: AdminListingProductsService,
  ) {}

  @Get()
  async findProducts() {
    return this.adminListingProductsService.findProducts();
  }

  @Post()
  async createProduct(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: CreateListingProductDto,
  ) {
    return this.adminListingProductsService.createProduct(adminUserId, dto);
  }

  @Get(':code/history')
  async findHistory(@Param('code') code: string) {
    return this.adminListingProductsService.findHistory(code);
  }

  @Get(':code')
  async findProduct(@Param('code') code: string) {
    return this.adminListingProductsService.findProduct(code);
  }

  @Patch(':code')
  async updateProduct(
    @CurrentUser('id') adminUserId: string,
    @Param('code') code: string,
    @Body() dto: UpdateListingProductDto,
  ) {
    return this.adminListingProductsService.updateProduct(
      adminUserId,
      code,
      dto,
    );
  }

  @Post(':code/archive')
  @HttpCode(HttpStatus.OK)
  async archiveProduct(
    @CurrentUser('id') adminUserId: string,
    @Param('code') code: string,
    @Body() dto: ListingProductActionDto,
  ) {
    return this.adminListingProductsService.archiveProduct(
      adminUserId,
      code,
      dto.reason,
    );
  }

  @Post(':code/restore')
  @HttpCode(HttpStatus.OK)
  async restoreProduct(
    @CurrentUser('id') adminUserId: string,
    @Param('code') code: string,
    @Body() dto: ListingProductActionDto,
  ) {
    return this.adminListingProductsService.restoreProduct(
      adminUserId,
      code,
      dto.reason,
    );
  }
}
