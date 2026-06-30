import { Controller, Get } from '@nestjs/common';
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
}
