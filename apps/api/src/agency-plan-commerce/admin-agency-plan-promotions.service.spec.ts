import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AgencyPlan } from '../common/enums';
import { AdminAgencyPlanPromotionsService } from './admin-agency-plan-promotions.service';
import {
  AgencyPlanBillingInterval,
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetScope,
} from './agency-plan-commerce.types';
import { hashAgencyPlanPromotionCode } from './agency-plan-promotions.service';
import {
  AgencyPlanPromotionCampaign,
  AgencyPlanPromotionCode,
} from './entities';

function buildCampaign(
  overrides: Partial<AgencyPlanPromotionCampaign> = {},
): AgencyPlanPromotionCampaign {
  return {
    id: 'campaign-1',
    code: 'start_agents',
    name: 'Start dla agentów',
    description: null,
    status: AgencyPlanPromotionStatus.DRAFT,
    discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
    discountValue: 1_000,
    maxDiscountGrossAmount: 2_000,
    targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
    targetRules: { planCodes: [AgencyPlan.PROFESSIONAL] },
    durationBillingCycles: 3,
    applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
    isAutomatic: false,
    isCombinable: false,
    usageLimitTotal: 100,
    usageLimitPerAccount: 1,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    createdByUserId: 'admin-1',
    updatedByUserId: 'admin-1',
    archivedAt: null,
    createdAt: new Date('2026-09-17T10:00:00.000Z'),
    updatedAt: new Date('2026-09-17T10:00:00.000Z'),
    codes: [],
    ...overrides,
  } as AgencyPlanPromotionCampaign;
}

function buildService(
  initialCampaigns: AgencyPlanPromotionCampaign[] = [],
  reportRows?: {
    totals?: unknown[];
    byPlan?: unknown[];
    byCode?: unknown[];
  },
) {
  const campaigns = [...initialCampaigns];
  const codes: AgencyPlanPromotionCode[] = [];

  const manager = {
    findOne: jest.fn(async (entity, options) => {
      if (entity === AgencyPlanPromotionCampaign) {
        return (
          campaigns.find(
            (campaign) =>
              campaign.code === options.where.code ||
              campaign.id === options.where.id,
          ) ?? null
        );
      }
      if (entity === AgencyPlanPromotionCode) {
        return (
          codes.find((code) => code.codeHash === options.where.codeHash) ?? null
        );
      }
      return null;
    }),
    find: jest.fn(async (entity, options) => {
      if (entity !== AgencyPlanPromotionCode) return [];
      return codes.filter((code) => code.campaignId === options.where.campaignId);
    }),
    create: jest.fn((entity, value) => ({
      id:
        entity === AgencyPlanPromotionCampaign
          ? `campaign-${campaigns.length + 1}`
          : `code-${codes.length + 1}`,
      createdAt: new Date('2026-09-17T11:00:00.000Z'),
      updatedAt: new Date('2026-09-17T11:00:00.000Z'),
      ...value,
    })),
    save: jest.fn(async (value) => {
      if ('codeHash' in value) {
        codes.push(value as AgencyPlanPromotionCode);
        return value;
      }
      const index = campaigns.findIndex((campaign) => campaign.id === value.id);
      if (index >= 0) campaigns[index] = value as AgencyPlanPromotionCampaign;
      else campaigns.push(value as AgencyPlanPromotionCampaign);
      return value;
    }),
    update: jest.fn(async (entity, id, value) => {
      if (entity !== AgencyPlanPromotionCampaign) return { affected: 0 };
      const index = campaigns.findIndex((campaign) => campaign.id === id);
      if (index < 0) return { affected: 0 };
      campaigns[index] = {
        ...campaigns[index],
        ...value,
        updatedAt: new Date('2026-09-17T11:30:00.000Z'),
      } as AgencyPlanPromotionCampaign;
      return { affected: 1 };
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (callback) => callback(manager)),
    query: jest.fn(async (sql: string) => {
      if (sql.includes('GROUP BY plan_code, billing_interval')) {
        return reportRows?.byPlan ?? [];
      }
      if (sql.includes('INNER JOIN agency_plan_promotion_codes')) {
        return reportRows?.byCode ?? [];
      }
      return (
        reportRows?.totals ?? [
          {
            redemptionCount: 0,
            discountGrossAmount: 0,
            subtotalGrossAmount: 0,
            totalGrossAmount: 0,
            firstRedemptionAt: null,
            lastRedemptionAt: null,
          },
        ]
      );
    }),
    getRepository: jest.fn(() => ({
      find: jest.fn(async () =>
        campaigns.map((campaign) => ({
          ...campaign,
          codes: codes.filter((code) => code.campaignId === campaign.id),
        })),
      ),
    })),
  };

  return {
    service: new AdminAgencyPlanPromotionsService(dataSource as never),
    dataSource,
    manager,
    campaigns,
    codes,
  };
}

describe('AdminAgencyPlanPromotionsService', () => {
  it('creates a normalized campaign for selected plans and intervals', async () => {
    const { service, dataSource, campaigns } = buildService();

    const campaign = await service.createCampaign('admin-1', {
      code: 'start_agents',
      name: ' Start dla agentów ',
      description: ' 50% na pierwsze 3 miesiące ',
      discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
      discountValue: 5_000,
      targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
      targetRules: {
        planCodes: [AgencyPlan.PROFESSIONAL, AgencyPlan.PROFESSIONAL],
        billingIntervals: [AgencyPlanBillingInterval.MONTHLY],
        minimumSubtotalGrossAmount: 19_900,
      },
      durationBillingCycles: 3,
      isAutomatic: true,
      usageLimitTotal: 100,
      usageLimitPerAccount: 1,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(campaign).toMatchObject({
      code: 'start_agents',
      name: 'Start dla agentów',
      description: '50% na pierwsze 3 miesiące',
      status: AgencyPlanPromotionStatus.DRAFT,
      targetRules: {
        planCodes: [AgencyPlan.PROFESSIONAL],
        billingIntervals: [AgencyPlanBillingInterval.MONTHLY],
        minimumSubtotalGrossAmount: 19_900,
      },
      durationBillingCycles: 3,
      applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      isAutomatic: true,
      usageCount: 0,
      codes: [],
    });
    expect(campaigns).toHaveLength(1);
  });

  it('rejects invalid discount, missing plan rules and invalid duration', async () => {
    const { service } = buildService();

    await expect(
      service.createCampaign('admin-1', {
        code: 'too_high',
        name: 'Za wysoki rabat',
        discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
        discountValue: 10_001,
        targetScope: AgencyPlanPromotionTargetScope.ALL_PLANS,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createCampaign('admin-1', {
        code: 'missing_plan',
        name: 'Brak planu',
        discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
        discountValue: 1_000,
        targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
        targetRules: { planCodes: [] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.createCampaign('admin-1', {
        code: 'bad_duration',
        name: 'Zły czas',
        discountType: AgencyPlanPromotionDiscountType.FIXED_GROSS,
        discountValue: 1_000,
        targetScope: AgencyPlanPromotionTargetScope.ALL_PLANS,
        durationBillingCycles: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores campaign date windows as exact instants with timezone offsets', async () => {
    const { service } = buildService();

    const campaign = await service.createCampaign('admin-1', {
      code: 'weekend_agents',
      name: 'Weekend dla agentów',
      discountType: AgencyPlanPromotionDiscountType.FIXED_GROSS,
      discountValue: 1_000,
      targetScope: AgencyPlanPromotionTargetScope.ALL_PLANS,
      startsAt: '2026-09-17T10:00:00+02:00',
      endsAt: '2026-09-18T10:00:00+02:00',
    });

    expect(campaign.startsAt?.toISOString()).toBe(
      '2026-09-17T08:00:00.000Z',
    );
    expect(campaign.endsAt?.toISOString()).toBe(
      '2026-09-18T08:00:00.000Z',
    );
  });

  it('creates a hashed promotion code and never returns the hash or plaintext', async () => {
    const existingCampaign = buildCampaign({
      status: AgencyPlanPromotionStatus.ACTIVE,
    });
    const { service, codes, manager } = buildService([existingCampaign]);

    const campaign = await service.createCode(
      'admin-2',
      existingCampaign.code,
      {
        code: ' agent-start-50 ',
        label: 'Kod START50',
        durationBillingCycles: 1,
        applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
        usageLimitTotal: 25,
        usageLimitPerAccount: 1,
      },
    );

    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatchObject({
      campaignId: existingCampaign.id,
      codeHash: hashAgencyPlanPromotionCode('AGENT-START-50'),
      codeLast4: 'T-50',
      label: 'Kod START50',
      durationBillingCycles: 1,
      usageCount: 0,
    });
    expect(manager.update).toHaveBeenCalledWith(
      AgencyPlanPromotionCampaign,
      existingCampaign.id,
      { updatedByUserId: 'admin-2' },
    );
    expect(campaign.codes).toHaveLength(1);
    expect(campaign.codes[0]).toMatchObject({
      codeLast4: 'T-50',
      label: 'Kod START50',
      usageLimitTotal: 25,
      usageLimitPerAccount: 1,
    });
    expect(JSON.stringify(campaign)).not.toContain('AGENT-START-50');
    expect(JSON.stringify(campaign)).not.toContain(codes[0].codeHash);
  });

  it('rejects duplicate promotion codes by normalized hash', async () => {
    const existingCampaign = buildCampaign();
    const { service } = buildService([existingCampaign]);

    await service.createCode('admin-1', existingCampaign.code, {
      code: 'AGENT50',
      label: 'Pierwszy kod',
    });

    await expect(
      service.createCode('admin-1', existingCampaign.code, {
        code: ' agent50 ',
        label: 'Drugi kod',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('archives and restores a campaign without making it active automatically', async () => {
    const existingCampaign = buildCampaign({
      status: AgencyPlanPromotionStatus.ACTIVE,
    });
    const { service } = buildService([existingCampaign]);

    const archived = await service.archiveCampaign(
      'admin-2',
      existingCampaign.code,
    );
    const restored = await service.restoreCampaign(
      'admin-2',
      existingCampaign.code,
    );

    expect(archived.status).toBe(AgencyPlanPromotionStatus.ARCHIVED);
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(restored.status).toBe(AgencyPlanPromotionStatus.PAUSED);
    expect(restored.archivedAt).toBeNull();
  });

  it('throws a not found error for a missing campaign', async () => {
    const { service } = buildService();

    await expect(service.findCampaign('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns a sales report based on durable redemptions without exposing codes', async () => {
    const existingCampaign = buildCampaign({
      id: 'campaign-report',
      code: 'start_agents',
      name: 'Start dla agentów',
      usageCount: 7,
      usageLimitTotal: 100,
    });
    const { service, dataSource, codes } = buildService([existingCampaign], {
      totals: [
        {
          redemptionCount: '3',
          discountGrossAmount: '15000',
          subtotalGrossAmount: '60000',
          totalGrossAmount: '45000',
          firstRedemptionAt: '2026-09-20T08:00:00.000Z',
          lastRedemptionAt: '2026-09-21T08:00:00.000Z',
        },
      ],
      byPlan: [
        {
          planCode: AgencyPlan.PROFESSIONAL,
          billingInterval: AgencyPlanBillingInterval.MONTHLY,
          redemptionCount: '2',
          discountGrossAmount: '10000',
          subtotalGrossAmount: '40000',
          totalGrossAmount: '30000',
        },
      ],
      byCode: [
        {
          codeId: 'code-1',
          codeLast4: 'T-50',
          label: 'Kod START50',
          redemptionCount: '1',
          discountGrossAmount: '5000',
          subtotalGrossAmount: '20000',
          totalGrossAmount: '15000',
        },
      ],
    });
    codes.push({
      id: 'code-1',
      campaignId: existingCampaign.id,
      codeHash: hashAgencyPlanPromotionCode('AGENT-START-50'),
      codeLast4: 'T-50',
      label: 'Kod START50',
      status: AgencyPlanPromotionStatus.ACTIVE,
      usageCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as AgencyPlanPromotionCode);

    const report = await service.getSalesReport('start_agents');

    expect(dataSource.query).toHaveBeenCalledTimes(3);
    expect(dataSource.query).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      [existingCampaign.id],
    );
    expect(report).toMatchObject({
      campaign: {
        id: 'campaign-report',
        code: 'start_agents',
        name: 'Start dla agentów',
        usageCount: 7,
        usageLimitTotal: 100,
      },
      totals: {
        redemptionCount: 3,
        discountGrossAmount: 15_000,
        subtotalGrossAmount: 60_000,
        totalGrossAmount: 45_000,
      },
      byPlan: [
        {
          planCode: AgencyPlan.PROFESSIONAL,
          billingInterval: AgencyPlanBillingInterval.MONTHLY,
          redemptionCount: 2,
          discountGrossAmount: 10_000,
          subtotalGrossAmount: 40_000,
          totalGrossAmount: 30_000,
        },
      ],
      byCode: [
        {
          codeId: 'code-1',
          codeLast4: 'T-50',
          label: 'Kod START50',
          redemptionCount: 1,
          discountGrossAmount: 5_000,
          subtotalGrossAmount: 20_000,
          totalGrossAmount: 15_000,
        },
      ],
    });
    expect(report.totals.firstRedemptionAt?.toISOString()).toBe(
      '2026-09-20T08:00:00.000Z',
    );
    expect(JSON.stringify(report)).not.toContain('AGENT-START-50');
    expect(JSON.stringify(report)).not.toContain(codes[0].codeHash);
  });
});
