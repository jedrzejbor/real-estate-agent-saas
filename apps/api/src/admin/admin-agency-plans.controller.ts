import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminAgencyPlansService } from './admin-agency-plans.service';
import { UpdateAgencyPlanDto } from './dto';

@Controller('admin/agencies/:id/plan')
@Roles(UserRole.ADMIN)
export class AdminAgencyPlansController {
  constructor(
    private readonly adminAgencyPlansService: AdminAgencyPlansService,
  ) {}

  /** GET /api/admin/agencies/:id/plan — get plan, usage and effective entitlements. */
  @Get()
  async findAgencyPlan(@Param('id', ParseUUIDPipe) agencyId: string) {
    return this.adminAgencyPlansService.findAgencyPlan(agencyId);
  }

  /** PATCH /api/admin/agencies/:id/plan — assign standard or custom plan to agency. */
  @Patch()
  async updateAgencyPlan(
    @Param('id', ParseUUIDPipe) agencyId: string,
    @Body() dto: UpdateAgencyPlanDto,
  ) {
    return this.adminAgencyPlansService.updateAgencyPlan(agencyId, dto);
  }

  /** POST /api/admin/agencies/:id/plan/reset-overrides — clear agency-specific overrides. */
  @Post('reset-overrides')
  async resetAgencyPlanOverrides(
    @Param('id', ParseUUIDPipe) agencyId: string,
  ) {
    return this.adminAgencyPlansService.resetAgencyPlanOverrides(agencyId);
  }
}
