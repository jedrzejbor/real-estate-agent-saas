import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { AgencyEntitlements } from './agency-plan.types';
import { AgencyLimitEnforcementService } from './agency-limit-enforcement.service';
import { AgencyUsageSummary } from './users.service';

const baseEntitlements: AgencyEntitlements = {
  plan: {
    code: AgencyPlan.FREE,
    label: 'Free',
    status: SubscriptionStatus.ACTIVE,
  },
  limits: {
    activeListings: 5,
    clients: 25,
    monthlyAppointments: 20,
    users: 1,
    imagesPerListing: 15,
  },
  features: {
    reportsOverview: true,
    reportsListingsBasic: true,
    reportsClientsBasic: true,
    reportsAppointmentsBasic: false,
    publicListings: true,
    publicLeadForms: true,
    agentListingMarket: true,
    customBranding: false,
    multiUser: false,
    customDomain: false,
    apiAccess: false,
    dedicatedSupport: false,
  },
};

const baseUsage: AgencyUsageSummary = {
  activeListings: 1,
  clients: 10,
  monthlyAppointments: 5,
  users: 0,
};

describe('AgencyLimitEnforcementService', () => {
  let service: AgencyLimitEnforcementService;

  beforeEach(() => {
    service = new AgencyLimitEnforcementService();
  });

  it('returns within_limit when usage is below all limits', () => {
    const summary = service.evaluateLimits(baseEntitlements, baseUsage);

    expect(summary.status).toBe('within_limit');
    expect(summary.hasLimitedResources).toBe(true);
    expect(summary.hasNearLimitResources).toBe(false);
    expect(summary.hasOverLimitResources).toBe(false);
    expect(summary.resources.activeListings).toMatchObject({
      usage: 1,
      limit: 5,
      remaining: 4,
      usageRatio: 0.2,
      isNearLimit: false,
      isOverLimit: false,
      enforcementAction: 'none',
    });
  });

  it('marks resources near limit without blocking usage', () => {
    const summary = service.evaluateLimits(baseEntitlements, {
      ...baseUsage,
      activeListings: 4,
    });

    expect(summary.status).toBe('near_limit');
    expect(summary.hasNearLimitResources).toBe(true);
    expect(summary.resources.activeListings).toMatchObject({
      usage: 4,
      limit: 5,
      remaining: 1,
      usageRatio: 0.8,
      isNearLimit: true,
      isOverLimit: false,
      enforcementAction: 'warn',
    });
  });

  it('evaluates a single resource without requiring a full usage summary', () => {
    const state = service.evaluateResourceLimit(
      baseEntitlements,
      'monthlyAppointments',
      21,
    );

    expect(state).toMatchObject({
      resource: 'monthlyAppointments',
      usage: 21,
      limit: 20,
      remaining: 0,
      isOverLimit: true,
      enforcementAction: 'block_new_usage',
    });
  });

  it('marks resources over limit and blocks new usage after grace period', () => {
    const summary = service.evaluateLimits(baseEntitlements, {
      ...baseUsage,
      activeListings: 8,
    });

    expect(summary.status).toBe('over_limit_enforced');
    expect(summary.hasOverLimitResources).toBe(true);
    expect(summary.isInGracePeriod).toBe(false);
    expect(summary.resources.activeListings).toMatchObject({
      usage: 8,
      limit: 5,
      remaining: 0,
      isNearLimit: false,
      isOverLimit: true,
      isInGracePeriod: false,
      enforcementAction: 'block_new_usage',
    });
  });

  it('marks over-limit resources as grace when grace period is active', () => {
    const summary = service.evaluateLimits(
      baseEntitlements,
      {
        ...baseUsage,
        clients: 30,
      },
      {
        now: new Date('2026-06-19T12:00:00.000Z'),
        gracePeriod: {
          startedAt: '2026-06-18T00:00:00.000Z',
          endsAt: '2026-06-25T00:00:00.000Z',
        },
      },
    );

    expect(summary.status).toBe('over_limit_grace');
    expect(summary.isInGracePeriod).toBe(true);
    expect(summary.resources.clients).toMatchObject({
      usage: 30,
      limit: 25,
      remaining: 0,
      isOverLimit: true,
      isInGracePeriod: true,
      enforcementAction: 'grace',
    });
  });

  it('treats null limits as unlimited resources', () => {
    const summary = service.evaluateLimits(
      {
        ...baseEntitlements,
        plan: {
          code: AgencyPlan.ENTERPRISE,
          label: 'Enterprise',
          status: SubscriptionStatus.ACTIVE,
        },
        limits: {
          ...baseEntitlements.limits,
          activeListings: null,
          clients: null,
          monthlyAppointments: null,
          users: null,
        },
      },
      {
        activeListings: 10_000,
        clients: 10_000,
        monthlyAppointments: 10_000,
        users: 100,
      },
    );

    expect(summary.status).toBe('within_limit');
    expect(summary.hasLimitedResources).toBe(false);
    expect(summary.hasOverLimitResources).toBe(false);
    expect(summary.resources.activeListings).toMatchObject({
      limit: null,
      remaining: null,
      usageRatio: null,
      isUnlimited: true,
      enforcementAction: 'none',
    });
  });

  it('clamps custom near-limit thresholds to a valid percentage range', () => {
    const summary = service.evaluateLimits(
      baseEntitlements,
      {
        ...baseUsage,
        users: 1,
      },
      {
        nearLimitThreshold: 2,
      },
    );

    expect(summary.status).toBe('near_limit');
    expect(summary.resources.users).toMatchObject({
      usage: 1,
      limit: 1,
      usageRatio: 1,
      isNearLimit: true,
      enforcementAction: 'warn',
    });
  });
});
