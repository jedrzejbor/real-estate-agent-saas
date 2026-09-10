import { Repository } from 'typeorm';
import {
  ListingProductCatalog,
  ListingPromotionCampaign,
  ListingPromotionCode,
} from './entities';
import {
  ListingProductType,
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetScope,
} from './listing-commerce.types';
import {
  hashPromotionCode,
  ListingPromotionsService,
} from './listing-promotions.service';

function buildProduct(
  overrides: Partial<ListingProductCatalog> = {},
): ListingProductCatalog {
  return Object.assign(new ListingProductCatalog(), {
    id: 'product-1',
    code: 'publication_60_days',
    name: 'Publikacja ogłoszenia',
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 4_900,
    currency: 'PLN',
    durationDays: 60,
    ...overrides,
  });
}

function buildCampaign(
  overrides: Partial<ListingPromotionCampaign> = {},
): ListingPromotionCampaign {
  return Object.assign(new ListingPromotionCampaign(), {
    id: 'campaign-1',
    code: 'START',
    name: 'Promocja startowa',
    status: ListingPromotionCampaignStatus.ACTIVE,
    discountType: ListingPromotionDiscountType.PERCENTAGE,
    discountValue: 2_000,
    maxDiscountGrossAmount: null,
    targetScope: ListingPromotionTargetScope.ALL_PRODUCTS,
    targetRules: {},
    isAutomatic: true,
    isCombinable: false,
    usageLimitTotal: null,
    usageLimitPerUser: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    ...overrides,
  });
}

function buildCode(
  overrides: Partial<ListingPromotionCode> = {},
): ListingPromotionCode {
  const campaign = buildCampaign({
    id: 'campaign-code',
    name: 'Kampania kodowa',
    isAutomatic: false,
  });

  return Object.assign(new ListingPromotionCode(), {
    id: 'code-1',
    campaign,
    campaignId: campaign.id,
    codeHash: hashPromotionCode('START10'),
    codeLast4: 'RT10',
    label: 'Kod promocyjny',
    status: ListingPromotionCampaignStatus.ACTIVE,
    discountType: null,
    discountValue: null,
    maxDiscountGrossAmount: null,
    isCombinable: null,
    usageLimitTotal: null,
    usageLimitPerUser: null,
    usageCount: 0,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    ...overrides,
  });
}

function buildService(options?: {
  campaigns?: ListingPromotionCampaign[];
  code?: ListingPromotionCode | null;
}) {
  const campaignRepo = {
    find: jest.fn().mockResolvedValue(options?.campaigns ?? []),
  };
  const codeRepo = {
    findOne: jest.fn().mockResolvedValue(options?.code ?? null),
  };
  const service = new ListingPromotionsService(
    campaignRepo as unknown as Repository<ListingPromotionCampaign>,
    codeRepo as unknown as Repository<ListingPromotionCode>,
  );

  return { service, campaignRepo, codeRepo };
}

describe('ListingPromotionsService', () => {
  it('normalizes and hashes codes without exposing plaintext in references', async () => {
    const code = buildCode();
    const { service, codeRepo } = buildService({ code });

    const discounts = await service.resolveDiscounts({
      products: [buildProduct()],
      promotionCode: ' start 10 ',
      now: new Date('2026-09-10T12:00:00.000Z'),
    });

    expect(codeRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['campaign'],
        where: expect.arrayContaining([
          expect.objectContaining({ codeHash: hashPromotionCode('START10') }),
        ]),
      }),
    );
    expect(discounts).toEqual([
      expect.objectContaining({
        sourceType: 'promotion_code',
        sourceReference: code.id,
        label: 'Kod promocyjny',
      }),
    ]);
    expect(JSON.stringify(discounts)).not.toContain('START10');
  });

  it('selects the better non-combinable discount between automatic campaign and code', async () => {
    const automatic = buildCampaign({
      id: 'campaign-auto',
      name: 'Automatycznie -20%',
      discountType: ListingPromotionDiscountType.PERCENTAGE,
      discountValue: 2_000,
    });
    const codeCampaign = buildCampaign({
      id: 'campaign-code',
      name: 'Kod 1000 zł',
      discountType: ListingPromotionDiscountType.FIXED_GROSS,
      discountValue: 1_000,
      isAutomatic: false,
    });
    const code = buildCode({ campaign: codeCampaign, campaignId: codeCampaign.id });
    const { service } = buildService({ campaigns: [automatic], code });

    const discounts = await service.resolveDiscounts({
      products: [buildProduct()],
      promotionCode: 'START10',
      now: new Date('2026-09-10T12:00:00.000Z'),
    });

    expect(discounts).toEqual([
      expect.objectContaining({
        sourceType: 'promotion_code',
        sourceReference: code.id,
        grossAmount: 1_000,
      }),
    ]);
  });

  it('targets discounts to configured product types', async () => {
    const campaign = buildCampaign({
      targetScope: ListingPromotionTargetScope.PRODUCT_TYPES,
      targetRules: { productTypes: [ListingProductType.FEATURED] },
      discountType: ListingPromotionDiscountType.PERCENTAGE,
      discountValue: 5_000,
    });
    const publication = buildProduct();
    const featured = buildProduct({
      id: 'product-featured',
      code: 'featured_7_days',
      type: ListingProductType.FEATURED,
      priceGrossAmount: 1_900,
      durationDays: 7,
    });
    const { service } = buildService({ campaigns: [campaign] });

    await expect(
      service.resolveDiscounts({
        products: [publication, featured],
        now: new Date('2026-09-10T12:00:00.000Z'),
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        grossAmount: 950,
        productCodes: ['featured_7_days'],
      }),
    ]);
  });

  it('ignores campaigns and codes whose total usage limit is exhausted', async () => {
    const campaign = buildCampaign({ usageLimitTotal: 1, usageCount: 1 });
    const code = buildCode({ usageLimitTotal: 1, usageCount: 1 });
    const { service } = buildService({ campaigns: [campaign], code });

    await expect(
      service.resolveDiscounts({
        products: [buildProduct()],
        promotionCode: 'START10',
        now: new Date('2026-09-10T12:00:00.000Z'),
      }),
    ).resolves.toEqual([]);
  });
});
