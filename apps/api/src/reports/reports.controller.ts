import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { UserRole } from '../common/enums';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /api/reports/overview
   * Foundation endpoint for the Reports module.
   * Enforces scope in the service based on the authenticated user's role.
   */
  @Get('overview')
  async getOverview(
    @CurrentUser()
    user: { id: string; email: string; role: UserRole },
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getOverview(user, filters);
  }

  /**
   * GET /api/reports/listings
   * Dedicated listings report with summary and breakdowns.
   */
  @Get('listings')
  async getListings(
    @CurrentUser()
    user: { id: string; email: string; role: UserRole },
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getListingsReport(user, filters);
  }

  /**
   * GET /api/reports/clients
   * Dedicated clients report with summary and breakdowns.
   */
  @Get('clients')
  async getClients(
    @CurrentUser()
    user: { id: string; email: string; role: UserRole },
    @Query() filters: ReportFiltersDto,
  ) {
    return this.reportsService.getClientsReport(user, filters);
  }
}
