import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AgencyPlan } from '../common/enums';
import { PlanCatalog } from '../plans';
import { AdminPlansService } from './admin-plans.service';

function buildPlan(overrides: Partial<PlanCatalog> = {}): PlanCatalog {
  return {
    code: AgencyPlan.STARTER,
    label: 'Starter',
    description: 'Starter plan',
    priceMonthlyPln: 9900,
    priceYearlyPln: 99000,
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

function buildService(plans: PlanCatalog[] = [buildPlan()]) {
  const repo = {
    find: jest.fn().mockResolvedValue(plans),
    findOne: jest.fn(({ where: { code } }) =>
      Promise.resolve(plans.find((plan) => plan.code === code) ?? null),
    ),
    save: jest.fn(async (plan) => plan),
  };
  const agencyPlanService = {
    ensureSystemPlanCatalog: jest.fn().mockResolvedValue(undefined),
    refreshCatalog: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new AdminPlansService(repo as never, agencyPlanService as never),
    repo,
    agencyPlanService,
  };
}

describe('AdminPlansService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists plans without provider-specific configuration', async () => {
    const { service, repo } = buildService();

    const plans = await service.findPlans();

    expect(repo.find).toHaveBeenCalledWith({
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ code: AgencyPlan.STARTER });
    expect(plans[0]).not.toHaveProperty('billingWarnings');
  });

  it('updates editable plan fields and refreshes entitlement catalog cache', async () => {
    const plan = buildPlan();
    const { service, repo, agencyPlanService } = buildService([plan]);

    const updated = await service.updatePlan(AgencyPlan.STARTER, {
      label: ' Starter Plus ',
      description: ' ',
      priceMonthlyPln: 12900,
      limits: {
        activeListings: 40,
      },
      features: {
        customBranding: true,
      },
      sortOrder: 2,
    });

    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Starter Plus',
        description: null,
        priceMonthlyPln: 12900,
        sortOrder: 2,
      }),
    );
    expect(agencyPlanService.refreshCatalog).toHaveBeenCalledTimes(1);
    expect(updated.limits).toMatchObject({
      activeListings: 40,
      clients: 250,
    });
    expect(updated.features).toMatchObject({
      customBranding: true,
      multiUser: false,
    });
  });

  it('rejects non-system plan codes', async () => {
    const { service, repo } = buildService();

    await expect(service.findPlan(AgencyPlan.CUSTOM)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.updatePlan('unknown', { label: 'Unknown' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('rejects updates to missing plans', async () => {
    const { service } = buildService([]);

    await expect(service.findPlan(AgencyPlan.STARTER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('keeps Free plan non-billable', async () => {
    const freePlan = buildPlan({
      code: AgencyPlan.FREE,
      label: 'Free',
      priceMonthlyPln: 0,
      priceYearlyPln: 0,
      sortOrder: 0,
    });
    const { service } = buildService([freePlan]);

    await expect(
      service.updatePlan(AgencyPlan.FREE, { priceMonthlyPln: 100 }),
    ).rejects.toBeInstanceOf(BadRequestException);

  });

  it('requires complete limits and features after update', async () => {
    const incompletePlan = buildPlan({
      limits: {
        activeListings: 25,
      },
    });
    const { service } = buildService([incompletePlan]);

    await expect(
      service.updatePlan(AgencyPlan.STARTER, { label: 'Starter' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
