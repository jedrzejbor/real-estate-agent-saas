import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminAgencyPlansService } from './admin-agency-plans.service';
import { AdminAgenciesQueryDto } from './dto';

@Controller('admin/agencies')
@Roles(UserRole.ADMIN)
export class AdminAgenciesController {
  constructor(
    private readonly adminAgencyPlansService: AdminAgencyPlansService,
  ) {}

  /** GET /api/admin/agencies — list agencies for admin plan assignment. */
  @Get()
  async findAgencies(@Query() query: AdminAgenciesQueryDto) {
    return this.adminAgencyPlansService.findAgencies(query);
  }
}
