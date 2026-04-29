import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsEventDto } from './dto/create-analytics-event.dto';

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
}
