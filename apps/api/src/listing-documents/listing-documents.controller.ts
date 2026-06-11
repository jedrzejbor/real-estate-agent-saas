import {
  BadRequestException,
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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MAX_DOCUMENT_UPLOAD_SIZE_BYTES } from '../common/document-upload-security';
import {
  CreateListingDocumentDto,
  UpdateListingDocumentDto,
} from './dto';
import { ListingDocumentsService } from './listing-documents.service';

interface UploadedDocumentFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

interface IncomingUploadFile {
  mimetype: string;
}

const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const documentUploadInterceptor = FileInterceptor('file', {
  limits: {
    fileSize: MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (
    _req: unknown,
    file: IncomingUploadFile,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
      callback(
        new BadRequestException('Dozwolone formaty dokumentów to PDF, JPG i PNG'),
        false,
      );
      return;
    }

    callback(null, true);
  },
});

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

  @Get('checklist')
  async getChecklist(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.listingDocumentsService.getChecklist(listingId, userId);
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
  @UseInterceptors(documentUploadInterceptor)
  async createMetadata(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateListingDocumentDto,
    @UploadedFile() file?: UploadedDocumentFile,
  ) {
    if (file) {
      return this.listingDocumentsService.upload(listingId, userId, dto, file);
    }

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

  @Get(':documentId/download')
  async download(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const download = await this.listingDocumentsService.download(
      listingId,
      documentId,
      userId,
    );

    response.set({
      'Content-Type': download.mimeType,
      'Content-Length': String(download.fileSize),
      'Content-Disposition': `attachment; filename="${encodeHeaderFilename(
        download.filename,
      )}"`,
    });

    return new StreamableFile(download.stream);
  }
}

function encodeHeaderFilename(value: string): string {
  return value.replace(/["\\\r\n]/g, '_');
}
