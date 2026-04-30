import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AnalyticsService } from './analytics.service';
import {
  CreateAnalyticsEventDto,
  CreatePublicListingAnalyticsEventDto,
} from './dto/create-analytics-event.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** POST /api/analytics/events — store a product analytics event. */
  @Post('events')
  @HttpCode(HttpStatus.ACCEPTED)
  async track(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAnalyticsEventDto,
  ) {
    return this.analyticsService.track(userId, dto);
  }

  /** POST /api/analytics/public-listings/:slug/events — store public listing analytics. */
  @Public()
  @Post('public-listings/:slug/events')
  @HttpCode(HttpStatus.ACCEPTED)
  async trackPublicListing(
    @Param('slug') slug: string,
    @Body() dto: CreatePublicListingAnalyticsEventDto,
  ) {
    return this.analyticsService.trackPublicListing(slug, dto);
  }
}
