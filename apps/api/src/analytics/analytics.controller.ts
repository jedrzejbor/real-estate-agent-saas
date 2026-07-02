import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { PublicSlugPipe } from '../common/public-param-security';
import { AnalyticsService } from './analytics.service';
import {
  CreateAnalyticsEventDto,
  CreatePublicBlogAnalyticsEventDto,
  CreatePublicListingAnalyticsEventDto,
} from './dto/create-analytics-event.dto';
import { AdminAnalyticsUsageQueryDto } from './dto/admin-analytics-usage-query.dto';

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
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async trackPublicListing(
    @Param('slug', PublicSlugPipe) slug: string,
    @Body() dto: CreatePublicListingAnalyticsEventDto,
  ) {
    return this.analyticsService.trackPublicListing(slug, dto);
  }

  /** POST /api/analytics/public-blog/:slug/events — store public blog analytics. */
  @Public()
  @Post('public-blog/:slug/events')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async trackPublicBlog(
    @Param('slug', PublicSlugPipe) slug: string,
    @Body() dto: CreatePublicBlogAnalyticsEventDto,
  ) {
    return this.analyticsService.trackPublicBlog(slug, dto);
  }
}

@Controller('admin/analytics')
@Roles(UserRole.ADMIN)
export class AdminAnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** GET /api/admin/analytics/usage — aggregate product analytics usage for rollout review. */
  @Get('usage')
  async getUsage(@Query() query: AdminAnalyticsUsageQueryDto) {
    return this.analyticsService.getAdminUsageSummary(query);
  }
}
