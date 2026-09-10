import { apiFetch } from './api-client';
import { ListingProductType } from './listing-products';
import {
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetScope,
  createAdminListingPromotionCampaign,
  createAdminListingPromotionCode,
  fetchAdminListingPromotions,
  toCreatePromotionCampaignInput,
  toCreatePromotionCodeInput,
  updateAdminListingPromotionCampaign,
} from './listing-promotions';

jest.mock('./api-client', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('listing promotions admin HTTP client', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('calls admin listing promotions endpoints', async () => {
    apiFetchMock.mockResolvedValue({});

    await fetchAdminListingPromotions();
    await createAdminListingPromotionCampaign(
      toCreatePromotionCampaignInput({
        code: 'start_private',
        name: 'Start private',
        description: '',
        status: ListingPromotionCampaignStatus.DRAFT,
        discountType: ListingPromotionDiscountType.PERCENTAGE,
        discountPercent: '10',
        discountGrossPln: '',
        maxDiscountGrossPln: '',
        targetScope: ListingPromotionTargetScope.PRODUCT_TYPES,
        productTypes: [ListingProductType.PUBLICATION],
        productCodes: '',
        minimumSubtotalGrossPln: '',
        isAutomatic: false,
        isCombinable: false,
        usageLimitTotal: '100',
        usageLimitPerUser: '',
        startsAt: '',
        endsAt: '',
      }),
    );
    await updateAdminListingPromotionCampaign('start/private', {
      status: ListingPromotionCampaignStatus.PAUSED,
    });

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/admin/listing-promotions',
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/admin/listing-promotions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      '/admin/listing-promotions/start%2Fprivate',
      { method: 'PATCH', body: { status: 'paused' } },
    );
  });

  it('builds a safe campaign payload from form values', () => {
    const payload = toCreatePromotionCampaignInput({
      code: 'start_private',
      name: ' Start private ',
      description: '',
      status: ListingPromotionCampaignStatus.ACTIVE,
      discountType: ListingPromotionDiscountType.PERCENTAGE,
      discountPercent: '10,5',
      discountGrossPln: '',
      maxDiscountGrossPln: '20',
      targetScope: ListingPromotionTargetScope.PRODUCT_CODES,
      productTypes: [],
      productCodes: 'publication_60_days, publication_60_days',
      minimumSubtotalGrossPln: '49',
      isAutomatic: true,
      isCombinable: false,
      usageLimitTotal: '',
      usageLimitPerUser: '1',
      startsAt: '',
      endsAt: '',
    });

    expect(payload).toMatchObject({
      code: 'start_private',
      name: 'Start private',
      description: null,
      discountValue: 1_050,
      maxDiscountGrossAmount: 2_000,
      targetRules: {
        productCodes: ['publication_60_days'],
        minimumSubtotalGrossAmount: 4_900,
      },
      usageLimitTotal: null,
      usageLimitPerUser: 1,
    });
  });

  it('sends plaintext code only when creating a promotion code', async () => {
    apiFetchMock.mockResolvedValueOnce({});
    const payload = toCreatePromotionCodeInput({
      code: ' START10 ',
      label: 'Kod START10',
      status: ListingPromotionCampaignStatus.ACTIVE,
      discountType: '',
      discountPercent: '',
      discountGrossPln: '',
      maxDiscountGrossPln: '',
      isCombinable: 'inherit',
      usageLimitTotal: '25',
      usageLimitPerUser: '',
      startsAt: '',
      endsAt: '',
    });

    await createAdminListingPromotionCode('start_private', payload);

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/listing-promotions/start_private/codes',
      {
        method: 'POST',
        body: {
          code: 'START10',
          label: 'Kod START10',
          status: 'active',
          maxDiscountGrossAmount: null,
          usageLimitTotal: 25,
          usageLimitPerUser: null,
          startsAt: null,
          endsAt: null,
        },
      },
    );
  });
});
