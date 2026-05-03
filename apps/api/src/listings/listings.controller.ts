import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ListingsService } from './listings.service';
import {
  CreateListingDto,
  ListingQueryDto,
  PublicListingCatalogQueryDto,
  ReorderListingImagesDto,
  UpdateListingDto,
  UpdateListingImageDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PublicSlugPipe } from '../common/public-param-security';

interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

interface IncomingUploadFile {
  mimetype: string;
}

const MAX_LISTING_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_LISTING_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const listingImageUploadInterceptor = FilesInterceptor('images', 15, {
  limits: {
    fileSize: MAX_LISTING_IMAGE_SIZE_BYTES,
    files: 15,
  },
  fileFilter: (
    _req: unknown,
    file: IncomingUploadFile,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_LISTING_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException(
          'Dozwolone formaty zdjęć to JPG, PNG oraz WebP',
        ),
        false,
      );
      return;
    }

    callback(null, true);
  },
});

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  /** POST /api/listings — create a new listing. */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingDto,
  ) {
    return this.listingsService.create(userId, dto);
  }

  /** GET /api/listings — list all listings (paginated, filtered). */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: ListingQueryDto,
  ) {
    return this.listingsService.findAll(userId, query);
  }

  /** GET /api/listings/public — list public listing URLs for sitemap. */
  @Public()
  @Get('public')
  async findPublicSitemapEntries() {
    return this.listingsService.findPublicSitemapEntries();
  }

  /** GET /api/listings/public/catalog — search public listing catalog. */
  @Public()
  @Get('public/catalog')
  async findPublicCatalog(@Query() query: PublicListingCatalogQueryDto) {
    return this.listingsService.findPublicCatalog(query);
  }

  /** GET /api/listings/public-agents/:agentId — get public agent profile. */
  @Public()
  @Get('public-agents/:agentId')
  async findPublicAgentProfile(
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ) {
    return this.listingsService.findPublicAgentProfile(agentId);
  }

  /** GET /api/listings/public/:slug — get public listing by slug. */
  @Public()
  @Get('public/:slug')
  async findPublicBySlug(@Param('slug', PublicSlugPipe) slug: string) {
    return this.listingsService.findPublicBySlug(slug);
  }

  /** GET /api/listings/:id/history — get audit log for a listing. */
  @Get(':id/history')
  async findHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.findHistory(id, userId);
  }

  /** GET /api/listings/:id — get single listing. */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.findOne(id, userId);
  }

  /** PATCH /api/listings/:id — update a listing. */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listingsService.update(id, userId, dto);
  }

  /** POST /api/listings/:id/images — upload listing images. */
  @Post(':id/images')
  @UseInterceptors(listingImageUploadInterceptor)
  async uploadImages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: UploadedImageFile[],
  ) {
    return this.listingsService.addImages(id, userId, files);
  }

  /** PATCH /api/listings/:id/images/reorder — reorder all listing images. */
  @Patch(':id/images/reorder')
  async reorderImages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReorderListingImagesDto,
  ) {
    return this.listingsService.reorderImages(id, userId, dto.imageIds);
  }

  /** PATCH /api/listings/:id/images/:imageId — update image metadata. */
  @Patch(':id/images/:imageId')
  async updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateListingImageDto,
  ) {
    return this.listingsService.updateImage(id, imageId, userId, dto);
  }

  /** POST /api/listings/:id/images/:imageId/primary — set primary image. */
  @Post(':id/images/:imageId/primary')
  async setPrimaryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.setPrimaryImage(id, imageId, userId);
  }

  /** DELETE /api/listings/:id/images/:imageId — remove a listing image. */
  @Delete(':id/images/:imageId')
  async removeImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.removeImage(id, imageId, userId);
  }

  /** POST /api/listings/:id/publish — publish public listing page. */
  @Post(':id/publish')
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.publish(id, userId);
  }

  /** POST /api/listings/:id/unpublish — unpublish public listing page. */
  @Post(':id/unpublish')
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.unpublish(id, userId);
  }

  /** POST /api/listings/:id/status/rollback — rollback latest status change. */
  @Post(':id/status/rollback')
  async rollbackStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingsService.rollbackStatus(id, userId);
  }

  /** DELETE /api/listings/:id — archive/delete a listing. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.listingsService.remove(id, userId);
  }
}
