import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanCatalog } from './entities';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionsService,
  type AgencyPlanPromotionPreview,
} from '../agency-plan-commerce';
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
  promotionPreview: PublicPlanPromotionPreviewResponse | null;
  limits: Partial<AgencyPlanLimits>;
  features: Partial<AgencyPlanFeatures>;
  sortOrder: number;
}

export interface PublicPlanPromotionPreviewResponse {
  monthly: PublicPlanIntervalPromotionPreviewResponse | null;
  yearly: PublicPlanIntervalPromotionPreviewResponse | null;
}

export interface PublicPlanIntervalPromotionPreviewResponse {
  label: string;
  discountGrossAmount: number;
  priceGrossAmount: number;
  durationBillingCycles: number;
}

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(PlanCatalog)
    private readonly planCatalogRepo: Repository<PlanCatalog>,
    private readonly agencyPlanPromotionsService: AgencyPlanPromotionsService,
  ) {}

  async findPublicPlans(): Promise<PublicPlanResponse[]> {
    const plans = await this.planCatalogRepo.find({
      where: { isPublic: true },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });

    const now = new Date();
    return Promise.all(plans.map((plan) => this.toPublicResponse(plan, now)));
  }

  private async toPublicResponse(
    plan: PlanCatalog,
    now: Date,
  ): Promise<PublicPlanResponse> {
    const [monthlyPreview, yearlyPreview] = await Promise.all([
      this.agencyPlanPromotionsService.resolveAutomaticPreview({
        plan,
        billingInterval: AgencyPlanBillingInterval.MONTHLY,
        now,
      }),
      this.agencyPlanPromotionsService.resolveAutomaticPreview({
        plan,
        billingInterval: AgencyPlanBillingInterval.YEARLY,
        now,
      }),
    ]);

    return {
      code: plan.code,
      label: plan.label,
      description: plan.description ?? null,
      priceMonthlyPln: plan.priceMonthlyPln,
      priceYearlyPln: plan.priceYearlyPln,
      promotionPreview: toPromotionPreview(monthlyPreview, yearlyPreview),
      limits: plan.limits,
      features: plan.features,
      sortOrder: plan.sortOrder,
    };
  }
}

function toPromotionPreview(
  monthly: AgencyPlanPromotionPreview | null,
  yearly: AgencyPlanPromotionPreview | null,
): PublicPlanPromotionPreviewResponse | null {
  if (!monthly && !yearly) return null;

  return {
    monthly: monthly ? toIntervalPromotionPreview(monthly) : null,
    yearly: yearly ? toIntervalPromotionPreview(yearly) : null,
  };
}

function toIntervalPromotionPreview(
  preview: AgencyPlanPromotionPreview,
): PublicPlanIntervalPromotionPreviewResponse {
  return {
    label: preview.label,
    discountGrossAmount: preview.discountGrossAmount,
    priceGrossAmount: preview.priceGrossAmount,
    durationBillingCycles: preview.durationBillingCycles,
  };
}
