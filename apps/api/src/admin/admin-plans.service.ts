import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans';
import { AgencyPlanService } from '../users';
import {
  AgencyPlanFeatures,
  AgencyPlanLimits,
} from '../users/agency-plan.types';
import { UpdatePlanDto } from './dto';

const SYSTEM_PLAN_CODES = new Set<string>([
  AgencyPlan.FREE,
  AgencyPlan.STARTER,
  AgencyPlan.PROFESSIONAL,
  AgencyPlan.ENTERPRISE,
]);

export interface AdminPlanResponse {
  code: string;
  label: string;
  description: string | null;
  priceMonthlyPln: number;
  priceYearlyPln: number;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  limits: Partial<AgencyPlanLimits>;
  features: Partial<AgencyPlanFeatures>;
  isPublic: boolean;
  sortOrder: number;
  billingReady: boolean;
  billingWarnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AdminPlansService {
  constructor(
    @InjectRepository(PlanCatalog)
    private readonly planCatalogRepo: Repository<PlanCatalog>,
    private readonly agencyPlanService: AgencyPlanService,
  ) {}

  async findPlans(): Promise<AdminPlanResponse[]> {
    await this.agencyPlanService.ensureSystemPlanCatalog();

    const plans = await this.planCatalogRepo.find({
      order: { sortOrder: 'ASC', code: 'ASC' },
    });

    return plans.map((plan) => this.toResponse(plan));
  }

  async findPlan(code: string): Promise<AdminPlanResponse> {
    const plan = await this.findPlanEntity(code);
    return this.toResponse(plan);
  }

  async updatePlan(
    code: string,
    dto: UpdatePlanDto,
  ): Promise<AdminPlanResponse> {
    this.assertSystemPlanCode(code);

    const plan = await this.findPlanEntity(code);

    if (dto.label !== undefined) {
      const label = dto.label.trim();
      if (!label) {
        throw new BadRequestException('Nazwa planu nie może być pusta');
      }
      plan.label = label;
    }

    if (dto.description !== undefined) {
      plan.description = this.normalizeNullableString(dto.description);
    }

    if (dto.priceMonthlyPln !== undefined) {
      plan.priceMonthlyPln = dto.priceMonthlyPln;
    }

    if (dto.priceYearlyPln !== undefined) {
      plan.priceYearlyPln = dto.priceYearlyPln;
    }

    if (dto.stripePriceIdMonthly !== undefined) {
      plan.stripePriceIdMonthly = this.normalizeNullableString(
        dto.stripePriceIdMonthly,
      );
    }

    if (dto.stripePriceIdYearly !== undefined) {
      plan.stripePriceIdYearly = this.normalizeNullableString(
        dto.stripePriceIdYearly,
      );
    }

    if (dto.limits !== undefined) {
      plan.limits = {
        ...(plan.limits ?? {}),
        ...dto.limits,
      };
    }

    if (dto.features !== undefined) {
      plan.features = {
        ...(plan.features ?? {}),
        ...dto.features,
      };
    }

    if (dto.isPublic !== undefined) {
      plan.isPublic = dto.isPublic;
    }

    if (dto.sortOrder !== undefined) {
      plan.sortOrder = dto.sortOrder;
    }

    this.assertPlanRules(plan);

    const savedPlan = await this.planCatalogRepo.save(plan);
    await this.agencyPlanService.refreshCatalog();

    return this.toResponse(savedPlan);
  }

  private async findPlanEntity(code: string): Promise<PlanCatalog> {
    this.assertSystemPlanCode(code);

    const plan = await this.planCatalogRepo.findOne({ where: { code } });
    if (!plan) {
      throw new NotFoundException('Plan nie istnieje');
    }

    return plan;
  }

  private assertSystemPlanCode(code: string): void {
    if (!SYSTEM_PLAN_CODES.has(code)) {
      throw new BadRequestException(
        'Można edytować tylko systemowe plany: free, starter, professional, enterprise',
      );
    }
  }

  private assertPlanRules(plan: PlanCatalog): void {
    if (plan.code === AgencyPlan.FREE) {
      if (plan.priceMonthlyPln !== 0 || plan.priceYearlyPln !== 0) {
        throw new BadRequestException('Plan Free musi mieć cenę 0');
      }
      if (plan.stripePriceIdMonthly || plan.stripePriceIdYearly) {
        throw new BadRequestException('Plan Free nie może mieć Stripe Price ID');
      }
    }

    this.assertRequiredObjectKeys(
      plan.limits,
      [
        'activeListings',
        'clients',
        'monthlyAppointments',
        'users',
        'imagesPerListing',
      ],
      'limits',
    );
    this.assertRequiredObjectKeys(
      plan.features,
      [
        'reportsOverview',
        'reportsListingsBasic',
        'reportsClientsBasic',
        'reportsAppointmentsBasic',
        'publicListings',
        'publicLeadForms',
        'customBranding',
        'multiUser',
        'customDomain',
        'apiAccess',
        'dedicatedSupport',
      ],
      'features',
    );
  }

  private assertRequiredObjectKeys(
    value: Record<string, unknown> | null | undefined,
    keys: string[],
    fieldName: string,
  ): void {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException(`Plan musi mieć kompletne pole ${fieldName}`);
    }

    for (const key of keys) {
      if (!(key in value)) {
        throw new BadRequestException(
          `Plan musi mieć kompletne pole ${fieldName}.${key}`,
        );
      }
    }
  }

  private normalizeNullableString(value?: string | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private toResponse(plan: PlanCatalog): AdminPlanResponse {
    const billingWarnings = this.getBillingWarnings(plan);

    return {
      code: plan.code,
      label: plan.label,
      description: plan.description ?? null,
      priceMonthlyPln: plan.priceMonthlyPln,
      priceYearlyPln: plan.priceYearlyPln,
      stripePriceIdMonthly: plan.stripePriceIdMonthly ?? null,
      stripePriceIdYearly: plan.stripePriceIdYearly ?? null,
      limits: plan.limits,
      features: plan.features,
      isPublic: plan.isPublic,
      sortOrder: plan.sortOrder,
      billingReady: billingWarnings.length === 0,
      billingWarnings,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private getBillingWarnings(plan: PlanCatalog): string[] {
    if (!plan.isPublic || plan.code === AgencyPlan.FREE) {
      return [];
    }

    const warnings: string[] = [];

    if (plan.priceMonthlyPln > 0 && !plan.stripePriceIdMonthly) {
      warnings.push('Brak Stripe Price ID dla rozliczenia miesięcznego');
    }

    if (plan.priceYearlyPln > 0 && !plan.stripePriceIdYearly) {
      warnings.push('Brak Stripe Price ID dla rozliczenia rocznego');
    }

    return warnings;
  }
}
