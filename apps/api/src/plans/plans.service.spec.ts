import { PlanCatalog } from './entities';
import { PlansService } from './plans.service';

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
    const service = new PlansService(repo as never);

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
        sortOrder: 1,
      }),
    ]);
    expect(plans[0]).not.toHaveProperty('stripePriceIdMonthly');
    expect(plans[0]).not.toHaveProperty('stripePriceIdYearly');
    expect(plans[0]).not.toHaveProperty('isPublic');
  });
});
