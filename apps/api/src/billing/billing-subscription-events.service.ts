import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { MonitoringService } from '../monitoring';
import { AgencyPlanService, UsersService } from '../users';
import { Agency, Agent } from '../users/entities';
import { BillingWebhookEvent } from './entities/billing-webhook-event.entity';

const DEFAULT_LIMIT_DOWNGRADE_GRACE_DAYS = 7;

export type BillingSubscriptionEventType =
  | 'subscription_updated'
  | 'subscription_past_due'
  | 'subscription_canceled';

export interface BillingSubscriptionEventInput {
  provider: string;
  eventId: string;
  eventType: BillingSubscriptionEventType;
  agencyId?: string | null;
  billingCustomerId?: string | null;
  billingSubscriptionId?: string | null;
  plan?: AgencyPlan | null;
  subscriptionStatus?: SubscriptionStatus | null;
  billingInterval?: 'monthly' | 'yearly' | null;
  currentPeriodEnd?: Date | null;
  occurredAt?: Date;
  rawPayload?: Record<string, unknown>;
}

export interface BillingSubscriptionEventResult {
  status: 'processed' | 'ignored_duplicate';
  agencyId?: string;
  plan?: string;
  subscription?: string;
  limitGraceStartedAt?: Date | null;
  limitGraceEndsAt?: Date | null;
  limitGraceEnforcedAt?: Date | null;
}

@Injectable()
export class BillingSubscriptionEventsService {
  constructor(
    @InjectRepository(BillingWebhookEvent)
    private readonly webhookEventRepo: Repository<BillingWebhookEvent>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly usersService: UsersService,
    private readonly agencyPlanService: AgencyPlanService,
    private readonly configService: ConfigService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async processSubscriptionEvent(
    input: BillingSubscriptionEventInput,
  ): Promise<BillingSubscriptionEventResult> {
    const existingEvent = await this.webhookEventRepo.findOne({
      where: { provider: input.provider, eventId: input.eventId },
    });

    if (existingEvent) {
      return { status: 'ignored_duplicate', agencyId: existingEvent.agencyId ?? undefined };
    }

    const agency = await this.findAgencyForEvent(input);
    const now = input.occurredAt ?? new Date();

    this.applySubscriptionEventToAgency(agency, input, now);
    await this.applyListingLimitGracePeriod(agency, now);

    const savedAgency = await this.agencyRepo.save(agency);
    await this.webhookEventRepo.save(
      this.webhookEventRepo.create({
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        status: 'processed',
        agencyId: savedAgency.id,
        payload: this.buildAuditPayload(input),
      }),
    );

    return {
      status: 'processed',
      agencyId: savedAgency.id,
      plan: savedAgency.plan,
      subscription: savedAgency.subscription,
      limitGraceStartedAt: savedAgency.limitGraceStartedAt ?? null,
      limitGraceEndsAt: savedAgency.limitGraceEndsAt ?? null,
      limitGraceEnforcedAt: savedAgency.limitGraceEnforcedAt ?? null,
    };
  }

  private async findAgencyForEvent(
    input: BillingSubscriptionEventInput,
  ): Promise<Agency> {
    if (input.agencyId) {
      const agency = await this.agencyRepo.findOne({
        where: { id: input.agencyId },
      });
      if (agency) return agency;
    }

    if (input.billingSubscriptionId) {
      const agency = await this.agencyRepo.findOne({
        where: { billingSubscriptionId: input.billingSubscriptionId },
      });
      if (agency) return agency;
    }

    if (input.billingCustomerId) {
      const agency = await this.agencyRepo.findOne({
        where: { billingCustomerId: input.billingCustomerId },
      });
      if (agency) return agency;
    }

    throw new NotFoundException('Agencja dla zdarzenia billingowego nie istnieje');
  }

  private applySubscriptionEventToAgency(
    agency: Agency,
    input: BillingSubscriptionEventInput,
    now: Date,
  ): void {
    if (input.billingCustomerId !== undefined) {
      agency.billingCustomerId = input.billingCustomerId;
    }

    if (input.billingSubscriptionId !== undefined) {
      agency.billingSubscriptionId = input.billingSubscriptionId;
    }

    if (input.billingInterval !== undefined) {
      agency.billingInterval = input.billingInterval;
    }

    if (input.currentPeriodEnd !== undefined) {
      agency.currentPeriodEnd = input.currentPeriodEnd;
    }

    if (input.eventType === 'subscription_canceled') {
      agency.subscription = SubscriptionStatus.CANCELED;
      agency.plan = input.plan ?? AgencyPlan.FREE;
      agency.planChangedAt = now;
      return;
    }

    if (input.eventType === 'subscription_past_due') {
      agency.subscription = SubscriptionStatus.PAST_DUE;
      if (input.plan) {
        agency.plan = input.plan;
        agency.planChangedAt = now;
      }
      return;
    }

    agency.subscription = input.subscriptionStatus ?? SubscriptionStatus.ACTIVE;
    if (input.plan) {
      agency.plan = input.plan;
      agency.planChangedAt = now;
    }
  }

  private async applyListingLimitGracePeriod(
    agency: Agency,
    now: Date,
  ): Promise<void> {
    const entitlements = this.agencyPlanService.getEntitlements(agency);
    const activeListingsLimit = entitlements.limits.activeListings;

    if (activeListingsLimit === null) {
      this.clearLimitGracePeriod(agency);
      return;
    }

    const agentIds = await this.findAgencyAgentIds(agency.id);
    const usage = await this.getUsage(agentIds);

    if (usage.activeListings <= activeListingsLimit) {
      this.clearLimitGracePeriod(agency);
      return;
    }

    agency.limitGraceStartedAt = now;
    agency.limitGraceEndsAt = this.addDays(
      now,
      this.getLimitDowngradeGraceDays(),
    );
    agency.limitGraceEnforcedAt = null;

    this.monitoringService.recordWarning(
      'plan_limit_enforcement',
      'plan_limit_exceeded',
      {
        agencyId: agency.id,
        resource: 'activeListings',
        planCode: entitlements.plan.code,
        limit: activeListingsLimit,
        usage: usage.activeListings,
        source: 'billing_webhook',
      },
    );
    this.monitoringService.recordWarning(
      'plan_limit_enforcement',
      'plan_limit_grace_started',
      {
        agencyId: agency.id,
        resource: 'activeListings',
        planCode: entitlements.plan.code,
        limit: activeListingsLimit,
        usage: usage.activeListings,
        graceStartedAt: agency.limitGraceStartedAt.toISOString(),
        graceEndsAt: agency.limitGraceEndsAt.toISOString(),
        source: 'billing_webhook',
      },
    );
  }

  private async findAgencyAgentIds(agencyId: string): Promise<string[]> {
    const agents = await this.agentRepo.find({
      where: { agencyId },
      select: ['id'],
    });

    return agents.map((agent) => agent.id);
  }

  private async getUsage(agentIds: string[]) {
    if (agentIds.length === 0) {
      return {
        activeListings: 0,
        clients: 0,
        monthlyAppointments: 0,
        users: 0,
      };
    }

    return this.usersService.getAgencyUsageSummaryByAgentIds(agentIds);
  }

  private clearLimitGracePeriod(agency: Agency): void {
    agency.limitGraceStartedAt = null;
    agency.limitGraceEndsAt = null;
    agency.limitGraceEnforcedAt = null;
  }

  private getLimitDowngradeGraceDays(): number {
    const value = Number(
      this.configService.get<string | number>('PLAN_LIMIT_DOWNGRADE_GRACE_DAYS'),
    );

    return Number.isInteger(value) && value > 0
      ? value
      : DEFAULT_LIMIT_DOWNGRADE_GRACE_DAYS;
  }

  private addDays(date: Date, days: number): Date {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
  }

  private buildAuditPayload(
    input: BillingSubscriptionEventInput,
  ): Record<string, unknown> {
    return {
      eventType: input.eventType,
      agencyId: input.agencyId ?? null,
      billingCustomerId: input.billingCustomerId ?? null,
      billingSubscriptionId: input.billingSubscriptionId ?? null,
      plan: input.plan ?? null,
      subscriptionStatus: input.subscriptionStatus ?? null,
      billingInterval: input.billingInterval ?? null,
      currentPeriodEnd: input.currentPeriodEnd?.toISOString() ?? null,
      occurredAt: input.occurredAt?.toISOString() ?? null,
      rawPayload: input.rawPayload ?? {},
    };
  }
}
