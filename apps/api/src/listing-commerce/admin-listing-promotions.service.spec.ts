import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminListingPromotionsService } from './admin-listing-promotions.service';
import {
  ListingPromotionCampaign,
  ListingPromotionCode,
} from './entities';
import {
  ListingProductType,
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetScope,
} from './listing-commerce.types';
import { hashPromotionCode } from './listing-promotions.service';

function buildCampaign(
  overrides: Partial<ListingPromotionCampaign> = {},
): ListingPromotionCampaign {
  return {
    id: 'campaign-1',
    code: 'start_private_sellers',
    name: 'Start dla prywatnych',
    description: null,
    status: ListingPromotionCampaignStatus.DRAFT,
    discountType: ListingPromotionDiscountType.PERCENTAGE,
    discountValue: 1_000,
    maxDiscountGrossAmount: 2_000,
    targetScope: ListingPromotionTargetScope.PRODUCT_TYPES,
    targetRules: { productTypes: ['publication'] },
    isAutomatic: false,
    isCombinable: false,
    usageLimitTotal: 100,
    usageLimitPerUser: 1,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    createdByUserId: 'admin-1',
    updatedByUserId: 'admin-1',
    archivedAt: null,
    createdAt: new Date('2026-09-10T10:00:00.000Z'),
    updatedAt: new Date('2026-09-10T10:00:00.000Z'),
    codes: [],
    ...overrides,
  } as ListingPromotionCampaign;
}

function buildService(initialCampaigns: ListingPromotionCampaign[] = []) {
  const campaigns = [...initialCampaigns];
  const codes: ListingPromotionCode[] = [];

  const manager = {
    findOne: jest.fn(async (entity, options) => {
      if (entity === ListingPromotionCampaign) {
        return (
          campaigns.find(
            (campaign) =>
              campaign.code === options.where.code ||
              campaign.id === options.where.id,
          ) ?? null
        );
      }
      if (entity === ListingPromotionCode) {
        return (
          codes.find((code) => code.codeHash === options.where.codeHash) ?? null
        );
      }
      return null;
    }),
    find: jest.fn(async (entity, options) => {
      if (entity !== ListingPromotionCode) return [];
      return codes.filter((code) => code.campaignId === options.where.campaignId);
    }),
    create: jest.fn((entity, value) => ({
      id:
        entity === ListingPromotionCampaign
          ? `campaign-${campaigns.length + 1}`
          : `code-${codes.length + 1}`,
      createdAt: new Date('2026-09-10T11:00:00.000Z'),
      updatedAt: new Date('2026-09-10T11:00:00.000Z'),
      ...value,
    })),
    save: jest.fn(async (value) => {
      if ('codeHash' in value) {
        codes.push(value as ListingPromotionCode);
        return value;
      }
      const index = campaigns.findIndex((campaign) => campaign.id === value.id);
      if (index >= 0) campaigns[index] = value as ListingPromotionCampaign;
      else campaigns.push(value as ListingPromotionCampaign);
      return value;
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (callback) => callback(manager)),
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
    service: new AdminListingPromotionsService(dataSource as never),
    dataSource,
    manager,
    campaigns,
    codes,
  };
}

describe('AdminListingPromotionsService', () => {
  it('creates a normalized campaign without activating it by default', async () => {
    const { service, dataSource, campaigns } = buildService();

    const campaign = await service.createCampaign('admin-1', {
      code: 'start_private_sellers',
      name: ' Start dla prywatnych ',
      description: ' 10% na publikację ',
      discountType: ListingPromotionDiscountType.PERCENTAGE,
      discountValue: 1_000,
      maxDiscountGrossAmount: 2_000,
      targetScope: ListingPromotionTargetScope.PRODUCT_TYPES,
      targetRules: {
        productTypes: [
          ListingProductType.PUBLICATION,
          ListingProductType.PUBLICATION,
        ],
        minimumSubtotalGrossAmount: 4_900,
      },
      usageLimitTotal: 100,
      usageLimitPerUser: 1,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(campaign).toMatchObject({
      code: 'start_private_sellers',
      name: 'Start dla prywatnych',
      description: '10% na publikację',
      status: ListingPromotionCampaignStatus.DRAFT,
      targetRules: {
        productTypes: ['publication'],
        minimumSubtotalGrossAmount: 4_900,
      },
      usageCount: 0,
      codes: [],
    });
    expect(campaigns).toHaveLength(1);
  });

  it('rejects an invalid percentage discount and target rules', async () => {
    const { service } = buildService();

    await expect(
      service.createCampaign('admin-1', {
        code: 'broken_campaign',
        name: 'Błędna kampania',
        discountType: ListingPromotionDiscountType.PERCENTAGE,
        discountValue: 10_001,
        targetScope: ListingPromotionTargetScope.PRODUCT_TYPES,
        targetRules: { productTypes: [] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a hashed promotion code and never returns the hash or plaintext', async () => {
    const existingCampaign = buildCampaign({
      status: ListingPromotionCampaignStatus.ACTIVE,
    });
    const { service, codes } = buildService([existingCampaign]);

    const campaign = await service.createCode(
      'admin-2',
      existingCampaign.code,
      {
        code: ' start-10 ',
        label: 'Kod START10',
        usageLimitTotal: 25,
      },
    );

    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatchObject({
      campaignId: existingCampaign.id,
      codeHash: hashPromotionCode('START-10'),
      codeLast4: 'T-10',
      label: 'Kod START10',
      usageCount: 0,
    });
    expect(campaign.codes).toHaveLength(1);
    expect(campaign.codes[0]).toMatchObject({
      codeLast4: 'T-10',
      label: 'Kod START10',
      usageLimitTotal: 25,
    });
    expect(JSON.stringify(campaign)).not.toContain('START-10');
    expect(JSON.stringify(campaign)).not.toContain(codes[0].codeHash);
  });

  it('rejects duplicate promotion codes by normalized hash', async () => {
    const existingCampaign = buildCampaign();
    const { service } = buildService([existingCampaign]);

    await service.createCode('admin-1', existingCampaign.code, {
      code: 'START10',
      label: 'Pierwszy kod',
    });

    await expect(
      service.createCode('admin-1', existingCampaign.code, {
        code: ' start10 ',
        label: 'Drugi kod',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('archives and restores a campaign without making it active automatically', async () => {
    const existingCampaign = buildCampaign({
      status: ListingPromotionCampaignStatus.ACTIVE,
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

    expect(archived.status).toBe(ListingPromotionCampaignStatus.ARCHIVED);
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(restored.status).toBe(ListingPromotionCampaignStatus.PAUSED);
    expect(restored.archivedAt).toBeNull();
  });

  it('throws a not found error for a missing campaign', async () => {
    const { service } = buildService();

    await expect(service.findCampaign('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
