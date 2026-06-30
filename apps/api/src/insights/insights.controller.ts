import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsightsService } from './insights.service';

@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /** GET /api/insights — actionable dashboard insights for the current workspace. */
  @Get()
  async findDashboardInsights(@CurrentUser('id') userId: string) {
    return this.insightsService.getDashboardInsights(userId);
  }

  /** POST /api/insights/:id/dismiss — hide one dashboard insight for the current user. */
  @Post(':id/dismiss')
  async dismissDashboardInsight(
    @CurrentUser('id') userId: string,
    @Param('id') insightId: string,
  ) {
    return this.insightsService.dismissDashboardInsight(userId, insightId);
  }
}
