import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ActivityLog,
  type ActivityLogChange,
} from '../activity/entities/activity-log.entity';
import { MonitoringService } from '../monitoring';
import { ActivityAction, AgencyPlan } from '../common/enums';
import {
  AgencyLimitDowngradeEnforcementService,
  AgencyPlanService,
  UsersService,
} from '../users';
import {
  AgencyEntitlements,
  AgencyPlanLimits,
  AgencyPlanOverrides,
} from '../users/agency-plan.types';
import { Agency, Agent } from '../users/entities';
import { AgencyUsageSummary } from '../users/users.service';
import { AdminAgenciesQueryDto, UpdateAgencyPlanDto } from './dto';

const DEFAULT_LIMIT_DOWNGRADE_GRACE_DAYS = 7;
const DEFAULT_LIMIT_ENFORCEMENT_AUDIT_LIMIT = 25;
const MAX_LIMIT_ENFORCEMENT_AUDIT_LIMIT = 100;
const PLAN_LIMIT_DOWNGRADE_ENFORCEMENT_REASON =
  'plan_limit_downgrade_enforcement';

export interface LimitWarning {
  resource: keyof AgencyPlanLimits;
  usage: number;
  limit: number;
  message: string;
}

export interface AdminAgencyPlanResponse {
  agency: {
    id: string;
    name: string;
    plan: string;
    subscription: string;
    planChangedAt: Date | null;
  };
  planOverrides: AgencyPlanOverrides | null;
  entitlements: AgencyEntitlements;
  usage: AgencyUsageSummary;
  limitWarnings: LimitWarning[];
}

export interface AdminAgencyListItem {
  id: string;
  name: string;
  plan: string;
  subscription: string;
  ownerId: string | null;
  planChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminLimitEnforcementAuditItem {
  id: string;
  agencyId: string | null;
  listingId: string | null;
  agentId: string;
  action: ActivityAction;
  reason: string | null;
  previousStatus: unknown;
  newStatus: unknown;
  previousPublicationStatus: unknown;
  newPublicationStatus: unknown;
  planLimit: unknown;
  usageBeforeEnforcement: unknown;
  enforcedAt: string | null;
  createdAt: Date;
}

@Injectable()
export class AdminAgencyPlansService {
  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(ActivityLog)
    private readonly activityRepo: Repository<ActivityLog>,
    private readonly usersService: UsersService,
    private readonly agencyPlanService: AgencyPlanService,
    private readonly agencyLimitDowngradeEnforcementService: AgencyLimitDowngradeEnforcementService,
    private readonly configService: ConfigService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async findAgencies(
    query: AdminAgenciesQueryDto = {},
  ): Promise<AdminAgencyListItem[]> {
    const qb = this.agencyRepo
      .createQueryBuilder('agency')
      .orderBy('agency.createdAt', 'DESC')
      .limit(100);

    const search = query.search?.trim();
    if (search) {
      qb.where('agency.name ILIKE :search', { search: `%${search}%` });
    }

    const agencies = await qb.getMany();
    return agencies.map((agency) => ({
      id: agency.id,
      name: agency.name,
      plan: agency.plan,
      subscription: agency.subscription,
      ownerId: agency.ownerId ?? null,
      planChangedAt: agency.planChangedAt ?? null,
      createdAt: agency.createdAt,
      updatedAt: agency.updatedAt,
    }));
  }

  async findAgencyPlan(agencyId: string): Promise<AdminAgencyPlanResponse> {
    const agency = await this.findAgency(agencyId);
    return this.buildResponse(agency);
  }

  async updateAgencyPlan(
    agencyId: string,
    dto: UpdateAgencyPlanDto,
  ): Promise<AdminAgencyPlanResponse> {
    const agency = await this.findAgency(agencyId);

    agency.plan = dto.plan;
    agency.planOverrides = this.resolvePlanOverrides(dto);
    const now = new Date();
    agency.planChangedAt = now;

    await this.applyListingLimitGracePeriod(agency, now);

    const savedAgency = await this.agencyRepo.save(agency);
    return this.buildResponse(savedAgency);
  }

  async resetAgencyPlanOverrides(
    agencyId: string,
  ): Promise<AdminAgencyPlanResponse> {
    const agency = await this.findAgency(agencyId);

    agency.planOverrides = null;
    const now = new Date();
    agency.planChangedAt = now;

    await this.applyListingLimitGracePeriod(agency, now);

    const savedAgency = await this.agencyRepo.save(agency);
    return this.buildResponse(savedAgency);
  }

  async enforceAgencyLimits(agencyId: string) {
    await this.findAgency(agencyId);
    return this.agencyLimitDowngradeEnforcementService.enforceAgencyListingLimit(
      agencyId,
      { force: true },
    );
  }

  async findAgencyLimitEnforcements(
    agencyId: string,
    limitInput?: string | number,
  ): Promise<AdminLimitEnforcementAuditItem[]> {
    await this.findAgency(agencyId);

    const limit = this.normalizeAuditLimit(limitInput);
    const agencyChange = JSON.stringify([
      { field: 'agencyId', newValue: agencyId },
    ]);
    const reasonChange = JSON.stringify([
      {
        field: 'reason',
        newValue: PLAN_LIMIT_DOWNGRADE_ENFORCEMENT_REASON,
      },
    ]);
    const logs = await this.activityRepo
      .createQueryBuilder('activity')
      .where('activity.changes @> CAST(:agencyChange AS jsonb)', {
        agencyChange,
      })
      .andWhere('activity.changes @> CAST(:reasonChange AS jsonb)', {
        reasonChange,
      })
      .orderBy('activity.createdAt', 'DESC')
      .limit(limit)
      .getMany();

    return logs.map((log) => this.toLimitEnforcementAuditItem(log));
  }

  private async findAgency(agencyId: string): Promise<Agency> {
    const agency = await this.agencyRepo.findOne({ where: { id: agencyId } });

    if (!agency) {
      throw new NotFoundException('Agencja nie istnieje');
    }

    return agency;
  }

  private resolvePlanOverrides(
    dto: UpdateAgencyPlanDto,
  ): AgencyPlanOverrides | null {
    if (dto.plan !== AgencyPlan.CUSTOM) {
      if (dto.planOverrides && Object.keys(dto.planOverrides).length > 0) {
        throw new BadRequestException(
          'Nadpisania planu są dozwolone tylko dla planu custom',
        );
      }

      return null;
    }

    if (!dto.planOverrides) {
      return null;
    }

    const overrides: AgencyPlanOverrides = {};

    if (dto.planOverrides.label !== undefined) {
      const label = dto.planOverrides.label.trim();
      if (!label) {
        throw new BadRequestException('Nazwa planu custom nie może być pusta');
      }
      overrides.label = label;
    }

    if (dto.planOverrides.priceMonthlyPln !== undefined) {
      overrides.priceMonthlyPln = dto.planOverrides.priceMonthlyPln;
    }

    if (dto.planOverrides.priceYearlyPln !== undefined) {
      overrides.priceYearlyPln = dto.planOverrides.priceYearlyPln;
    }

    if (dto.planOverrides.limits !== undefined) {
      overrides.limits = { ...dto.planOverrides.limits };
    }

    if (dto.planOverrides.features !== undefined) {
      overrides.features = { ...dto.planOverrides.features };
    }

    return Object.keys(overrides).length > 0 ? overrides : null;
  }

  private async buildResponse(
    agency: Agency,
  ): Promise<AdminAgencyPlanResponse> {
    const [agencyAgentIds, entitlements] = await Promise.all([
      this.findAgencyAgentIds(agency.id),
      Promise.resolve(this.agencyPlanService.getEntitlements(agency)),
    ]);
    const usage = await this.getUsage(agencyAgentIds);

    return {
      agency: {
        id: agency.id,
        name: agency.name,
        plan: agency.plan,
        subscription: agency.subscription,
        planChangedAt: agency.planChangedAt ?? null,
      },
      planOverrides: agency.planOverrides ?? null,
      entitlements,
      usage,
      limitWarnings: this.getLimitWarnings(entitlements.limits, usage),
    };
  }

  private async findAgencyAgentIds(agencyId: string): Promise<string[]> {
    const agents = await this.agentRepo.find({
      where: { agencyId },
      select: ['id'],
    });

    return agents.map((agent) => agent.id);
  }

  private async getUsage(agencyAgentIds: string[]): Promise<AgencyUsageSummary> {
    if (agencyAgentIds.length === 0) {
      return {
        activeListings: 0,
        clients: 0,
        monthlyAppointments: 0,
        users: 0,
      };
    }

    return this.usersService.getAgencyUsageSummaryByAgentIds(agencyAgentIds);
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
      },
    );
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

  private getLimitWarnings(
    limits: AgencyPlanLimits,
    usage: AgencyUsageSummary,
  ): LimitWarning[] {
    const warnings: LimitWarning[] = [];

    this.addLimitWarning(warnings, 'activeListings', usage.activeListings, limits);
    this.addLimitWarning(warnings, 'clients', usage.clients, limits);
    this.addLimitWarning(
      warnings,
      'monthlyAppointments',
      usage.monthlyAppointments,
      limits,
    );
    this.addLimitWarning(warnings, 'users', usage.users, limits);

    return warnings;
  }

  private addLimitWarning(
    warnings: LimitWarning[],
    resource: keyof AgencyPlanLimits,
    usage: number,
    limits: AgencyPlanLimits,
  ): void {
    const limit = limits[resource];

    if (limit === null || limit === undefined || usage <= limit) {
      return;
    }

    warnings.push({
      resource,
      usage,
      limit,
      message: `Aktualne użycie ${resource} (${usage}) przekracza nowy limit (${limit})`,
    });
  }

  private normalizeAuditLimit(limitInput?: string | number): number {
    const parsed = Number(limitInput);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return DEFAULT_LIMIT_ENFORCEMENT_AUDIT_LIMIT;
    }

    return Math.min(parsed, MAX_LIMIT_ENFORCEMENT_AUDIT_LIMIT);
  }

  private toLimitEnforcementAuditItem(
    log: ActivityLog,
  ): AdminLimitEnforcementAuditItem {
    return {
      id: log.id,
      agencyId: this.getChangeNewValue<string>(log.changes, 'agencyId'),
      listingId: this.getChangeNewValue<string>(log.changes, 'listingId'),
      agentId: log.agentId,
      action: log.action,
      reason: this.getChangeNewValue<string>(log.changes, 'reason'),
      previousStatus: this.getChangeOldValue(log.changes, 'status'),
      newStatus: this.getChangeNewValue(log.changes, 'status'),
      previousPublicationStatus: this.getChangeOldValue(
        log.changes,
        'publicationStatus',
      ),
      newPublicationStatus: this.getChangeNewValue(
        log.changes,
        'publicationStatus',
      ),
      planLimit: this.getChangeNewValue(log.changes, 'planLimit'),
      usageBeforeEnforcement: this.getChangeNewValue(
        log.changes,
        'usageBeforeEnforcement',
      ),
      enforcedAt: this.getChangeNewValue<string>(log.changes, 'enforcedAt'),
      createdAt: log.createdAt,
    };
  }

  private getChangeOldValue<T = unknown>(
    changes: ActivityLogChange[],
    field: string,
  ): T | null {
    const change = changes.find((item) => item.field === field);
    return change ? (change.oldValue as T) : null;
  }

  private getChangeNewValue<T = unknown>(
    changes: ActivityLogChange[],
    field: string,
  ): T | null {
    const change = changes.find((item) => item.field === field);
    return change ? (change.newValue as T) : null;
  }
}
