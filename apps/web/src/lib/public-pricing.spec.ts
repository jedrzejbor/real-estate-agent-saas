import {
  formatPlanBasePrice,
  formatPlanMoney,
  formatPlanPrice,
  getPlanPromotionDurationLabel,
} from './public-pricing';
import type {
  AgencyPlanFeatures,
  PublicPlan,
  PublicPlanIntervalPromotionPreview,
} from './billing-plans';

const enabledFeatures: AgencyPlanFeatures = {
  reportsOverview: true,
  reportsListingsBasic: true,
  reportsClientsBasic: true,
  reportsAppointmentsBasic: true,
  publicListings: true,
  publicLeadForms: true,
  agentListingMarket: true,
  customBranding: true,
  multiUser: true,
  customDomain: false,
  apiAccess: false,
  dedicatedSupport: false,
};

const professionalPlan: PublicPlan = {
  code: 'professional',
  label: 'Professional',
  description: 'Plan dla biura.',
  priceMonthlyPln: 19_900,
  priceYearlyPln: 199_000,
  promotionPreview: {
    monthly: {
      label: 'Start dla agentów',
      discountGrossAmount: 9_950,
      priceGrossAmount: 9_950,
      durationBillingCycles: 3,
    },
    yearly: null,
  },
  limits: {
    activeListings: 100,
    clients: 1_000,
    monthlyAppointments: 500,
    users: 10,
    imagesPerListing: 40,
  },
  features: enabledFeatures,
  sortOrder: 20,
};

describe('public pricing helpers', () => {
  it('formats money with fixed PLN grouping for four-digit prices', () => {
    expect(formatPlanMoney(199_000)).toBe('1 990 zł');
    expect(formatPlanMoney(9_950)).toBe('99,50 zł');
    expect(formatPlanMoney(0)).toBe('0 zł');
  });

  it('uses promotion preview price only for the matching billing interval', () => {
    expect(formatPlanPrice(professionalPlan, 'monthly')).toBe('99,50 zł');
    expect(formatPlanBasePrice(professionalPlan, 'monthly')).toBe('199 zł');
    expect(formatPlanPrice(professionalPlan, 'yearly')).toBe('1 990 zł');
  });

  it('describes promotion duration per billing interval', () => {
    const preview: PublicPlanIntervalPromotionPreview = {
      label: 'Start',
      discountGrossAmount: 1_000,
      priceGrossAmount: 9_000,
      durationBillingCycles: 2,
    };

    expect(getPlanPromotionDurationLabel(preview, 'monthly')).toBe(
      'przez pierwsze 2 mies.',
    );
    expect(getPlanPromotionDurationLabel(preview, 'yearly')).toBe(
      'przez pierwsze 2 lata',
    );
  });
});
