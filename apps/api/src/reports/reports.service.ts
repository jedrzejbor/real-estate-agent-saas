import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Agent } from '../users/entities/agent.entity';
import {
  AppointmentStatus,
  ClientStatus,
  ListingStatus,
  UserRole,
} from '../common/enums';
import {
  ReportFiltersDto,
  ReportsGroupBy,
} from './dto/report-filters.dto';

interface ReportsUserContext {
  id: string;
  email: string;
  role: UserRole;
}

export interface ReportsAgentOption {
  id: string;
  label: string;
}

export interface ReportsOverviewSummary {
  newListings: number;
  activeListings: number;
  newClients: number;
  activeClients: number;
  appointments: number;
  completedAppointments: number;
  portfolioValue: number;
}

export interface ReportsOverviewMetricDelta {
  current: number;
  previous: number;
  change: number;
  changePct: number | null;
  direction: 'up' | 'down' | 'flat';
}

export interface ReportsOverviewComparison {
  previousPeriod: {
    dateFrom: string;
    dateTo: string;
  };
  deltas: {
    newListings: ReportsOverviewMetricDelta;
    activeListings: ReportsOverviewMetricDelta;
    newClients: ReportsOverviewMetricDelta;
    activeClients: ReportsOverviewMetricDelta;
    appointments: ReportsOverviewMetricDelta;
    completedAppointments: ReportsOverviewMetricDelta;
    portfolioValue: ReportsOverviewMetricDelta;
  };
}

export interface ReportsOverviewBucket {
  key: string;
  label: string;
  newListings: number;
  newClients: number;
  appointments: number;
  completedAppointments: number;
}

export interface ReportsOverviewResponse {
  generatedAt: string;
  filtersApplied: {
    dateFrom: string;
    dateTo: string;
    groupBy: ReportsGroupBy;
    propertyType?: string;
    transactionType?: string;
    requestedAgentId?: string;
    effectiveAgentIds: string[];
  };
  scope: {
    mode: 'self' | 'team';
    currentAgentId: string;
    canSelectAgent: boolean;
    availableAgents: ReportsAgentOption[];
  };
  summary: ReportsOverviewSummary;
  comparison: ReportsOverviewComparison;
  timeline: ReportsOverviewBucket[];
  notes: string[];
}

interface NormalizedFilters {
  dateFrom: Date;
  dateTo: Date;
  groupBy: ReportsGroupBy;
  propertyType?: string;
  transactionType?: string;
  requestedAgentId?: string;
}

interface ResolvedScope {
  mode: 'self' | 'team';
  currentAgentId: string;
  canSelectAgent: boolean;
  effectiveAgentIds: string[];
  availableAgents: ReportsAgentOption[];
}

@Injectable()
export class ReportsService {
  private static readonly MAX_RANGE_DAYS = 366;

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  async getOverview(
    user: ReportsUserContext,
    filters: ReportFiltersDto,
  ): Promise<ReportsOverviewResponse> {
    const normalizedFilters = this.normalizeFilters(filters);
    const scope = await this.resolveScope(user, normalizedFilters.requestedAgentId);
    const previousPeriod = this.getPreviousPeriod(normalizedFilters);
    const [summary, previousSummary, timeline] = await Promise.all([
      this.buildOverviewSummary(normalizedFilters, scope),
      this.buildOverviewSummary(previousPeriod, scope),
      this.buildOverviewTimeline(normalizedFilters, scope),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      filtersApplied: {
        dateFrom: normalizedFilters.dateFrom.toISOString(),
        dateTo: normalizedFilters.dateTo.toISOString(),
        groupBy: normalizedFilters.groupBy,
        propertyType: normalizedFilters.propertyType,
        transactionType: normalizedFilters.transactionType,
        requestedAgentId: normalizedFilters.requestedAgentId,
        effectiveAgentIds: scope.effectiveAgentIds,
      },
      scope: {
        mode: scope.mode,
        currentAgentId: scope.currentAgentId,
        canSelectAgent: scope.canSelectAgent,
        availableAgents: scope.availableAgents,
      },
      summary,
      comparison: {
        previousPeriod: {
          dateFrom: previousPeriod.dateFrom.toISOString(),
          dateTo: previousPeriod.dateTo.toISOString(),
        },
        deltas: {
          newListings: this.buildMetricDelta(
            summary.newListings,
            previousSummary.newListings,
          ),
          activeListings: this.buildMetricDelta(
            summary.activeListings,
            previousSummary.activeListings,
          ),
          newClients: this.buildMetricDelta(
            summary.newClients,
            previousSummary.newClients,
          ),
          activeClients: this.buildMetricDelta(
            summary.activeClients,
            previousSummary.activeClients,
          ),
          appointments: this.buildMetricDelta(
            summary.appointments,
            previousSummary.appointments,
          ),
          completedAppointments: this.buildMetricDelta(
            summary.completedAppointments,
            previousSummary.completedAppointments,
          ),
          portfolioValue: this.buildMetricDelta(
            summary.portfolioValue,
            previousSummary.portfolioValue,
          ),
        },
      },
      timeline,
      notes: [
        'Widok Przegląd zawiera już bazowe KPI, porównanie do poprzedniego okresu i bucketowane trendy.',
        'Zakres danych nadal jest wymuszany po stronie backendu na podstawie roli i dozwolonego scope agenta / zespołu.',
        'Kolejne iteracje dołożą osobne endpointy raportowe dla ofert, klientów, lejka i spotkań.',
      ],
    };
  }

  private getPreviousPeriod(filters: NormalizedFilters): NormalizedFilters {
    const periodMs = filters.dateTo.getTime() - filters.dateFrom.getTime() + 1;
    const previousDateTo = new Date(filters.dateFrom.getTime() - 1);
    const previousDateFrom = new Date(previousDateTo.getTime() - periodMs + 1);

    return {
      ...filters,
      dateFrom: previousDateFrom,
      dateTo: previousDateTo,
    };
  }

  private normalizeFilters(filters: ReportFiltersDto): NormalizedFilters {
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();
    const dateFrom = filters.dateFrom
      ? new Date(filters.dateFrom)
      : new Date(dateTo.getTime() - 29 * 24 * 60 * 60 * 1000);

    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    if (dateFrom > dateTo) {
      throw new BadRequestException('`dateFrom` nie może być późniejsze niż `dateTo`.');
    }

    const diffDays = Math.ceil(
      (dateTo.getTime() - dateFrom.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (diffDays > ReportsService.MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Zakres raportu nie może przekraczać ${ReportsService.MAX_RANGE_DAYS} dni.`,
      );
    }

    return {
      dateFrom,
      dateTo,
      groupBy: filters.groupBy ?? this.getDefaultGroupBy(diffDays),
      propertyType: filters.propertyType,
      transactionType: filters.transactionType,
      requestedAgentId: filters.agentId,
    };
  }

  private getDefaultGroupBy(diffDays: number): ReportsGroupBy {
    if (diffDays > 120) return ReportsGroupBy.MONTH;
    if (diffDays > 45) return ReportsGroupBy.WEEK;
    return ReportsGroupBy.DAY;
  }

  private async resolveScope(
    user: ReportsUserContext,
    requestedAgentId?: string,
  ): Promise<ResolvedScope> {
    const currentAgent = await this.agentRepo.findOne({ where: { userId: user.id } });
    if (!currentAgent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }

    if (user.role === UserRole.AGENT || user.role === UserRole.VIEWER) {
      if (requestedAgentId && requestedAgentId !== currentAgent.id) {
        throw new ForbiddenException('Nie możesz filtrować raportów innych agentów.');
      }

      return {
        mode: 'self',
        currentAgentId: currentAgent.id,
        canSelectAgent: false,
        effectiveAgentIds: [currentAgent.id],
        availableAgents: [this.toAgentOption(currentAgent)],
      };
    }

    if (!currentAgent.agencyId) {
      if (requestedAgentId && requestedAgentId !== currentAgent.id) {
        throw new ForbiddenException('Brak dostępu do danych poza własnym profilem.');
      }

      return {
        mode: 'self',
        currentAgentId: currentAgent.id,
        canSelectAgent: false,
        effectiveAgentIds: [currentAgent.id],
        availableAgents: [this.toAgentOption(currentAgent)],
      };
    }

    const agencyAgents = await this.agentRepo.find({
      where: { agencyId: currentAgent.agencyId },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });

    const allowedAgentIds = new Set(agencyAgents.map((agent) => agent.id));
    if (requestedAgentId && !allowedAgentIds.has(requestedAgentId)) {
      throw new ForbiddenException('Wybrany agent nie należy do Twojego zakresu danych.');
    }

    return {
      mode: requestedAgentId ? 'self' : 'team',
      currentAgentId: currentAgent.id,
      canSelectAgent: agencyAgents.length > 1,
      effectiveAgentIds: requestedAgentId
        ? [requestedAgentId]
        : agencyAgents.map((agent) => agent.id),
      availableAgents: agencyAgents.map((agent) => this.toAgentOption(agent)),
    };
  }

  private async buildOverviewSummary(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ReportsOverviewSummary> {
    const listingBase = this.createListingBaseQuery(filters, scope);
    const clientBase = this.createClientBaseQuery(scope);
    const appointmentBase = this.createAppointmentBaseQuery(filters, scope);

    const [
      newListings,
      activeListings,
      newClients,
      activeClients,
      appointments,
      completedAppointments,
      portfolioValueRaw,
    ] = await Promise.all([
      listingBase
        .clone()
        .andWhere('listing.createdAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .getCount(),
      listingBase
        .clone()
        .andWhere('listing.status = :status', { status: ListingStatus.ACTIVE })
        .andWhere('listing.createdAt <= :dateTo', { dateTo: filters.dateTo })
        .getCount(),
      clientBase
        .clone()
        .andWhere('client.createdAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .getCount(),
      clientBase
        .clone()
        .andWhere('client.status IN (:...statuses)', {
          statuses: [ClientStatus.ACTIVE, ClientStatus.NEGOTIATING],
        })
        .andWhere('client.createdAt <= :dateTo', { dateTo: filters.dateTo })
        .getCount(),
      appointmentBase
        .clone()
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .getCount(),
      appointmentBase
        .clone()
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('appointment.status = :status', {
          status: AppointmentStatus.COMPLETED,
        })
        .getCount(),
      listingBase
        .clone()
        .select('COALESCE(SUM(listing.price), 0)::numeric', 'portfolioValue')
        .andWhere('listing.status = :status', { status: ListingStatus.ACTIVE })
        .andWhere('listing.createdAt <= :dateTo', { dateTo: filters.dateTo })
        .getRawOne<{ portfolioValue: string }>(),
    ]);

    return {
      newListings,
      activeListings,
      newClients,
      activeClients,
      appointments,
      completedAppointments,
      portfolioValue: Number(portfolioValueRaw?.portfolioValue ?? 0),
    };
  }

  private async buildOverviewTimeline(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ReportsOverviewBucket[]> {
    const listingBase = this.createListingBaseQuery(filters, scope);
    const clientBase = this.createClientBaseQuery(scope);
    const appointmentBase = this.createAppointmentBaseQuery(filters, scope);

    const bucketFormat = 'YYYY-MM-DD';
    const listingBucketExpr = this.getBucketExpression(
      'listing.createdAt',
      filters.groupBy,
    );
    const clientBucketExpr = this.getBucketExpression(
      'client.createdAt',
      filters.groupBy,
    );
    const appointmentBucketExpr = this.getBucketExpression(
      'appointment.startTime',
      filters.groupBy,
    );

    const [listingRows, clientRows, appointmentRows] = await Promise.all([
      listingBase
        .clone()
        .select(`TO_CHAR(${listingBucketExpr}, '${bucketFormat}')`, 'bucket')
        .addSelect('COUNT(*)::int', 'count')
        .andWhere('listing.createdAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .groupBy(`TO_CHAR(${listingBucketExpr}, '${bucketFormat}')`)
        .orderBy(`MIN(${listingBucketExpr})`, 'ASC')
        .getRawMany<{ bucket: string; count: string }>(),
      clientBase
        .clone()
        .select(`TO_CHAR(${clientBucketExpr}, '${bucketFormat}')`, 'bucket')
        .addSelect('COUNT(*)::int', 'count')
        .andWhere('client.createdAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .groupBy(`TO_CHAR(${clientBucketExpr}, '${bucketFormat}')`)
        .orderBy(`MIN(${clientBucketExpr})`, 'ASC')
        .getRawMany<{ bucket: string; count: string }>(),
      appointmentBase
        .clone()
        .select(`TO_CHAR(${appointmentBucketExpr}, '${bucketFormat}')`, 'bucket')
        .addSelect('COUNT(*)::int', 'appointments')
        .addSelect(
          `COUNT(*) FILTER (WHERE appointment.status = :completedStatus)::int`,
          'completedAppointments',
        )
        .setParameter('completedStatus', AppointmentStatus.COMPLETED)
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .groupBy(`TO_CHAR(${appointmentBucketExpr}, '${bucketFormat}')`)
        .orderBy(`MIN(${appointmentBucketExpr})`, 'ASC')
        .getRawMany<{
          bucket: string;
          appointments: string;
          completedAppointments: string;
        }>(),
    ]);

    const listingMap = new Map(
      listingRows.map((row) => [row.bucket, Number(row.count)]),
    );
    const clientMap = new Map(
      clientRows.map((row) => [row.bucket, Number(row.count)]),
    );
    const appointmentMap = new Map(
      appointmentRows.map((row) => [
        row.bucket,
        {
          appointments: Number(row.appointments),
          completedAppointments: Number(row.completedAppointments),
        },
      ]),
    );

    return this.generateBucketKeys(
      filters.dateFrom,
      filters.dateTo,
      filters.groupBy,
    ).map((bucketKey) => {
      const appointments = appointmentMap.get(bucketKey);

      return {
        key: bucketKey,
        label: this.formatBucketLabel(bucketKey, filters.groupBy),
        newListings: listingMap.get(bucketKey) ?? 0,
        newClients: clientMap.get(bucketKey) ?? 0,
        appointments: appointments?.appointments ?? 0,
        completedAppointments: appointments?.completedAppointments ?? 0,
      };
    });
  }

  private buildMetricDelta(
    current: number,
    previous: number,
  ): ReportsOverviewMetricDelta {
    const change = current - previous;
    const direction =
      change === 0 ? 'flat' : change > 0 ? 'up' : 'down';

    if (previous === 0) {
      return {
        current,
        previous,
        change,
        changePct: current === 0 ? 0 : null,
        direction,
      };
    }

    return {
      current,
      previous,
      change,
      changePct: Math.round((change / previous) * 100),
      direction,
    };
  }

  private createListingBaseQuery(
    filters: Pick<NormalizedFilters, 'propertyType' | 'transactionType'>,
    scope: ResolvedScope,
  ): SelectQueryBuilder<Listing> {
    const query = this.listingRepo
      .createQueryBuilder('listing')
      .where('listing.agentId IN (:...agentIds)', {
        agentIds: scope.effectiveAgentIds,
      });

    if (filters.propertyType) {
      query.andWhere('listing.propertyType = :propertyType', {
        propertyType: filters.propertyType,
      });
    }

    if (filters.transactionType) {
      query.andWhere('listing.transactionType = :transactionType', {
        transactionType: filters.transactionType,
      });
    }

    return query;
  }

  private createClientBaseQuery(
    scope: ResolvedScope,
  ): SelectQueryBuilder<Client> {
    return this.clientRepo
      .createQueryBuilder('client')
      .where('client.agentId IN (:...agentIds)', {
        agentIds: scope.effectiveAgentIds,
      });
  }

  private createAppointmentBaseQuery(
    filters: Pick<NormalizedFilters, 'propertyType' | 'transactionType'>,
    scope: ResolvedScope,
  ): SelectQueryBuilder<Appointment> {
    const query = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoin('appointment.listing', 'listing')
      .where('appointment.agentId IN (:...agentIds)', {
        agentIds: scope.effectiveAgentIds,
      });

    if (filters.propertyType) {
      query.andWhere(
        '(appointment.listingId IS NULL OR listing.propertyType = :propertyType)',
        {
          propertyType: filters.propertyType,
        },
      );
    }

    if (filters.transactionType) {
      query.andWhere(
        '(appointment.listingId IS NULL OR listing.transactionType = :transactionType)',
        {
          transactionType: filters.transactionType,
        },
      );
    }

    return query;
  }

  private getBucketExpression(
    column: string,
    groupBy: ReportsGroupBy,
  ): string {
    switch (groupBy) {
      case ReportsGroupBy.WEEK:
        return `date_trunc('week', ${column})`;
      case ReportsGroupBy.MONTH:
        return `date_trunc('month', ${column})`;
      case ReportsGroupBy.DAY:
      default:
        return `date_trunc('day', ${column})`;
    }
  }

  private generateBucketKeys(
    dateFrom: Date,
    dateTo: Date,
    groupBy: ReportsGroupBy,
  ): string[] {
    const cursor = this.alignDateToBucket(dateFrom, groupBy);
    const end = this.alignDateToBucket(dateTo, groupBy);
    const bucketKeys: string[] = [];

    while (cursor <= end) {
      bucketKeys.push(this.toBucketKey(cursor));
      this.incrementBucket(cursor, groupBy);
    }

    return bucketKeys;
  }

  private alignDateToBucket(date: Date, groupBy: ReportsGroupBy): Date {
    const aligned = new Date(date);
    aligned.setHours(0, 0, 0, 0);

    if (groupBy === ReportsGroupBy.WEEK) {
      const day = aligned.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      aligned.setDate(aligned.getDate() + diff);
    }

    if (groupBy === ReportsGroupBy.MONTH) {
      aligned.setDate(1);
    }

    return aligned;
  }

  private incrementBucket(date: Date, groupBy: ReportsGroupBy): void {
    if (groupBy === ReportsGroupBy.DAY) {
      date.setDate(date.getDate() + 1);
      return;
    }

    if (groupBy === ReportsGroupBy.WEEK) {
      date.setDate(date.getDate() + 7);
      return;
    }

    date.setMonth(date.getMonth() + 1);
  }

  private toBucketKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatBucketLabel(
    bucketKey: string,
    groupBy: ReportsGroupBy,
  ): string {
    const date = new Date(`${bucketKey}T00:00:00`);

    if (groupBy === ReportsGroupBy.MONTH) {
      return date.toLocaleDateString('pl-PL', {
        month: 'short',
        year: 'numeric',
      });
    }

    if (groupBy === ReportsGroupBy.WEEK) {
      return `Tydz. ${date.toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
      })}`;
    }

    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
    });
  }

  private toAgentOption(agent: Agent): ReportsAgentOption {
    const label = `${agent.firstName ?? ''} ${agent.lastName ?? ''}`.trim();

    return {
      id: agent.id,
      label: label || 'Agent',
    };
  }
}
