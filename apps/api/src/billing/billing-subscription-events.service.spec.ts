import {
  NotFoundException,
} from '@nestjs/common';
import {
  AgencyPlan,
  SubscriptionStatus,
} from '../common/enums';
import { Agency, Agent } from '../users/entities';
import { BillingSubscriptionEventsService } from './billing-subscription-events.service';

function buildAgency(input: Partial<Agency> = {}): Agency {
  return {
    id: 'agency-1',
    name: 'Agency',
    plan: AgencyPlan.PROFESSIONAL,
    subscription: SubscriptionStatus.ACTIVE,
    billingCustomerId: 'cus_1',
    billingSubscriptionId: 'sub_1',
    billingInterval: 'monthly',
    currentPeriodEnd: null,
    planChangedAt: null,
    limitGraceStartedAt: null,
    limitGraceEndsAt: null,
    limitGraceEnforcedAt: null,
    ...input,
  } as Agency;
}

function buildService(input: {
  agency?: Agency;
  existingEvent?: { agencyId?: string | null };
  usage?: {
    activeListings: number;
    clients: number;
    monthlyAppointments: number;
    users: number;
  };
  activeListingsLimit?: number | null;
  config?: Record<string, unknown>;
} = {}) {
  const agency = input.agency ?? buildAgency();
  const webhookEventRepo = {
    findOne: jest.fn().mockResolvedValue(input.existingEvent ?? null),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const agencyRepo = {
    findOne: jest.fn(async ({ where }: { where: Partial<Agency> }) => {
      if (where.id && where.id === agency.id) return agency;
      if (
        where.billingSubscriptionId &&
        where.billingSubscriptionId === agency.billingSubscriptionId
      ) {
        return agency;
      }
      if (
        where.billingCustomerId &&
        where.billingCustomerId === agency.billingCustomerId
      ) {
        return agency;
      }
      return null;
    }),
    save: jest.fn(async (value) => value),
  };
  const agentRepo = {
    find: jest.fn().mockResolvedValue([{ id: 'agent-1' }] as Agent[]),
  };
  const usersService = {
    getAgencyUsageSummaryByAgentIds: jest.fn().mockResolvedValue(
      input.usage ?? {
        activeListings: 9,
        clients: 10,
        monthlyAppointments: 3,
        users: 1,
      },
    ),
  };
  const agencyPlanService = {
    getEntitlements: jest.fn((currentAgency: Agency) => ({
      plan: {
        code: currentAgency.plan,
        label: currentAgency.plan,
        status: currentAgency.subscription,
      },
      limits: {
        activeListings: input.activeListingsLimit ?? 5,
        clients: 25,
        monthlyAppointments: 20,
        users: 1,
        imagesPerListing: 15,
      },
      features: {},
    })),
  };
  const configService = {
    get: jest.fn((key: string) => input.config?.[key]),
  };
  const monitoringService = {
    recordWarning: jest.fn(),
  };

  const service = new BillingSubscriptionEventsService(
    webhookEventRepo as never,
    agencyRepo as never,
    agentRepo as never,
    usersService as never,
    agencyPlanService as never,
    configService as never,
    monitoringService as never,
  );

  return {
    service,
    agency,
    webhookEventRepo,
    agencyRepo,
    usersService,
    monitoringService,
  };
}

describe('BillingSubscriptionEventsService', () => {
  it('ignores already processed provider event ids', async () => {
    const { service, agencyRepo, webhookEventRepo } = buildService({
      existingEvent: { agencyId: 'agency-1' },
    });

    const result = await service.processSubscriptionEvent({
      provider: 'stripe',
      eventId: 'evt_1',
      eventType: 'subscription_updated',
      agencyId: 'agency-1',
      plan: AgencyPlan.STARTER,
    });

    expect(result).toEqual({
      status: 'ignored_duplicate',
      agencyId: 'agency-1',
    });
    expect(agencyRepo.save).not.toHaveBeenCalled();
    expect(webhookEventRepo.save).not.toHaveBeenCalled();
  });

  it('falls back canceled subscriptions to Free and starts grace when usage exceeds the new limit', async () => {
    const { service, agencyRepo, webhookEventRepo, monitoringService } =
      buildService({
        config: { PLAN_LIMIT_DOWNGRADE_GRACE_DAYS: 3 },
      });
    const occurredAt = new Date('2026-06-23T10:00:00.000Z');

    const result = await service.processSubscriptionEvent({
      provider: 'stripe',
      eventId: 'evt_cancel',
      eventType: 'subscription_canceled',
      billingSubscriptionId: 'sub_1',
      occurredAt,
      rawPayload: { type: 'customer.subscription.deleted' },
    });

    expect(result).toMatchObject({
      status: 'processed',
      agencyId: 'agency-1',
      plan: AgencyPlan.FREE,
      subscription: SubscriptionStatus.CANCELED,
      limitGraceStartedAt: occurredAt,
      limitGraceEndsAt: new Date('2026-06-26T10:00:00.000Z'),
      limitGraceEnforcedAt: null,
    });
    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: AgencyPlan.FREE,
        subscription: SubscriptionStatus.CANCELED,
        planChangedAt: occurredAt,
        limitGraceStartedAt: occurredAt,
        limitGraceEndsAt: new Date('2026-06-26T10:00:00.000Z'),
      }),
    );
    expect(webhookEventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'stripe',
        eventId: 'evt_cancel',
        eventType: 'subscription_canceled',
        status: 'processed',
        agencyId: 'agency-1',
      }),
    );
    expect(monitoringService.recordWarning).toHaveBeenCalledWith(
      'plan_limit_enforcement',
      'plan_limit_grace_started',
      expect.objectContaining({
        agencyId: 'agency-1',
        source: 'billing_webhook',
        limit: 5,
        usage: 9,
      }),
    );
  });

  it('persists failed events when agency lookup fails', async () => {
    const { service, agencyRepo, webhookEventRepo } = buildService();

    await expect(
      service.processSubscriptionEvent({
        provider: 'stripe',
        eventId: 'evt_missing_agency',
        eventType: 'subscription_updated',
        agencyId: 'missing-agency',
        billingCustomerId: 'missing-customer',
        plan: AgencyPlan.STARTER,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(agencyRepo.save).not.toHaveBeenCalled();
    expect(webhookEventRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'stripe',
        eventId: 'evt_missing_agency',
        eventType: 'subscription_updated',
        status: 'failed',
        agencyId: null,
        error: 'Agencja dla zdarzenia billingowego nie istnieje',
      }),
    );
  });

  it('clears grace period when an updated subscription fits current usage', async () => {
    const agency = buildAgency({
      plan: AgencyPlan.FREE,
      subscription: SubscriptionStatus.PAST_DUE,
      limitGraceStartedAt: new Date('2026-06-20T10:00:00.000Z'),
      limitGraceEndsAt: new Date('2026-06-27T10:00:00.000Z'),
      limitGraceEnforcedAt: null,
    });
    const { service, agencyRepo } = buildService({
      agency,
      usage: {
        activeListings: 9,
        clients: 10,
        monthlyAppointments: 3,
        users: 1,
      },
      activeListingsLimit: 25,
    });

    const result = await service.processSubscriptionEvent({
      provider: 'stripe',
      eventId: 'evt_update',
      eventType: 'subscription_updated',
      billingCustomerId: 'cus_1',
      plan: AgencyPlan.STARTER,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      billingInterval: 'yearly',
      currentPeriodEnd: new Date('2026-07-23T10:00:00.000Z'),
      occurredAt: new Date('2026-06-23T10:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'processed',
      agencyId: 'agency-1',
      plan: AgencyPlan.STARTER,
      subscription: SubscriptionStatus.ACTIVE,
      limitGraceStartedAt: null,
      limitGraceEndsAt: null,
      limitGraceEnforcedAt: null,
    });
    expect(agencyRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: AgencyPlan.STARTER,
        subscription: SubscriptionStatus.ACTIVE,
        billingInterval: 'yearly',
        currentPeriodEnd: new Date('2026-07-23T10:00:00.000Z'),
        limitGraceStartedAt: null,
        limitGraceEndsAt: null,
        limitGraceEnforcedAt: null,
      }),
    );
  });
});
