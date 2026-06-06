import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanCatalog } from './entities';
import {
  AgencyPlanFeatures,
  AgencyPlanLimits,
} from '../users/agency-plan.types';

export interface PublicPlanResponse {
  code: string;
  label: string;
  description: string | null;
  priceMonthlyPln: number;
  priceYearlyPln: number;
  limits: Partial<AgencyPlanLimits>;
  features: Partial<AgencyPlanFeatures>;
  sortOrder: number;
}

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(PlanCatalog)
    private readonly planCatalogRepo: Repository<PlanCatalog>,
  ) {}

  async findPublicPlans(): Promise<PublicPlanResponse[]> {
    const plans = await this.planCatalogRepo.find({
      where: { isPublic: true },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });

    return plans.map((plan) => this.toPublicResponse(plan));
  }

  private toPublicResponse(plan: PlanCatalog): PublicPlanResponse {
    return {
      code: plan.code,
      label: plan.label,
      description: plan.description ?? null,
      priceMonthlyPln: plan.priceMonthlyPln,
      priceYearlyPln: plan.priceYearlyPln,
      limits: plan.limits,
      features: plan.features,
      sortOrder: plan.sortOrder,
    };
  }
}
