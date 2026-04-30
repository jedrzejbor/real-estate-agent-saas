import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
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

  /** POST /api/public-listing-submissions/:id/resend-verification — resend verification email. */
  @Public()
  @Post(':id/resend-verification')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async resendVerification(@Param('id') id: string, @Req() request: Request) {
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
