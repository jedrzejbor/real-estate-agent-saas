import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateListingDocumentDto,
  UpdateListingDocumentDto,
} from './dto';
import { ListingDocumentsService } from './listing-documents.service';

@Controller('listings/:listingId/documents')
export class ListingDocumentsController {
  constructor(
    private readonly listingDocumentsService: ListingDocumentsService,
  ) {}

  @Get()
  async findAll(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingDocumentsService.findAll(listingId, userId);
  }

  @Get(':documentId')
  async findOne(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingDocumentsService.findOne(
      listingId,
      documentId,
      userId,
    );
  }

  @Post()
  async createMetadata(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingDocumentDto,
  ) {
    return this.listingDocumentsService.createMetadata(listingId, userId, dto);
  }

  @Patch(':documentId')
  async updateMetadata(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateListingDocumentDto,
  ) {
    return this.listingDocumentsService.updateMetadata(
      listingId,
      documentId,
      userId,
      dto,
    );
  }

  @Delete(':documentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.listingDocumentsService.remove(listingId, documentId, userId);
  }
}
