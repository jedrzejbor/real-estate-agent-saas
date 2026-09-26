import { PlanCatalog } from './entities';
import { PlansService } from './plans.service';
import { AgencyPlanBillingInterval } from '../agency-plan-commerce';
import { AgencyPlan } from '../common/enums';

function buildPlan(overrides: Partial<PlanCatalog> = {}): PlanCatalog {
  return {
    code: 'starter',
    label: 'Starter',
    description: 'Starter plan',
    priceMonthlyPln: 9900,
    priceYearlyPln: 99000,
    stripePriceIdMonthly: 'price_starter_monthly',
    stripePriceIdYearly: 'price_starter_yearly',
    limits: {
      activeListings: 25,
      clients: 250,
      monthlyAppointments: 150,
      users: 1,
      imagesPerListing: 30,
    },
    features: {
      reportsOverview: true,
      reportsListingsBasic: true,
      reportsClientsBasic: true,
      reportsAppointmentsBasic: true,
      publicListings: true,
      publicLeadForms: true,
      agentListingMarket: true,
      customBranding: false,
      multiUser: false,
      customDomain: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
    isPublic: true,
    sortOrder: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PlansService', () => {
  it('returns only public pricing data without billing provider identifiers', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([buildPlan()]),
    };
    const promotionsService = {
      resolveAutomaticPreview: jest.fn().mockResolvedValue(null),
    };
    const service = new PlansService(repo as never, promotionsService as never);

    const plans = await service.findPublicPlans();

    expect(repo.find).toHaveBeenCalledWith({
      where: { isPublic: true },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    expect(plans).toEqual([
      expect.objectContaining({
        code: 'starter',
        label: 'Starter',
        priceMonthlyPln: 9900,
        priceYearlyPln: 99000,
        promotionPreview: null,
        sortOrder: 1,
      }),
    ]);
    expect(promotionsService.resolveAutomaticPreview).toHaveBeenCalledWith({
      plan: expect.objectContaining({ code: 'starter' }),
      billingInterval: AgencyPlanBillingInterval.MONTHLY,
      now: expect.any(Date),
    });
    expect(promotionsService.resolveAutomaticPreview).toHaveBeenCalledWith({
      plan: expect.objectContaining({ code: 'starter' }),
      billingInterval: AgencyPlanBillingInterval.YEARLY,
      now: expect.any(Date),
    });
    expect(plans[0]).not.toHaveProperty('stripePriceIdMonthly');
    expect(plans[0]).not.toHaveProperty('stripePriceIdYearly');
    expect(plans[0]).not.toHaveProperty('isPublic');
    expect(JSON.stringify(plans[0])).not.toContain('campaign-1');
  });

  it('returns automatic promotion preview per billing interval', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([buildPlan()]),
    };
    const promotionsService = {
      resolveAutomaticPreview: jest
        .fn()
        .mockResolvedValueOnce({
          label: 'Start dla agentów',
          discountGrossAmount: 4950,
          priceGrossAmount: 4950,
          durationBillingCycles: 3,
          campaignId: 'campaign-1',
        })
        .mockResolvedValueOnce(null),
    };
    const service = new PlansService(repo as never, promotionsService as never);

    const [plan] = await service.findPublicPlans();

    expect(plan.promotionPreview).toEqual({
      monthly: {
        label: 'Start dla agentów',
        discountGrossAmount: 4950,
        priceGrossAmount: 4950,
        durationBillingCycles: 3,
      },
      yearly: null,
    });
  });

  it('shows a targeted promotion only on the matching plan and billing interval', async () => {
    const repo = {
      find: jest.fn().mockResolvedValue([
        buildPlan({
          code: AgencyPlan.FREE,
          label: 'Free',
          priceMonthlyPln: 0,
          priceYearlyPln: 0,
        }),
        buildPlan({ code: AgencyPlan.STARTER }),
        buildPlan({
          code: AgencyPlan.PROFESSIONAL,
          label: 'Professional',
          priceMonthlyPln: 24_900,
        }),
      ]),
    };
    const promotionsService = {
      resolveAutomaticPreview: jest.fn(
        ({ plan, billingInterval }: {
          plan: PlanCatalog;
          billingInterval: AgencyPlanBillingInterval;
        }) => Promise.resolve(
          plan.code === AgencyPlan.STARTER &&
            billingInterval === AgencyPlanBillingInterval.MONTHLY
            ? {
                label: 'Starter na start',
                discountGrossAmount: 4_950,
                priceGrossAmount: 4_950,
                durationBillingCycles: 2,
                campaignId: 'campaign-starter-only',
              }
            : null,
        ),
      ),
    };
    const service = new PlansService(repo as never, promotionsService as never);

    const plans = await service.findPublicPlans();

    expect(plans.map((plan) => [plan.code, plan.promotionPreview])).toEqual([
      [AgencyPlan.FREE, null],
      [
        AgencyPlan.STARTER,
        {
          monthly: {
            label: 'Starter na start',
            discountGrossAmount: 4_950,
            priceGrossAmount: 4_950,
            durationBillingCycles: 2,
          },
          yearly: null,
        },
      ],
      [AgencyPlan.PROFESSIONAL, null],
    ]);
    expect(JSON.stringify(plans)).not.toContain('campaign-starter-only');
  });
});
