import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans';
import type { AgencyPlanQuoteContract } from './contracts';
import { AgencyPlanQuote } from './entities';
import {
  AgencyPlanBillingInterval,
  AgencyPlanQuoteStatus,
  AgencyPlanQuoteDiscountSnapshot,
} from './agency-plan-commerce.types';

export interface CreateAgencyPlanQuoteInput {
  planCode: AgencyPlan;
  billingInterval: AgencyPlanBillingInterval;
  userId?: string | null;
  agencyId?: string | null;
  now?: Date;
  discounts?: readonly AgencyPlanQuoteDiscountSnapshot[];
}

const AGENCY_PLAN_QUOTE_TTL_MS = 15 * 60 * 1000;
const AGENCY_PLAN_CURRENCY = 'PLN' as const;
const MAX_PERSISTED_GROSS_AMOUNT = 2_147_483_647;

@Injectable()
export class AgencyPlanQuotesService {
  constructor(
    @InjectRepository(PlanCatalog)
    private readonly planCatalogRepo: Repository<PlanCatalog>,
    @InjectRepository(AgencyPlanQuote)
    private readonly quoteRepo: Repository<AgencyPlanQuote>,
  ) {}

  async createQuote(
    input: CreateAgencyPlanQuoteInput,
  ): Promise<AgencyPlanQuoteContract> {
    const quotedAt = input.now ?? new Date();
    const plan = await this.findQuotablePlan(input.planCode);
    const subtotalGrossAmount = getPlanPrice(plan, input.billingInterval);
    const discounts = normalizeDiscounts(input.discounts ?? []);
    const discountGrossAmount = allocateDiscount(subtotalGrossAmount, discounts);
    const totalGrossAmount = subtotalGrossAmount - discountGrossAmount;

    assertPersistableAmount(subtotalGrossAmount, 'subtotalGrossAmount');
    assertPersistableAmount(discountGrossAmount, 'discountGrossAmount');
    assertPersistableAmount(totalGrossAmount, 'totalGrossAmount');

    const quoteId = randomUUID();
    const expiresAt = getAgencyPlanQuoteExpiry(quotedAt);
    const snapshot = buildAgencyPlanQuoteSnapshot({
      quoteId,
      plan,
      billingInterval: input.billingInterval,
      quotedAt,
      expiresAt,
      subtotalGrossAmount,
      discountGrossAmount,
      totalGrossAmount,
      discounts,
    });
    const quote = this.quoteRepo.create({
      id: quoteId,
      userId: input.userId ?? null,
      agencyId: input.agencyId ?? null,
      planCode: plan.code as AgencyPlan,
      billingInterval: input.billingInterval,
      status: AgencyPlanQuoteStatus.QUOTED,
      currency: AGENCY_PLAN_CURRENCY,
      subtotalGrossAmount,
      discountGrossAmount,
      totalGrossAmount,
      pricingSnapshot: snapshot,
      quotedAt,
      expiresAt,
      metadata: {},
    });

    await this.quoteRepo.save(quote);

    return snapshot;
  }

  private async findQuotablePlan(planCode: AgencyPlan): Promise<PlanCatalog> {
    if (planCode === AgencyPlan.CUSTOM) {
      throw new BadRequestException('Plan indywidualny wymaga kontaktu z zespołem');
    }

    const plan = await this.planCatalogRepo.findOne({
      where: { code: planCode, isPublic: true },
    });

    if (!plan) {
      throw new NotFoundException('Plan nie jest dostępny w publicznym cenniku');
    }

    return plan;
  }
}

function buildAgencyPlanQuoteSnapshot(input: {
  quoteId: string;
  plan: PlanCatalog;
  billingInterval: AgencyPlanBillingInterval;
  quotedAt: Date;
  expiresAt: Date;
  subtotalGrossAmount: number;
  discountGrossAmount: number;
  totalGrossAmount: number;
  discounts: readonly AgencyPlanQuoteDiscountSnapshot[];
}): AgencyPlanQuoteContract {
  return {
    quoteId: input.quoteId,
    planCode: input.plan.code as AgencyPlan,
    planLabel: input.plan.label,
    billingInterval: input.billingInterval,
    currency: AGENCY_PLAN_CURRENCY,
    quotedAt: input.quotedAt.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    subtotalGrossAmount: input.subtotalGrossAmount,
    discountGrossAmount: input.discountGrossAmount,
    totalGrossAmount: input.totalGrossAmount,
    discounts: input.discounts.map((discount) => ({
      sourceType: discount.sourceType,
      sourceReference: discount.sourceReference,
      label: discount.label,
      grossAmount: discount.grossAmount,
      durationBillingCycles: discount.durationBillingCycles,
      applicationTiming: discount.applicationTiming,
    })),
  };
}

function getPlanPrice(
  plan: PlanCatalog,
  billingInterval: AgencyPlanBillingInterval,
): number {
  const price =
    billingInterval === AgencyPlanBillingInterval.MONTHLY
      ? plan.priceMonthlyPln
      : plan.priceYearlyPln;

  if (!Number.isSafeInteger(price) || price < 0) {
    throw new BadRequestException('Plan ma nieprawidłową cenę');
  }

  return price;
}

function normalizeDiscounts(
  discounts: readonly AgencyPlanQuoteDiscountSnapshot[],
): AgencyPlanQuoteDiscountSnapshot[] {
  return discounts.map((discount) => {
    if (
      !Number.isSafeInteger(discount.grossAmount) ||
      discount.grossAmount < 0
    ) {
      throw new BadRequestException('Rabat planu ma nieprawidłową kwotę');
    }
    if (
      !Number.isSafeInteger(discount.durationBillingCycles) ||
      discount.durationBillingCycles < 1
    ) {
      throw new BadRequestException('Rabat planu ma nieprawidłowy okres działania');
    }
    return discount;
  });
}

function allocateDiscount(
  subtotalGrossAmount: number,
  discounts: readonly AgencyPlanQuoteDiscountSnapshot[],
): number {
  return Math.min(
    subtotalGrossAmount,
    discounts.reduce((sum, discount) => sum + discount.grossAmount, 0),
  );
}

function getAgencyPlanQuoteExpiry(quotedAt: Date): Date {
  return new Date(quotedAt.getTime() + AGENCY_PLAN_QUOTE_TTL_MS);
}

function assertPersistableAmount(value: number, label: string): void {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_PERSISTED_GROSS_AMOUNT
  ) {
    throw new BadRequestException(`${label} jest poza dozwolonym zakresem`);
  }
}
