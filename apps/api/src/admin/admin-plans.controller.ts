import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AdminPlansService } from './admin-plans.service';
import { UpdatePlanDto } from './dto';

@Controller('admin/plans')
@Roles(UserRole.ADMIN)
export class AdminPlansController {
  constructor(private readonly adminPlansService: AdminPlansService) {}

  /** GET /api/admin/plans — list global plans for admin editing. */
  @Get()
  async findPlans() {
    return this.adminPlansService.findPlans();
  }

  /** GET /api/admin/plans/:code — get one global plan for admin editing. */
  @Get(':code')
  async findPlan(@Param('code') code: string) {
    return this.adminPlansService.findPlan(code);
  }

  /** PATCH /api/admin/plans/:code — update prices, limits, features and visibility. */
  @Patch(':code')
  async updatePlan(@Param('code') code: string, @Body() dto: UpdatePlanDto) {
    return this.adminPlansService.updatePlan(code, dto);
  }
}
