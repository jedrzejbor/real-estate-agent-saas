import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  /** GET /api/plans — public pricing plans, excluding private/custom offers. */
  @Public()
  @Get()
  async findPublicPlans() {
    return this.plansService.findPublicPlans();
  }
}
