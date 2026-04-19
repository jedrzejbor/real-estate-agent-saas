import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /** GET /api/dashboard/stats — aggregated dashboard statistics. */
  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.dashboardService.getStats(userId);
  }
}
