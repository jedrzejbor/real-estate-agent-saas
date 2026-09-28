import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { AgencyPlan } from '../common/enums';
import type {
  AdminAgencyPlanPromotionCampaignContract,
  AdminAgencyPlanPromotionSalesReportContract,
} from './contracts';
import type {
  CreateAgencyPlanPromotionCampaignDto,
  CreateAgencyPlanPromotionCodeDto,
  UpdateAgencyPlanPromotionCampaignDto,
} from './dto';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
} from './agency-plan-commerce.types';
import {
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
} from './entities';
import { toAdminAgencyPlanPromotionCampaign } from './agency-plan-promotion.presenter';
import { hashAgencyPlanPromotionCode } from './agency-plan-promotions.service';

@Injectable()
export class AdminAgencyPlanPromotionsService {
  constructor(private readonly dataSource: DataSource) {}

  async findCampaigns(): Promise<AdminAgencyPlanPromotionCampaignContract[]> {
    const campaigns = await this.dataSource
      .getRepository(AgencyPlanPromotionCampaign)
      .find({
        relations: ['codes'],
        order: { createdAt: 'DESC', code: 'ASC' },
      });

    return campaigns.map(toAdminAgencyPlanPromotionCampaign);
  }

  async findCampaign(
    code: string,
  ): Promise<AdminAgencyPlanPromotionCampaignContract> {
    const campaign = await this.findCampaignEntity(
      this.dataSource.manager,
      code,
    );
    return toAdminAgencyPlanPromotionCampaign(campaign);
  }

  async getSalesReport(
    code: string,
  ): Promise<AdminAgencyPlanPromotionSalesReportContract> {
    const campaign = await this.findCampaignEntity(
      this.dataSource.manager,
      code,
    );
    const [totalsRaw = {}] = await this.dataSource.query<
      AgencyPlanPromotionSalesTotalsRow[]
    >(
      `
        SELECT
          COUNT(*)::int AS "redemptionCount",
          COALESCE(SUM(discount_gross_amount), 0)::int AS "discountGrossAmount",
          COALESCE(SUM(subtotal_gross_amount), 0)::int AS "subtotalGrossAmount",
          COALESCE(SUM(total_gross_amount), 0)::int AS "totalGrossAmount",
          MIN(created_at) AS "firstRedemptionAt",
          MAX(created_at) AS "lastRedemptionAt"
        FROM agency_plan_promotion_redemptions
        WHERE campaign_id = $1
      `,
      [campaign.id],
    );
    const byPlanRaw = await this.dataSource.query<
      AgencyPlanPromotionPlanSalesRow[]
    >(
      `
        SELECT
          plan_code AS "planCode",
          billing_interval AS "billingInterval",
          COUNT(*)::int AS "redemptionCount",
          COALESCE(SUM(discount_gross_amount), 0)::int AS "discountGrossAmount",
          COALESCE(SUM(subtotal_gross_amount), 0)::int AS "subtotalGrossAmount",
          COALESCE(SUM(total_gross_amount), 0)::int AS "totalGrossAmount"
        FROM agency_plan_promotion_redemptions
        WHERE campaign_id = $1
        GROUP BY plan_code, billing_interval
        ORDER BY "discountGrossAmount" DESC, "redemptionCount" DESC, plan_code ASC
      `,
      [campaign.id],
    );
    const byCodeRaw = await this.dataSource.query<
      AgencyPlanPromotionCodeSalesRow[]
    >(
      `
        SELECT
          redemptions.code_id AS "codeId",
          codes.code_last4 AS "codeLast4",
          codes.label AS "label",
          COUNT(*)::int AS "redemptionCount",
          COALESCE(SUM(redemptions.discount_gross_amount), 0)::int AS "discountGrossAmount",
          COALESCE(SUM(redemptions.subtotal_gross_amount), 0)::int AS "subtotalGrossAmount",
          COALESCE(SUM(redemptions.total_gross_amount), 0)::int AS "totalGrossAmount"
        FROM agency_plan_promotion_redemptions redemptions
        INNER JOIN agency_plan_promotion_codes codes
          ON codes.id = redemptions.code_id
        WHERE redemptions.campaign_id = $1
          AND redemptions.code_id IS NOT NULL
        GROUP BY redemptions.code_id, codes.code_last4, codes.label
        ORDER BY "discountGrossAmount" DESC, "redemptionCount" DESC, codes.label ASC
      `,
      [campaign.id],
    );

    return {
      campaign: {
        id: campaign.id,
        code: campaign.code,
        name: campaign.name,
        usageCount: campaign.usageCount,
        usageLimitTotal: campaign.usageLimitTotal ?? null,
      },
      totals: {
        redemptionCount: toNumber(totalsRaw.redemptionCount),
        discountGrossAmount: toNumber(totalsRaw.discountGrossAmount),
        subtotalGrossAmount: toNumber(totalsRaw.subtotalGrossAmount),
        totalGrossAmount: toNumber(totalsRaw.totalGrossAmount),
        firstRedemptionAt: toNullableDate(totalsRaw.firstRedemptionAt),
        lastRedemptionAt: toNullableDate(totalsRaw.lastRedemptionAt),
      },
      byPlan: byPlanRaw.map((row) => ({
        planCode: row.planCode,
        billingInterval: row.billingInterval,
        redemptionCount: toNumber(row.redemptionCount),
        discountGrossAmount: toNumber(row.discountGrossAmount),
        subtotalGrossAmount: toNumber(row.subtotalGrossAmount),
        totalGrossAmount: toNumber(row.totalGrossAmount),
      })),
      byCode: byCodeRaw.map((row) => ({
        codeId: row.codeId,
        codeLast4: row.codeLast4 ?? null,
        label: row.label,
        redemptionCount: toNumber(row.redemptionCount),
        discountGrossAmount: toNumber(row.discountGrossAmount),
        subtotalGrossAmount: toNumber(row.subtotalGrossAmount),
        totalGrossAmount: toNumber(row.totalGrossAmount),
      })),
    };
  }

  async createCampaign(
    actorUserId: string,
    dto: CreateAgencyPlanPromotionCampaignDto,
  ): Promise<AdminAgencyPlanPromotionCampaignContract> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const code = normalizeCampaignCode(dto.code);
        const existing = await manager.findOne(AgencyPlanPromotionCampaign, {
          where: { code },
        });
        if (existing) {
          throw new ConflictException('Kampania o tym kodzie już istnieje');
        }

        const campaign = manager.create(AgencyPlanPromotionCampaign, {
          code,
          name: dto.name.trim(),
          description: normalizeNullableString(dto.description),
          status: dto.status ?? AgencyPlanPromotionStatus.DRAFT,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          maxDiscountGrossAmount: dto.maxDiscountGrossAmount ?? null,
          targetScope: dto.targetScope,
          targetRules: dto.targetRules ?? {},
          durationBillingCycles: dto.durationBillingCycles ?? 1,
          applicationTiming:
            dto.applicationTiming ??
            AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
          isAutomatic: dto.isAutomatic ?? false,
          isCombinable: dto.isCombinable ?? false,
          usageLimitTotal: dto.usageLimitTotal ?? null,
          usageLimitPerAccount: dto.usageLimitPerAccount ?? null,
          usageCount: 0,
          startsAt: parseNullableDate(dto.startsAt),
          endsAt: parseNullableDate(dto.endsAt),
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          archivedAt: null,
        });
        this.prepareAndAssertCampaign(campaign);

        const saved = await manager.save(campaign);
        saved.codes = [];
        return toAdminAgencyPlanPromotionCampaign(saved);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Kampania o tym kodzie już istnieje');
      }
      throw error;
    }
  }

  async updateCampaign(
    actorUserId: string,
    code: string,
    dto: UpdateAgencyPlanPromotionCampaignDto,
  ): Promise<AdminAgencyPlanPromotionCampaignContract> {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await this.findCampaignEntity(manager, code, true);

      if (dto.name !== undefined) campaign.name = dto.name.trim();
      if (dto.description !== undefined) {
        campaign.description = normalizeNullableString(dto.description);
      }
      if (dto.status !== undefined) campaign.status = dto.status;
      if (dto.discountType !== undefined) campaign.discountType = dto.discountType;
      if (dto.discountValue !== undefined) {
        campaign.discountValue = dto.discountValue;
      }
      if (dto.maxDiscountGrossAmount !== undefined) {
        campaign.maxDiscountGrossAmount = dto.maxDiscountGrossAmount;
      }
      if (dto.targetScope !== undefined) campaign.targetScope = dto.targetScope;
      if (dto.targetRules !== undefined) campaign.targetRules = dto.targetRules;
      if (dto.durationBillingCycles !== undefined) {
        campaign.durationBillingCycles = dto.durationBillingCycles;
      }
      if (dto.applicationTiming !== undefined) {
        campaign.applicationTiming = dto.applicationTiming;
      }
      if (dto.isAutomatic !== undefined) campaign.isAutomatic = dto.isAutomatic;
      if (dto.isCombinable !== undefined) {
        campaign.isCombinable = dto.isCombinable;
      }
      if (dto.usageLimitTotal !== undefined) {
        campaign.usageLimitTotal = dto.usageLimitTotal;
      }
      if (dto.usageLimitPerAccount !== undefined) {
        campaign.usageLimitPerAccount = dto.usageLimitPerAccount;
      }
      if (dto.startsAt !== undefined) {
        campaign.startsAt = parseNullableDate(dto.startsAt);
      }
      if (dto.endsAt !== undefined) {
        campaign.endsAt = parseNullableDate(dto.endsAt);
      }
      campaign.updatedByUserId = actorUserId;

      this.prepareAndAssertCampaign(campaign);
      const saved = await manager.save(campaign);
      return toAdminAgencyPlanPromotionCampaign(
        await this.findCampaignEntity(manager, saved.code),
      );
    });
  }

  async archiveCampaign(
    actorUserId: string,
    code: string,
  ): Promise<AdminAgencyPlanPromotionCampaignContract> {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await this.findCampaignEntity(manager, code, true);
      if (!campaign.archivedAt) {
        campaign.archivedAt = new Date();
        campaign.status = AgencyPlanPromotionStatus.ARCHIVED;
        campaign.updatedByUserId = actorUserId;
        await manager.save(campaign);
      }
      return toAdminAgencyPlanPromotionCampaign(
        await this.findCampaignEntity(manager, campaign.code),
      );
    });
  }

  async restoreCampaign(
    actorUserId: string,
    code: string,
  ): Promise<AdminAgencyPlanPromotionCampaignContract> {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await this.findCampaignEntity(manager, code, true);
      if (campaign.archivedAt) {
        campaign.archivedAt = null;
        campaign.status = AgencyPlanPromotionStatus.PAUSED;
        campaign.updatedByUserId = actorUserId;
        await manager.save(campaign);
      }
      return toAdminAgencyPlanPromotionCampaign(
        await this.findCampaignEntity(manager, campaign.code),
      );
    });
  }

  async createCode(
    actorUserId: string,
    campaignCode: string,
    dto: CreateAgencyPlanPromotionCodeDto,
  ): Promise<AdminAgencyPlanPromotionCampaignContract> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const campaign = await this.findCampaignEntity(
          manager,
          campaignCode,
          true,
        );
        if (campaign.archivedAt) {
          throw new BadRequestException(
            'Nie można dodać kodu do zarchiwizowanej kampanii',
          );
        }

        const normalizedCode = normalizePromotionCodeOrThrow(dto.code);
        const codeHash = hashAgencyPlanPromotionCode(normalizedCode);
        if (!codeHash) {
          throw new BadRequestException('Kod promocyjny jest wymagany');
        }
        const existing = await manager.findOne(AgencyPlanPromotionCode, {
          where: { codeHash },
        });
        if (existing) {
          throw new ConflictException('Kod promocyjny już istnieje');
        }

        const promotionCode = manager.create(AgencyPlanPromotionCode, {
          campaignId: campaign.id,
          codeHash,
          codeLast4: normalizedCode.slice(-4),
          label: dto.label.trim(),
          status: dto.status ?? AgencyPlanPromotionStatus.ACTIVE,
          discountType: dto.discountType ?? null,
          discountValue: dto.discountValue ?? null,
          maxDiscountGrossAmount: dto.maxDiscountGrossAmount ?? null,
          durationBillingCycles: dto.durationBillingCycles ?? null,
          applicationTiming: dto.applicationTiming ?? null,
          isCombinable: dto.isCombinable ?? null,
          usageLimitTotal: dto.usageLimitTotal ?? null,
          usageLimitPerAccount: dto.usageLimitPerAccount ?? null,
          usageCount: 0,
          startsAt: parseNullableDate(dto.startsAt),
          endsAt: parseNullableDate(dto.endsAt),
          archivedAt: null,
        });
        this.prepareAndAssertCode(promotionCode);
        await manager.save(promotionCode);

        await manager.update(AgencyPlanPromotionCampaign, campaign.id, {
          updatedByUserId: actorUserId,
        });
        return toAdminAgencyPlanPromotionCampaign(
          await this.findCampaignEntity(manager, campaign.code),
        );
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Kod promocyjny już istnieje');
      }
      throw error;
    }
  }

  private async findCampaignEntity(
    manager: EntityManager,
    rawCode: string,
    lock = false,
  ): Promise<AgencyPlanPromotionCampaign> {
    const code = normalizeCampaignCode(rawCode);
    const campaign = await manager.findOne(AgencyPlanPromotionCampaign, {
      where: { code },
      ...(lock ? {} : { relations: ['codes'] }),
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!campaign) throw new NotFoundException('Kampania nie istnieje');
    campaign.codes = sortCodes(
      await manager.find(AgencyPlanPromotionCode, {
        where: { campaignId: campaign.id },
      }),
    );
    return campaign;
  }

  private prepareAndAssertCampaign(
    campaign: AgencyPlanPromotionCampaign,
  ): void {
    campaign.name = campaign.name.trim();
    if (!campaign.name) {
      throw new BadRequestException('Nazwa kampanii nie może być pusta');
    }
    campaign.description = normalizeNullableString(campaign.description);
    campaign.targetRules = normalizeTargetRules(
      campaign.targetScope,
      campaign.targetRules,
    );
    assertDiscountConfiguration(
      campaign.discountType,
      campaign.discountValue,
      campaign.maxDiscountGrossAmount ?? null,
    );
    assertDurationBillingCycles(campaign.durationBillingCycles);
    assertPeriod(campaign.startsAt ?? null, campaign.endsAt ?? null);
    assertUsageLimitNotBelowUsage(
      campaign.usageLimitTotal ?? null,
      campaign.usageCount,
      'Limit kampanii nie może być niższy niż aktualna liczba użyć',
    );
  }

  private prepareAndAssertCode(code: AgencyPlanPromotionCode): void {
    code.label = code.label.trim();
    if (!code.label) {
      throw new BadRequestException('Etykieta kodu nie może być pusta');
    }
    if ((code.discountType === null) !== (code.discountValue === null)) {
      throw new BadRequestException(
        'Nadpisanie rabatu kodu wymaga typu i wartości rabatu',
      );
    }
    if (code.discountType && code.discountValue) {
      assertDiscountConfiguration(
        code.discountType,
        code.discountValue,
        code.maxDiscountGrossAmount ?? null,
      );
    }
    if (code.durationBillingCycles !== null && code.durationBillingCycles !== undefined) {
      assertDurationBillingCycles(code.durationBillingCycles);
    }
    assertPeriod(code.startsAt ?? null, code.endsAt ?? null);
    assertUsageLimitNotBelowUsage(
      code.usageLimitTotal ?? null,
      code.usageCount,
      'Limit kodu nie może być niższy niż aktualna liczba użyć',
    );
  }
}

function normalizeCampaignCode(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePromotionCodeOrThrow(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,80}$/.test(normalized)) {
    throw new BadRequestException(
      'Kod promocyjny może zawierać litery, cyfry, myślnik i podkreślenie',
    );
  }
  return normalized;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseNullableDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Nieprawidłowa data promocji');
  }
  return date;
}

type NumericRawValue = number | string | bigint | null | undefined;

interface AgencyPlanPromotionSalesTotalsRow {
  redemptionCount?: NumericRawValue;
  discountGrossAmount?: NumericRawValue;
  subtotalGrossAmount?: NumericRawValue;
  totalGrossAmount?: NumericRawValue;
  firstRedemptionAt?: Date | string | null;
  lastRedemptionAt?: Date | string | null;
}

interface AgencyPlanPromotionPlanSalesRow {
  planCode: AgencyPlan;
  billingInterval: AgencyPlanBillingInterval;
  redemptionCount?: NumericRawValue;
  discountGrossAmount?: NumericRawValue;
  subtotalGrossAmount?: NumericRawValue;
  totalGrossAmount?: NumericRawValue;
}

interface AgencyPlanPromotionCodeSalesRow {
  codeId: string;
  codeLast4?: string | null;
  label: string;
  redemptionCount?: NumericRawValue;
  discountGrossAmount?: NumericRawValue;
  subtotalGrossAmount?: NumericRawValue;
  totalGrossAmount?: NumericRawValue;
}

function toNumber(value: NumericRawValue): number {
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function normalizeTargetRules(
  scope: AgencyPlanPromotionTargetScope,
  rules: AgencyPlanPromotionTargetRules,
): AgencyPlanPromotionTargetRules {
  const normalizedMinimumSubtotal = normalizeMinimumSubtotal(rules);
  if (scope === AgencyPlanPromotionTargetScope.ALL_PLANS) {
    return {
      ...normalizePlanCodes(rules),
      ...normalizeBillingIntervals(rules),
      ...normalizedMinimumSubtotal,
    };
  }
  if (scope === AgencyPlanPromotionTargetScope.PLAN_CODES) {
    const planCodes = normalizePlanCodes(rules).planCodes ?? [];
    if (!planCodes.length) {
      throw new BadRequestException('Wybierz co najmniej jeden plan');
    }
    return {
      planCodes,
      ...normalizeBillingIntervals(rules),
      ...normalizedMinimumSubtotal,
    };
  }

  const billingIntervals =
    normalizeBillingIntervals(rules).billingIntervals ?? [];
  if (!billingIntervals.length) {
    throw new BadRequestException('Wybierz co najmniej jeden okres rozliczenia');
  }
  return {
    ...normalizePlanCodes(rules),
    billingIntervals,
    ...normalizedMinimumSubtotal,
  };
}

function normalizePlanCodes(
  rules: AgencyPlanPromotionTargetRules,
): AgencyPlanPromotionTargetRules {
  if (rules.planCodes === undefined) return {};
  const planCodes = uniqueStrings(rules.planCodes).map((code) =>
    code.toLowerCase(),
  );
  for (const code of planCodes) {
    if (!Object.values(AgencyPlan).includes(code as AgencyPlan)) {
      throw new BadRequestException('Nieprawidłowy plan w promocji');
    }
  }
  return { planCodes: planCodes as AgencyPlan[] };
}

function normalizeBillingIntervals(
  rules: AgencyPlanPromotionTargetRules,
): AgencyPlanPromotionTargetRules {
  if (rules.billingIntervals === undefined) return {};
  const billingIntervals = uniqueStrings(rules.billingIntervals).map((interval) =>
    interval.toLowerCase(),
  );
  for (const interval of billingIntervals) {
    if (
      !Object.values(AgencyPlanBillingInterval).includes(
        interval as AgencyPlanBillingInterval,
      )
    ) {
      throw new BadRequestException('Nieprawidłowy okres rozliczenia');
    }
  }
  return { billingIntervals: billingIntervals as AgencyPlanBillingInterval[] };
}

function normalizeMinimumSubtotal(
  rules: AgencyPlanPromotionTargetRules,
): AgencyPlanPromotionTargetRules {
  if (rules.minimumSubtotalGrossAmount === undefined) return {};
  const minimumSubtotalGrossAmount = rules.minimumSubtotalGrossAmount;
  if (
    !Number.isSafeInteger(minimumSubtotalGrossAmount) ||
    minimumSubtotalGrossAmount < 0 ||
    minimumSubtotalGrossAmount > 2_147_483_647
  ) {
    throw new BadRequestException('Nieprawidłowa minimalna wartość planu');
  }
  return { minimumSubtotalGrossAmount };
}

function uniqueStrings(values: readonly unknown[] | undefined): string[] {
  return [
    ...new Set(
      (values ?? [])
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function assertDiscountConfiguration(
  discountType: AgencyPlanPromotionDiscountType,
  discountValue: number,
  maxDiscountGrossAmount: number | null,
): void {
  if (
    discountType === AgencyPlanPromotionDiscountType.PERCENTAGE &&
    discountValue > 10_000
  ) {
    throw new BadRequestException('Rabat procentowy nie może przekraczać 100%');
  }
  if (maxDiscountGrossAmount !== null && maxDiscountGrossAmount <= 0) {
    throw new BadRequestException('Maksymalny rabat musi być dodatni');
  }
}

function assertDurationBillingCycles(durationBillingCycles: number): void {
  if (
    !Number.isSafeInteger(durationBillingCycles) ||
    durationBillingCycles < 1 ||
    durationBillingCycles > 120
  ) {
    throw new BadRequestException(
      'Liczba okresów rozliczeniowych musi być z zakresu 1-120',
    );
  }
}

function assertPeriod(startsAt: Date | null, endsAt: Date | null): void {
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new BadRequestException('Data końca musi być późniejsza niż start');
  }
}

function assertUsageLimitNotBelowUsage(
  limit: number | null,
  usageCount: number,
  message: string,
): void {
  if (limit !== null && limit < usageCount) {
    throw new BadRequestException(message);
  }
}

function sortCodes(
  codes: AgencyPlanPromotionCode[],
): AgencyPlanPromotionCode[] {
  return [...codes].sort(
    (left, right) =>
      left.createdAt.getTime() - right.createdAt.getTime() ||
      left.label.localeCompare(right.label),
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as { code?: string }).code === '23505'
  );
}
