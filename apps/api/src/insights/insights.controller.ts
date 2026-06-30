import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
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

  /** GET /api/insights/dismissed — list dashboard insights hidden by the current user. */
  @Get('dismissed')
  async findDismissedDashboardInsights(@CurrentUser('id') userId: string) {
    return this.insightsService.getDismissedDashboardInsights(userId);
  }

  /** POST /api/insights/:id/dismiss — hide one dashboard insight for the current user. */
  @Post(':id/dismiss')
  async dismissDashboardInsight(
    @CurrentUser('id') userId: string,
    @Param('id') insightId: string,
  ) {
    return this.insightsService.dismissDashboardInsight(userId, insightId);
  }

  /** DELETE /api/insights/:id/dismiss — restore one hidden dashboard insight for the current user. */
  @Delete(':id/dismiss')
  async restoreDashboardInsight(
    @CurrentUser('id') userId: string,
    @Param('id') insightId: string,
  ) {
    return this.insightsService.restoreDashboardInsight(userId, insightId);
  }
}
