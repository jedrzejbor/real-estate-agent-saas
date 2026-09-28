import { apiFetch } from './api-client';
import {
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetScope,
  createAdminAgencyPlanPromotionCampaign,
  createAdminAgencyPlanPromotionCode,
  fetchAdminAgencyPlanPromotionSalesReport,
  fetchAdminAgencyPlanPromotions,
  toCreateAgencyPlanPromotionCampaignInput,
  toCreateAgencyPlanPromotionCodeInput,
  updateAdminAgencyPlanPromotionCampaign,
  validateAgencyPlanPromotionCampaignForm,
} from './agency-plan-promotions';

jest.mock('./api-client', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('agency plan promotions admin HTTP client', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('calls admin agency plan promotions endpoints', async () => {
    apiFetchMock.mockResolvedValue({});

    await fetchAdminAgencyPlanPromotions();
    await createAdminAgencyPlanPromotionCampaign(
      toCreateAgencyPlanPromotionCampaignInput({
        code: 'start_agents',
        name: 'Start agents',
        description: '',
        status: AgencyPlanPromotionStatus.DRAFT,
        discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
        discountPercent: '10',
        discountGrossPln: '',
        maxDiscountGrossPln: '',
        targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
        planCodes: ['professional'],
        billingIntervals: ['monthly'],
        minimumSubtotalGrossPln: '',
        durationBillingCycles: '3',
        applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
        isAutomatic: true,
        isCombinable: false,
        usageLimitTotal: '100',
        usageLimitPerAccount: '',
        startsAt: '',
        endsAt: '',
      }),
    );
    await updateAdminAgencyPlanPromotionCampaign('start/agents', {
      status: AgencyPlanPromotionStatus.PAUSED,
    });
    await fetchAdminAgencyPlanPromotionSalesReport('start/agents');

    expect(apiFetchMock).toHaveBeenNthCalledWith(
      1,
      '/admin/agency-plan-promotions',
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/admin/agency-plan-promotions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      '/admin/agency-plan-promotions/start%2Fagents',
      { method: 'PATCH', body: { status: 'paused' } },
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      4,
      '/admin/agency-plan-promotions/start%2Fagents/sales-report',
    );
  });

  it('builds a safe campaign payload from form values', () => {
    const payload = toCreateAgencyPlanPromotionCampaignInput({
      code: 'start_agents',
      name: ' Start agents ',
      description: '',
      status: AgencyPlanPromotionStatus.ACTIVE,
      discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
      discountPercent: '10,5',
      discountGrossPln: '',
      maxDiscountGrossPln: '20',
      targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
      planCodes: ['professional', 'starter'],
      billingIntervals: ['monthly'],
      minimumSubtotalGrossPln: '199',
      durationBillingCycles: '3',
      applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      isAutomatic: true,
      isCombinable: false,
      usageLimitTotal: '',
      usageLimitPerAccount: '1',
      startsAt: '',
      endsAt: '',
    });

    expect(payload).toMatchObject({
      code: 'start_agents',
      name: 'Start agents',
      description: null,
      discountValue: 1_050,
      maxDiscountGrossAmount: 2_000,
      targetRules: {
        planCodes: ['professional', 'starter'],
        billingIntervals: ['monthly'],
        minimumSubtotalGrossAmount: 19_900,
      },
      durationBillingCycles: 3,
      applicationTiming: 'initial_checkout',
      usageLimitTotal: null,
      usageLimitPerAccount: 1,
    });
  });

  it('requires selected plans or intervals for scoped campaigns', () => {
    const validation = validateAgencyPlanPromotionCampaignForm({
      code: 'start_agents',
      name: 'Start agents',
      description: '',
      status: AgencyPlanPromotionStatus.ACTIVE,
      discountType: AgencyPlanPromotionDiscountType.PERCENTAGE,
      discountPercent: '10',
      discountGrossPln: '',
      maxDiscountGrossPln: '',
      targetScope: AgencyPlanPromotionTargetScope.PLAN_CODES,
      planCodes: [],
      billingIntervals: [],
      minimumSubtotalGrossPln: '',
      durationBillingCycles: '3',
      applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      isAutomatic: true,
      isCombinable: false,
      usageLimitTotal: '',
      usageLimitPerAccount: '',
      startsAt: '',
      endsAt: '',
    });

    expect(validation.errors.planCodes).toBe('Wybierz co najmniej jeden plan');
  });

  it('sends plaintext code only when creating a promotion code', async () => {
    apiFetchMock.mockResolvedValueOnce({});
    const payload = toCreateAgencyPlanPromotionCodeInput({
      code: ' AGENT50 ',
      label: 'Kod AGENT50',
      status: AgencyPlanPromotionStatus.ACTIVE,
      discountType: '',
      discountPercent: '',
      discountGrossPln: '',
      maxDiscountGrossPln: '',
      durationBillingCycles: '1',
      applicationTiming: AgencyPlanPromotionApplicationTiming.INITIAL_CHECKOUT,
      isCombinable: 'inherit',
      usageLimitTotal: '25',
      usageLimitPerAccount: '1',
      startsAt: '',
      endsAt: '',
    });

    await createAdminAgencyPlanPromotionCode('start_agents', payload);

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/admin/agency-plan-promotions/start_agents/codes',
      {
        method: 'POST',
        body: {
          code: 'AGENT50',
          label: 'Kod AGENT50',
          status: 'active',
          maxDiscountGrossAmount: null,
          durationBillingCycles: 1,
          applicationTiming: 'initial_checkout',
          usageLimitTotal: 25,
          usageLimitPerAccount: 1,
          startsAt: null,
          endsAt: null,
        },
      },
    );
  });
});
