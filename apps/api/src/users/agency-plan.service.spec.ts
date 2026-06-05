import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { PlanCatalog } from '../plans';
import { Agency } from './entities';
import {
  AgencyPlanService,
  DEFAULT_PLAN_CATALOG,
} from './agency-plan.service';

function buildRepo(rows: Partial<PlanCatalog>[] = []) {
  return {
    find: jest.fn().mockResolvedValue(rows),
  };
}

function buildAgency(overrides: Partial<Agency> = {}): Agency {
  return {
    id: 'agency-1',
    name: 'Kowalski Real Estate',
    address: '',
    logoUrl: '',
    subscription: SubscriptionStatus.ACTIVE,
    plan: AgencyPlan.FREE,
    ownerId: 'user-1',
    agents: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

describe('AgencyPlanService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns fallback free entitlements before database catalog is loaded', () => {
    const service = new AgencyPlanService(buildRepo() as never);

    const entitlements = service.getEntitlements(buildAgency());

    expect(entitlements).toEqual({
      plan: {
        code: AgencyPlan.FREE,
        label: 'Free',
        status: SubscriptionStatus.ACTIVE,
      },
      limits: DEFAULT_PLAN_CATALOG[AgencyPlan.FREE].limits,
      features: DEFAULT_PLAN_CATALOG[AgencyPlan.FREE].features,
    });
  });

  it('loads standard plan definitions from plan_catalog', async () => {
    const service = new AgencyPlanService(
      buildRepo([
        {
          code: AgencyPlan.STARTER,
          label: 'Starter Plus',
          limits: { activeListings: 40 },
          features: { customBranding: true },
        },
      ]) as never,
    );

    await service.refreshCatalog();

    const entitlements = service.getEntitlements(
      buildAgency({ plan: AgencyPlan.STARTER }),
    );

    expect(entitlements.plan.label).toBe('Starter Plus');
    expect(entitlements.limits).toMatchObject({
      activeListings: 40,
      clients: 250,
      monthlyAppointments: 150,
      users: 1,
      imagesPerListing: 30,
    });
    expect(entitlements.features.customBranding).toBe(true);
    expect(entitlements.features.multiUser).toBe(false);
  });

  it('supports enterprise plans with unlimited limits represented as null', () => {
    const service = new AgencyPlanService(buildRepo() as never);

    const entitlements = service.getEntitlements(
      buildAgency({ plan: AgencyPlan.ENTERPRISE }),
    );

    expect(entitlements.limits).toEqual({
      activeListings: null,
      clients: null,
      monthlyAppointments: null,
      users: null,
      imagesPerListing: null,
    });
    expect(entitlements.features).toMatchObject({
      customDomain: true,
      apiAccess: true,
      dedicatedSupport: true,
    });
  });

  it('merges custom plan overrides over the custom fallback plan', () => {
    const service = new AgencyPlanService(buildRepo() as never);

    const entitlements = service.getEntitlements(
      buildAgency({
        plan: AgencyPlan.CUSTOM,
        planOverrides: {
          label: 'Plan Premium Kowalski',
          limits: {
            activeListings: 50,
            clients: 500,
            users: 3,
          },
          features: {
            customBranding: true,
            multiUser: true,
          },
        },
      }),
    );

    expect(entitlements.plan).toMatchObject({
      code: AgencyPlan.CUSTOM,
      label: 'Plan Premium Kowalski',
    });
    expect(entitlements.limits).toMatchObject({
      activeListings: 50,
      clients: 500,
      monthlyAppointments: 50,
      users: 3,
      imagesPerListing: 20,
    });
    expect(entitlements.features).toMatchObject({
      customBranding: true,
      multiUser: true,
      customDomain: false,
    });
  });

  it('ignores unknown plans and invalid JSONB values safely', async () => {
    const service = new AgencyPlanService(
      buildRepo([
        {
          code: AgencyPlan.PROFESSIONAL,
          label: '  ',
          limits: {
            activeListings: -1,
            clients: 900,
            monthlyAppointments: 100.5,
          },
          features: {
            customBranding: 'yes' as never,
            apiAccess: true,
          },
        },
      ]) as never,
    );

    await service.refreshCatalog();

    const entitlements = service.getEntitlements(
      buildAgency({
        plan: AgencyPlan.PROFESSIONAL,
        planOverrides: {
          label: '',
          limits: {
            clients: -10,
            users: null,
          },
          features: {
            multiUser: 'true' as never,
            customDomain: true,
          },
        },
      }),
    );

    expect(entitlements.plan.label).toBe('Professional');
    expect(entitlements.limits).toMatchObject({
      activeListings: 200,
      clients: 900,
      monthlyAppointments: 1_000,
      users: null,
    });
    expect(entitlements.features).toMatchObject({
      customBranding: true,
      apiAccess: true,
      multiUser: true,
      customDomain: true,
    });
  });
});
