import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import type { AdminListingPromotionCampaignContract } from './contracts';
import type {
  CreateListingPromotionCampaignDto,
  CreateListingPromotionCodeDto,
  UpdateListingPromotionCampaignDto,
} from './dto';
import {
  ListingPromotionCampaign,
  ListingPromotionCode,
} from './entities';
import {
  ListingProductType,
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from './listing-commerce.types';
import { toAdminListingPromotionCampaign } from './listing-promotion.presenter';
import { hashPromotionCode } from './listing-promotions.service';

@Injectable()
export class AdminListingPromotionsService {
  constructor(private readonly dataSource: DataSource) {}

  async findCampaigns(): Promise<AdminListingPromotionCampaignContract[]> {
    const campaigns = await this.dataSource
      .getRepository(ListingPromotionCampaign)
      .find({
        relations: ['codes'],
        order: { createdAt: 'DESC', code: 'ASC' },
      });

    return campaigns.map(toAdminListingPromotionCampaign);
  }

  async findCampaign(
    code: string,
  ): Promise<AdminListingPromotionCampaignContract> {
    const campaign = await this.findCampaignEntity(
      this.dataSource.manager,
      code,
    );
    return toAdminListingPromotionCampaign(campaign);
  }

  async createCampaign(
    actorUserId: string,
    dto: CreateListingPromotionCampaignDto,
  ): Promise<AdminListingPromotionCampaignContract> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const code = normalizeCampaignCode(dto.code);
        const existing = await manager.findOne(ListingPromotionCampaign, {
          where: { code },
        });
        if (existing) {
          throw new ConflictException('Kampania o tym kodzie już istnieje');
        }

        const campaign = manager.create(ListingPromotionCampaign, {
          code,
          name: dto.name.trim(),
          description: normalizeNullableString(dto.description),
          status: dto.status ?? ListingPromotionCampaignStatus.DRAFT,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
          maxDiscountGrossAmount: dto.maxDiscountGrossAmount ?? null,
          targetScope: dto.targetScope,
          targetRules: dto.targetRules ?? {},
          isAutomatic: dto.isAutomatic ?? false,
          isCombinable: dto.isCombinable ?? false,
          usageLimitTotal: dto.usageLimitTotal ?? null,
          usageLimitPerUser: dto.usageLimitPerUser ?? null,
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
        return toAdminListingPromotionCampaign(saved);
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
    dto: UpdateListingPromotionCampaignDto,
  ): Promise<AdminListingPromotionCampaignContract> {
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
      if (dto.isAutomatic !== undefined) campaign.isAutomatic = dto.isAutomatic;
      if (dto.isCombinable !== undefined) {
        campaign.isCombinable = dto.isCombinable;
      }
      if (dto.usageLimitTotal !== undefined) {
        campaign.usageLimitTotal = dto.usageLimitTotal;
      }
      if (dto.usageLimitPerUser !== undefined) {
        campaign.usageLimitPerUser = dto.usageLimitPerUser;
      }
      if (dto.startsAt !== undefined) campaign.startsAt = parseNullableDate(dto.startsAt);
      if (dto.endsAt !== undefined) campaign.endsAt = parseNullableDate(dto.endsAt);
      campaign.updatedByUserId = actorUserId;

      this.prepareAndAssertCampaign(campaign);
      const saved = await manager.save(campaign);
      return toAdminListingPromotionCampaign(
        await this.findCampaignEntity(manager, saved.code),
      );
    });
  }

  async archiveCampaign(
    actorUserId: string,
    code: string,
  ): Promise<AdminListingPromotionCampaignContract> {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await this.findCampaignEntity(manager, code, true);
      if (!campaign.archivedAt) {
        campaign.archivedAt = new Date();
        campaign.status = ListingPromotionCampaignStatus.ARCHIVED;
        campaign.updatedByUserId = actorUserId;
        await manager.save(campaign);
      }
      return toAdminListingPromotionCampaign(
        await this.findCampaignEntity(manager, campaign.code),
      );
    });
  }

  async restoreCampaign(
    actorUserId: string,
    code: string,
  ): Promise<AdminListingPromotionCampaignContract> {
    return this.dataSource.transaction(async (manager) => {
      const campaign = await this.findCampaignEntity(manager, code, true);
      if (campaign.archivedAt) {
        campaign.archivedAt = null;
        campaign.status = ListingPromotionCampaignStatus.PAUSED;
        campaign.updatedByUserId = actorUserId;
        await manager.save(campaign);
      }
      return toAdminListingPromotionCampaign(
        await this.findCampaignEntity(manager, campaign.code),
      );
    });
  }

  async createCode(
    actorUserId: string,
    campaignCode: string,
    dto: CreateListingPromotionCodeDto,
  ): Promise<AdminListingPromotionCampaignContract> {
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
        const codeHash = hashPromotionCode(normalizedCode);
        if (!codeHash) {
          throw new BadRequestException('Kod promocyjny jest wymagany');
        }
        const existing = await manager.findOne(ListingPromotionCode, {
          where: { codeHash },
        });
        if (existing) {
          throw new ConflictException('Kod promocyjny już istnieje');
        }

        const promotionCode = manager.create(ListingPromotionCode, {
          campaignId: campaign.id,
          codeHash,
          codeLast4: normalizedCode.slice(-4),
          label: dto.label.trim(),
          status: dto.status ?? ListingPromotionCampaignStatus.ACTIVE,
          discountType: dto.discountType ?? null,
          discountValue: dto.discountValue ?? null,
          maxDiscountGrossAmount: dto.maxDiscountGrossAmount ?? null,
          isCombinable: dto.isCombinable ?? null,
          usageLimitTotal: dto.usageLimitTotal ?? null,
          usageLimitPerUser: dto.usageLimitPerUser ?? null,
          usageCount: 0,
          startsAt: parseNullableDate(dto.startsAt),
          endsAt: parseNullableDate(dto.endsAt),
          archivedAt: null,
        });
        this.prepareAndAssertCode(promotionCode);
        await manager.save(promotionCode);

        campaign.updatedByUserId = actorUserId;
        await manager.save(campaign);
        return toAdminListingPromotionCampaign(
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
  ): Promise<ListingPromotionCampaign> {
    const code = normalizeCampaignCode(rawCode);
    const campaign = await manager.findOne(ListingPromotionCampaign, {
      where: { code },
      ...(lock ? {} : { relations: ['codes'] }),
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!campaign) throw new NotFoundException('Kampania nie istnieje');
    campaign.codes = sortCodes(
      await manager.find(ListingPromotionCode, {
        where: { campaignId: campaign.id },
      }),
    );
    return campaign;
  }

  private prepareAndAssertCampaign(campaign: ListingPromotionCampaign): void {
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
    assertPeriod(campaign.startsAt ?? null, campaign.endsAt ?? null);
    assertUsageLimitNotBelowUsage(
      campaign.usageLimitTotal ?? null,
      campaign.usageCount,
      'Limit kampanii nie może być niższy niż aktualna liczba użyć',
    );
  }

  private prepareAndAssertCode(code: ListingPromotionCode): void {
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

function normalizeTargetRules(
  scope: ListingPromotionTargetScope,
  rules: ListingPromotionTargetRules,
): ListingPromotionTargetRules {
  if (scope === ListingPromotionTargetScope.ALL_PRODUCTS) return {};
  if (scope === ListingPromotionTargetScope.PRODUCT_TYPES) {
    const productTypes = uniqueStrings(rules.productTypes ?? []);
    if (!productTypes.length) {
      throw new BadRequestException('Wybierz co najmniej jeden typ produktu');
    }
    for (const type of productTypes) {
      if (!Object.values(ListingProductType).includes(type as ListingProductType)) {
        throw new BadRequestException('Nieprawidłowy typ produktu w promocji');
      }
    }
    return {
      productTypes: productTypes as ListingProductType[],
      ...normalizeMinimumSubtotal(rules),
    };
  }

  const productCodes = uniqueStrings(rules.productCodes ?? []).map((code) =>
    code.toLowerCase(),
  );
  if (!productCodes.length) {
    throw new BadRequestException('Wybierz co najmniej jeden kod produktu');
  }
  for (const code of productCodes) {
    if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(code)) {
      throw new BadRequestException('Nieprawidłowy kod produktu w promocji');
    }
  }
  return { productCodes, ...normalizeMinimumSubtotal(rules) };
}

function normalizeMinimumSubtotal(
  rules: ListingPromotionTargetRules,
): ListingPromotionTargetRules {
  if (rules.minimumSubtotalGrossAmount === undefined) return {};
  const minimumSubtotalGrossAmount = rules.minimumSubtotalGrossAmount;
  if (
    !Number.isSafeInteger(minimumSubtotalGrossAmount) ||
    minimumSubtotalGrossAmount < 0 ||
    minimumSubtotalGrossAmount > 2_147_483_647
  ) {
    throw new BadRequestException('Nieprawidłowa minimalna wartość koszyka');
  }
  return { minimumSubtotalGrossAmount };
}

function uniqueStrings(values: readonly unknown[]): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function assertDiscountConfiguration(
  discountType: ListingPromotionDiscountType,
  discountValue: number,
  maxDiscountGrossAmount: number | null,
): void {
  if (
    discountType === ListingPromotionDiscountType.PERCENTAGE &&
    discountValue > 10_000
  ) {
    throw new BadRequestException('Rabat procentowy nie może przekraczać 100%');
  }
  if (maxDiscountGrossAmount !== null && maxDiscountGrossAmount <= 0) {
    throw new BadRequestException('Maksymalny rabat musi być dodatni');
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

function sortCodes(codes: ListingPromotionCode[]): ListingPromotionCode[] {
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
