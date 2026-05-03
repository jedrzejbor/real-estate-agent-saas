import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ClaimPublicListingSubmissionDto,
  CreatePublicListingSubmissionDto,
  VerifyPublicListingSubmissionDto,
} from './dto';
import { PublicListingSubmissionsService } from './public-listing-submissions.service';

interface UploadedSubmissionImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

interface IncomingUploadFile {
  mimetype: string;
}

const MAX_PUBLIC_SUBMISSION_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PUBLIC_SUBMISSION_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const publicSubmissionImageUploadInterceptor = FilesInterceptor('images', 15, {
  limits: {
    fileSize: MAX_PUBLIC_SUBMISSION_IMAGE_SIZE_BYTES,
    files: 15,
  },
  fileFilter: (
    _req: unknown,
    file: IncomingUploadFile,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_PUBLIC_SUBMISSION_IMAGE_MIME_TYPES.has(file.mimetype)) {
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

@Controller('public-listing-submissions')
export class PublicListingSubmissionsController {
  constructor(
    private readonly submissionsService: PublicListingSubmissionsService,
  ) {}

  /** POST /api/public-listing-submissions — submit public listing draft and send verification email. */
  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePublicListingSubmissionDto,
    @Req() request: Request,
  ) {
    return this.submissionsService.create(dto, request);
  }

  /** POST /api/public-listing-submissions/images — upload temporary public submission images. */
  @Public()
  @Post('images')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(publicSubmissionImageUploadInterceptor)
  async uploadImages(@UploadedFiles() files: UploadedSubmissionImageFile[]) {
    return this.submissionsService.uploadImages(files);
  }

  /** POST /api/public-listing-submissions/:id/resend-verification — resend verification email. */
  @Public()
  @Post(':id/resend-verification')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async resendVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: Request,
  ) {
    return this.submissionsService.resendVerification(id, request);
  }

  /** POST /api/public-listing-submissions/verify — verify public listing submission email token. */
  @Public()
  @Post('verify')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async verify(@Body() dto: VerifyPublicListingSubmissionDto) {
    return this.submissionsService.verify(dto);
  }

  /** POST /api/public-listing-submissions/claim — claim verified public submission into current workspace. */
  @Post('claim')
  @HttpCode(HttpStatus.CREATED)
  async claim(
    @CurrentUser('id') userId: string,
    @Body() dto: ClaimPublicListingSubmissionDto,
  ) {
    return this.submissionsService.claim(userId, dto);
  }
}
