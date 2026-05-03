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
import { AnalyticsEvent } from '../analytics/entities/analytics-event.entity';
import { UsersService } from '../users';
import { AgencyEntitlements } from '../users/agency-plan.service';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import {
  AppointmentType,
  AppointmentStatus,
  ClientSource,
  ClientStatus,
  ListingStatus,
  UserRole,
} from '../common/enums';
import { ReportFiltersDto, ReportsGroupBy } from './dto/report-filters.dto';

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

export interface ListingsBreakdownItem {
  key: string;
  count: number;
  percentage: number;
  activeCount?: number;
  closedCount?: number;
  totalValue?: number;
}

export interface ListingsReportSummary {
  totalListings: number;
  newListings: number;
  activatedListings: number;
  closedListings: number;
  withdrawnListings: number;
  activeListingsEnd: number;
  averageLifecycleDays: number | null;
}

export interface ListingsReportResponse {
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
  summary: ListingsReportSummary;
  breakdowns: {
    byStatus: ListingsBreakdownItem[];
    byPropertyType: ListingsBreakdownItem[];
    byTransactionType: ListingsBreakdownItem[];
  };
  notes: string[];
}

export interface ClientsBreakdownItem {
  key: string;
  count: number;
  percentage: number;
  wonCount?: number;
  lostCount?: number;
}

export interface ClientsReportSummary {
  totalClients: number;
  newClients: number;
  activePipeline: number;
  negotiatingClients: number;
  wonClients: number;
  lostClients: number;
  conversionRate: number;
}

export interface ClientsReportResponse {
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
  summary: ClientsReportSummary;
  breakdowns: {
    byStatus: ClientsBreakdownItem[];
    bySource: ClientsBreakdownItem[];
  };
  notes: string[];
}

export interface AppointmentsBreakdownItem {
  key: string;
  count: number;
  percentage: number;
  linkedToClient?: number;
  linkedToListing?: number;
}

export interface AppointmentsReportSummary {
  totalAppointments: number;
  completedAppointments: number;
  scheduledAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  linkedToClient: number;
  linkedToListing: number;
  completionRate: number;
}

export interface AppointmentsReportResponse {
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
  summary: AppointmentsReportSummary;
  breakdowns: {
    byStatus: AppointmentsBreakdownItem[];
    byType: AppointmentsBreakdownItem[];
  };
  notes: string[];
}

export type FreemiumMetricKey =
  | 'listing_created'
  | 'listing_published'
  | 'public_listing_viewed'
  | 'public_listing_link_copied'
  | 'public_listing_share_clicked'
  | 'public_lead_submitted'
  | 'public_listing_claim_started'
  | 'public_listing_claim_completed'
  | 'limit_warning_shown'
  | 'limit_reached'
  | 'upgrade_cta_clicked';

export interface FreemiumMetricsSummary {
  firstListings: number;
  publishedListings: number;
  publicViews: number;
  publicShares: number;
  publicLeads: number;
  claimStarts: number;
  claimCompletions: number;
  limitWarnings: number;
  limitsReached: number;
  upgradeClicks: number;
  publishRate: number;
  leadCaptureRate: number;
  claimCompletionRate: number;
}

export type FreemiumPostLaunchMetricStatus = 'healthy' | 'watch' | 'critical';

export interface FreemiumPostLaunchHealthItem {
  key:
    | 'activation'
    | 'publishing'
    | 'lead_capture'
    | 'claim_flow'
    | 'limit_friction'
    | 'upgrade_intent';
  label: string;
  status: FreemiumPostLaunchMetricStatus;
  value: string;
  target: string;
  action: string;
}

export interface FreemiumMetricCount {
  key: FreemiumMetricKey;
  label: string;
  count: number;
}

export interface FreemiumMetricsBucket {
  key: string;
  label: string;
  listingCreated: number;
  listingPublished: number;
  publicViews: number;
  publicLeads: number;
  upgradeClicks: number;
}

export interface FreemiumUpgradeIntentItem {
  key: string;
  label: string;
  count: number;
}

export interface FreemiumMetricsReportResponse {
  generatedAt: string;
  filtersApplied: {
    dateFrom: string;
    dateTo: string;
    groupBy: ReportsGroupBy;
    requestedAgentId?: string;
    effectiveAgentIds: string[];
  };
  summary: FreemiumMetricsSummary;
  events: FreemiumMetricCount[];
  timeline: FreemiumMetricsBucket[];
  upgradeIntent: {
    byUpsell: FreemiumUpgradeIntentItem[];
    bySource: FreemiumUpgradeIntentItem[];
  };
  postLaunchHealth: FreemiumPostLaunchHealthItem[];
  notes: string[];
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
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
    private readonly usersService: UsersService,
  ) {}

  async getOverview(
    user: ReportsUserContext,
    filters: ReportFiltersDto,
  ): Promise<ReportsOverviewResponse> {
    const normalizedFilters = this.normalizeFilters(filters);
    const scope = await this.resolveScope(
      user,
      normalizedFilters.requestedAgentId,
    );
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

  async getListingsReport(
    user: ReportsUserContext,
    filters: ReportFiltersDto,
  ): Promise<ListingsReportResponse> {
    const normalizedFilters = this.normalizeFilters(filters);
    const scope = await this.resolveScope(
      user,
      normalizedFilters.requestedAgentId,
    );

    const [summary, byStatus, byPropertyType, byTransactionType] =
      await Promise.all([
        this.buildListingsSummary(normalizedFilters, scope),
        this.buildListingsStatusBreakdown(normalizedFilters, scope),
        this.buildListingsPropertyTypeBreakdown(normalizedFilters, scope),
        this.buildListingsTransactionTypeBreakdown(normalizedFilters, scope),
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
      summary,
      breakdowns: {
        byStatus,
        byPropertyType,
        byTransactionType,
      },
      notes: [
        'Raport Oferty bazuje na aktualnym stanie rekordów i danych dostępnych w modelu Listing.',
        'Do dokładnego raportowania przejść statusów w czasie potrzebna będzie pełniejsza historia zdarzeń lub snapshoty statusów.',
        'Na tym etapie aktywacje liczone są na podstawie pola `publishedAt`, a zamknięcia / wycofania na podstawie bieżącego statusu i `updatedAt`.',
      ],
    };
  }

  async getClientsReport(
    user: ReportsUserContext,
    filters: ReportFiltersDto,
  ): Promise<ClientsReportResponse> {
    const normalizedFilters = this.normalizeFilters(filters);
    const scope = await this.resolveScope(
      user,
      normalizedFilters.requestedAgentId,
    );

    const [summary, byStatus, bySource] = await Promise.all([
      this.buildClientsSummary(normalizedFilters, scope),
      this.buildClientsStatusBreakdown(normalizedFilters, scope),
      this.buildClientsSourceBreakdown(normalizedFilters, scope),
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
      summary,
      breakdowns: {
        byStatus,
        bySource,
      },
      notes: [
        'Raport Klienci bazuje na aktualnym stanie rekordów klienta i źródle leada zapisanym w modelu Client.',
        'Filtr typu nieruchomości działa na podstawie `ClientPreference.propertyType`, jeśli taka preferencja jest uzupełniona.',
        'Filtr typu transakcji nie wpływa jeszcze na raport klientów, ponieważ obecny model klienta nie przechowuje preferencji transakcji.',
      ],
    };
  }

  async getAppointmentsReport(
    user: ReportsUserContext,
    filters: ReportFiltersDto,
  ): Promise<AppointmentsReportResponse> {
    await this.assertFeatureAccess(
      user,
      'reportsAppointmentsBasic',
      'Raport spotkań jest dostępny w planie płatnym.',
    );

    const normalizedFilters = this.normalizeFilters(filters);
    const scope = await this.resolveScope(
      user,
      normalizedFilters.requestedAgentId,
    );

    const [summary, byStatus, byType] = await Promise.all([
      this.buildAppointmentsSummary(normalizedFilters, scope),
      this.buildAppointmentsStatusBreakdown(normalizedFilters, scope),
      this.buildAppointmentsTypeBreakdown(normalizedFilters, scope),
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
      summary,
      breakdowns: {
        byStatus,
        byType,
      },
      notes: [
        'Raport Spotkania bazuje na danych z modelu Appointment oraz opcjonalnych powiązaniach do klienta i oferty.',
        'Filtry `propertyType` i `transactionType` są stosowane tylko do spotkań powiązanych z ofertą, aby wynik był semantycznie poprawny.',
        'Completion rate liczony jest jako udział spotkań zakończonych w całkowitej liczbie spotkań w wybranym okresie.',
      ],
    };
  }

  async getFreemiumMetricsReport(
    user: ReportsUserContext,
    filters: ReportFiltersDto,
  ): Promise<FreemiumMetricsReportResponse> {
    const normalizedFilters = this.normalizeFilters(filters);
    const scope = await this.resolveScope(
      user,
      normalizedFilters.requestedAgentId,
    );
    const [events, timeline, upgradeIntent] = await Promise.all([
      this.buildFreemiumEventCounts(normalizedFilters, scope),
      this.buildFreemiumTimeline(normalizedFilters, scope),
      this.buildFreemiumUpgradeIntent(normalizedFilters, scope),
    ]);
    const eventMap = new Map(events.map((event) => [event.key, event.count]));
    const publicShares =
      (eventMap.get('public_listing_link_copied') ?? 0) +
      (eventMap.get('public_listing_share_clicked') ?? 0);
    const firstListings = eventMap.get('listing_created') ?? 0;
    const publishedListings = eventMap.get('listing_published') ?? 0;
    const publicViews = eventMap.get('public_listing_viewed') ?? 0;
    const publicLeads = eventMap.get('public_lead_submitted') ?? 0;
    const claimStarts = eventMap.get('public_listing_claim_started') ?? 0;
    const claimCompletions =
      eventMap.get('public_listing_claim_completed') ?? 0;
    const summary: FreemiumMetricsSummary = {
      firstListings,
      publishedListings,
      publicViews,
      publicShares,
      publicLeads,
      claimStarts,
      claimCompletions,
      limitWarnings: eventMap.get('limit_warning_shown') ?? 0,
      limitsReached: eventMap.get('limit_reached') ?? 0,
      upgradeClicks: eventMap.get('upgrade_cta_clicked') ?? 0,
      publishRate: this.percentage(publishedListings, firstListings),
      leadCaptureRate: this.percentage(publicLeads, publicViews),
      claimCompletionRate: this.percentage(claimCompletions, claimStarts),
    };

    return {
      generatedAt: new Date().toISOString(),
      filtersApplied: {
        dateFrom: normalizedFilters.dateFrom.toISOString(),
        dateTo: normalizedFilters.dateTo.toISOString(),
        groupBy: normalizedFilters.groupBy,
        requestedAgentId: normalizedFilters.requestedAgentId,
        effectiveAgentIds: scope.effectiveAgentIds,
      },
      summary,
      events,
      timeline,
      upgradeIntent,
      postLaunchHealth: this.buildFreemiumPostLaunchHealth(summary),
      notes: [
        'Raport Freemium agreguje wyłącznie eventy zapisane w `analytics_events` dla dostępnego zakresu agentów.',
        'Współczynniki są liczone jako proste relacje eventów w wybranym okresie, dlatego pokazują trend produktu, a nie pełną kohortową analitykę atrybucji.',
        'Upgrade intent bazuje na kliknięciach `upgrade_cta_clicked` i właściwościach `upsellId` oraz `source` przesyłanych z kart upsell.',
        'Post-launch health używa progów operacyjnych MVP. Ma wskazywać, gdzie zespół powinien reagować po starcie, a nie zastępować analizę kohortową.',
      ],
    };
  }

  private buildFreemiumPostLaunchHealth(
    summary: FreemiumMetricsSummary,
  ): FreemiumPostLaunchHealthItem[] {
    return [
      {
        key: 'activation',
        label: 'Aktywacja',
        status: this.rateStatus(summary.firstListings, 1, 3),
        value: `${summary.firstListings} pierwszych ofert`,
        target: 'min. 3 pierwsze oferty w okresie',
        action:
          summary.firstListings === 0
            ? 'Sprawdź onboarding i CTA tworzenia pierwszej oferty.'
            : 'Monitoruj, czy nowe konta dochodzą do pierwszej oferty.',
      },
      {
        key: 'publishing',
        label: 'Publikacja ofert',
        status: this.rateStatus(summary.publishRate, 30, 60),
        value: `${summary.publishRate}%`,
        target: 'cel MVP >= 60%',
        action:
          summary.publishRate < 30
            ? 'Przejrzyj walidację publikacji, zdjęcia i copy panelu publikacji.'
            : 'Porównaj jakość ofert nieopublikowanych z wymaganiami publikacji.',
      },
      {
        key: 'lead_capture',
        label: 'Lead capture',
        status:
          summary.publicViews === 0
            ? 'watch'
            : this.rateStatus(summary.leadCaptureRate, 1, 3),
        value: `${summary.leadCaptureRate}%`,
        target: 'cel MVP >= 3%',
        action:
          summary.publicViews === 0
            ? 'Najpierw zwiększ liczbę publicznych odsłon ofert.'
            : 'Sprawdź widoczność formularza, zgody i źródła ruchu.',
      },
      {
        key: 'claim_flow',
        label: 'Claim flow',
        status:
          summary.claimStarts === 0
            ? 'watch'
            : this.rateStatus(summary.claimCompletionRate, 40, 70),
        value: `${summary.claimCompletionRate}%`,
        target: 'cel MVP >= 70%',
        action:
          summary.claimStarts === 0
            ? 'Brak próby claim w okresie. Wykonaj test kontrolny z publicznego wizardu.'
            : 'Sprawdź email verification, auth redirect i ekran claim listing.',
      },
      {
        key: 'limit_friction',
        label: 'Limit friction',
        status:
          summary.limitsReached > 0 && summary.upgradeClicks === 0
            ? 'critical'
            : summary.limitsReached > summary.upgradeClicks * 3
              ? 'watch'
              : 'healthy',
        value: `${summary.limitsReached} limit / ${summary.upgradeClicks} upgrade`,
        target: 'limit reached powinien prowadzić do upgrade intent',
        action:
          summary.limitsReached > 0 && summary.upgradeClicks === 0
            ? 'Sprawdź CTA upgrade przy limitach i komunikaty błędu.'
            : 'Monitoruj, czy ograniczenia free są zrozumiałe dla użytkowników.',
      },
      {
        key: 'upgrade_intent',
        label: 'Upgrade intent',
        status:
          summary.upgradeClicks === 0
            ? 'watch'
            : summary.upgradeClicks >= 3
              ? 'healthy'
              : 'watch',
        value: `${summary.upgradeClicks} kliknięć`,
        target: 'pierwsze kliknięcia upgrade w okresie',
        action:
          summary.upgradeClicks === 0
            ? 'Sprawdź widoczność upselli i destination `/dashboard/upgrade`.'
            : 'Przejrzyj najskuteczniejsze źródła intencji upgrade.',
      },
    ];
  }

  private rateStatus(
    value: number,
    watchThreshold: number,
    healthyThreshold: number,
  ): FreemiumPostLaunchMetricStatus {
    if (value >= healthyThreshold) {
      return 'healthy';
    }

    return value >= watchThreshold ? 'watch' : 'critical';
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

  private async assertFeatureAccess(
    user: ReportsUserContext,
    feature: keyof AgencyEntitlements['features'],
    message: string,
  ): Promise<void> {
    const access = await this.usersService.getAgencyAccessContext(user.id);

    if (access.entitlements.features[feature]) {
      return;
    }

    throw new FeatureAccessDeniedException({
      feature,
      planCode: access.entitlements.plan.code,
      message,
    });
  }

  private normalizeFilters(filters: ReportFiltersDto): NormalizedFilters {
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date();
    const dateFrom = filters.dateFrom
      ? new Date(filters.dateFrom)
      : new Date(dateTo.getTime() - 29 * 24 * 60 * 60 * 1000);

    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    if (dateFrom > dateTo) {
      throw new BadRequestException(
        '`dateFrom` nie może być późniejsze niż `dateTo`.',
      );
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
    const currentAgent = await this.agentRepo.findOne({
      where: { userId: user.id },
    });
    if (!currentAgent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }

    if (user.role === UserRole.AGENT || user.role === UserRole.VIEWER) {
      if (requestedAgentId && requestedAgentId !== currentAgent.id) {
        throw new ForbiddenException(
          'Nie możesz filtrować raportów innych agentów.',
        );
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
        throw new ForbiddenException(
          'Brak dostępu do danych poza własnym profilem.',
        );
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
      throw new ForbiddenException(
        'Wybrany agent nie należy do Twojego zakresu danych.',
      );
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

  private async buildListingsSummary(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ListingsReportSummary> {
    const listingBase = this.createListingBaseQuery(filters, scope);

    const [
      totalListings,
      newListings,
      activatedListings,
      closedListings,
      withdrawnListings,
      activeListingsEnd,
      lifecycleRaw,
    ] = await Promise.all([
      listingBase
        .clone()
        .andWhere('listing.createdAt <= :dateTo', { dateTo: filters.dateTo })
        .getCount(),
      listingBase
        .clone()
        .andWhere('listing.createdAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .getCount(),
      listingBase
        .clone()
        .andWhere('listing.publishedAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .getCount(),
      listingBase
        .clone()
        .andWhere('listing.updatedAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('listing.status IN (:...statuses)', {
          statuses: [ListingStatus.SOLD, ListingStatus.RENTED],
        })
        .getCount(),
      listingBase
        .clone()
        .andWhere('listing.updatedAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('listing.status IN (:...statuses)', {
          statuses: [ListingStatus.WITHDRAWN, ListingStatus.ARCHIVED],
        })
        .getCount(),
      listingBase
        .clone()
        .andWhere('listing.createdAt <= :dateTo', { dateTo: filters.dateTo })
        .andWhere('listing.status = :status', { status: ListingStatus.ACTIVE })
        .getCount(),
      listingBase
        .clone()
        .select(
          'AVG(EXTRACT(EPOCH FROM (listing.updatedAt - listing.createdAt)) / 86400)::numeric',
          'avgDays',
        )
        .andWhere('listing.updatedAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('listing.status IN (:...statuses)', {
          statuses: [
            ListingStatus.SOLD,
            ListingStatus.RENTED,
            ListingStatus.WITHDRAWN,
            ListingStatus.ARCHIVED,
          ],
        })
        .getRawOne<{ avgDays: string | null }>(),
    ]);

    return {
      totalListings,
      newListings,
      activatedListings,
      closedListings,
      withdrawnListings,
      activeListingsEnd,
      averageLifecycleDays:
        lifecycleRaw?.avgDays !== null && lifecycleRaw?.avgDays !== undefined
          ? Math.round(Number(lifecycleRaw.avgDays))
          : null,
    };
  }

  private async buildClientsSummary(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ClientsReportSummary> {
    const clientBase = this.createClientReportBaseQuery(filters, scope);

    const [
      totalClients,
      newClients,
      activePipeline,
      negotiatingClients,
      wonClients,
      lostClients,
    ] = await Promise.all([
      clientBase
        .clone()
        .andWhere('client.createdAt <= :dateTo', { dateTo: filters.dateTo })
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
        .andWhere('client.createdAt <= :dateTo', { dateTo: filters.dateTo })
        .andWhere('client.status IN (:...statuses)', {
          statuses: [
            ClientStatus.NEW,
            ClientStatus.CONTACTED,
            ClientStatus.QUALIFIED,
            ClientStatus.ACTIVE,
            ClientStatus.NEGOTIATING,
          ],
        })
        .getCount(),
      clientBase
        .clone()
        .andWhere('client.createdAt <= :dateTo', { dateTo: filters.dateTo })
        .andWhere('client.status = :status', {
          status: ClientStatus.NEGOTIATING,
        })
        .getCount(),
      clientBase
        .clone()
        .andWhere('client.updatedAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('client.status = :status', {
          status: ClientStatus.CLOSED_WON,
        })
        .getCount(),
      clientBase
        .clone()
        .andWhere('client.updatedAt BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('client.status = :status', {
          status: ClientStatus.CLOSED_LOST,
        })
        .getCount(),
    ]);

    const closedTotal = wonClients + lostClients;

    return {
      totalClients,
      newClients,
      activePipeline,
      negotiatingClients,
      wonClients,
      lostClients,
      conversionRate:
        closedTotal > 0 ? Math.round((wonClients / closedTotal) * 100) : 0,
    };
  }

  private async buildClientsStatusBreakdown(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ClientsBreakdownItem[]> {
    const clientBase = this.createClientReportBaseQuery(filters, scope);

    const rows = await clientBase
      .clone()
      .select('client.status', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .andWhere('client.createdAt <= :dateTo', { dateTo: filters.dateTo })
      .groupBy('client.status')
      .getRawMany<{ key: string; count: string }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    return rows
      .map((row) => ({
        key: row.key,
        count: Number(row.count),
        percentage:
          total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async buildAppointmentsSummary(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<AppointmentsReportSummary> {
    const appointmentBase = this.createAppointmentReportBaseQuery(
      filters,
      scope,
    );

    const [
      totalAppointments,
      completedAppointments,
      scheduledAppointments,
      cancelledAppointments,
      noShowAppointments,
      linkedToClient,
      linkedToListing,
    ] = await Promise.all([
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
      appointmentBase
        .clone()
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('appointment.status = :status', {
          status: AppointmentStatus.SCHEDULED,
        })
        .getCount(),
      appointmentBase
        .clone()
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('appointment.status = :status', {
          status: AppointmentStatus.CANCELLED,
        })
        .getCount(),
      appointmentBase
        .clone()
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('appointment.status = :status', {
          status: AppointmentStatus.NO_SHOW,
        })
        .getCount(),
      appointmentBase
        .clone()
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('appointment.clientId IS NOT NULL')
        .getCount(),
      appointmentBase
        .clone()
        .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        .andWhere('appointment.listingId IS NOT NULL')
        .getCount(),
    ]);

    return {
      totalAppointments,
      completedAppointments,
      scheduledAppointments,
      cancelledAppointments,
      noShowAppointments,
      linkedToClient,
      linkedToListing,
      completionRate:
        totalAppointments > 0
          ? Math.round((completedAppointments / totalAppointments) * 100)
          : 0,
    };
  }

  private async buildAppointmentsStatusBreakdown(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<AppointmentsBreakdownItem[]> {
    const appointmentBase = this.createAppointmentReportBaseQuery(
      filters,
      scope,
    );

    const rows = await appointmentBase
      .clone()
      .select('appointment.status', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect(
        `COUNT(*) FILTER (WHERE appointment.clientId IS NOT NULL)::int`,
        'linkedToClient',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE appointment.listingId IS NOT NULL)::int`,
        'linkedToListing',
      )
      .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      })
      .groupBy('appointment.status')
      .getRawMany<{
        key: string;
        count: string;
        linkedToClient: string;
        linkedToListing: string;
      }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    return rows
      .map((row) => ({
        key: row.key,
        count: Number(row.count),
        percentage:
          total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
        linkedToClient: Number(row.linkedToClient),
        linkedToListing: Number(row.linkedToListing),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async buildAppointmentsTypeBreakdown(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<AppointmentsBreakdownItem[]> {
    const appointmentBase = this.createAppointmentReportBaseQuery(
      filters,
      scope,
    );

    const rows = await appointmentBase
      .clone()
      .select('appointment.type', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect(
        `COUNT(*) FILTER (WHERE appointment.clientId IS NOT NULL)::int`,
        'linkedToClient',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE appointment.listingId IS NOT NULL)::int`,
        'linkedToListing',
      )
      .andWhere('appointment.startTime BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      })
      .groupBy('appointment.type')
      .getRawMany<{
        key: string;
        count: string;
        linkedToClient: string;
        linkedToListing: string;
      }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    return rows
      .map((row) => ({
        key: row.key,
        count: Number(row.count),
        percentage:
          total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
        linkedToClient: Number(row.linkedToClient),
        linkedToListing: Number(row.linkedToListing),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async buildFreemiumEventCounts(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<FreemiumMetricCount[]> {
    const rows = await this.createFreemiumAnalyticsBaseQuery(filters, scope)
      .select('event.name', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('event.name')
      .getRawMany<{ key: FreemiumMetricKey; count: string }>();
    const countMap = new Map(rows.map((row) => [row.key, Number(row.count)]));

    return FREEMIUM_METRICS.map((metric) => ({
      key: metric.key,
      label: metric.label,
      count: countMap.get(metric.key) ?? 0,
    }));
  }

  private async buildFreemiumTimeline(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<FreemiumMetricsBucket[]> {
    const bucketFormat = 'YYYY-MM-DD';
    const bucketExpr = this.getBucketExpression(
      'event.createdAt',
      filters.groupBy,
    );
    const rows = await this.createFreemiumAnalyticsBaseQuery(filters, scope)
      .select(`TO_CHAR(${bucketExpr}, '${bucketFormat}')`, 'bucket')
      .addSelect(
        `COUNT(*) FILTER (WHERE event.name = 'listing_created')::int`,
        'listingCreated',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event.name = 'listing_published')::int`,
        'listingPublished',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event.name = 'public_listing_viewed')::int`,
        'publicViews',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event.name = 'public_lead_submitted')::int`,
        'publicLeads',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event.name = 'upgrade_cta_clicked')::int`,
        'upgradeClicks',
      )
      .groupBy(`TO_CHAR(${bucketExpr}, '${bucketFormat}')`)
      .orderBy(`MIN(${bucketExpr})`, 'ASC')
      .getRawMany<{
        bucket: string;
        listingCreated: string;
        listingPublished: string;
        publicViews: string;
        publicLeads: string;
        upgradeClicks: string;
      }>();
    const rowMap = new Map(rows.map((row) => [row.bucket, row]));

    return this.generateBucketKeys(
      filters.dateFrom,
      filters.dateTo,
      filters.groupBy,
    ).map((bucketKey) => {
      const row = rowMap.get(bucketKey);

      return {
        key: bucketKey,
        label: this.formatBucketLabel(bucketKey, filters.groupBy),
        listingCreated: Number(row?.listingCreated ?? 0),
        listingPublished: Number(row?.listingPublished ?? 0),
        publicViews: Number(row?.publicViews ?? 0),
        publicLeads: Number(row?.publicLeads ?? 0),
        upgradeClicks: Number(row?.upgradeClicks ?? 0),
      };
    });
  }

  private async buildFreemiumUpgradeIntent(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<FreemiumMetricsReportResponse['upgradeIntent']> {
    const [byUpsellRows, bySourceRows] = await Promise.all([
      this.createFreemiumAnalyticsBaseQuery(filters, scope)
        .andWhere('event.name = :eventName', {
          eventName: 'upgrade_cta_clicked',
        })
        .select("COALESCE(event.properties ->> 'upsellId', 'unknown')", 'key')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy("COALESCE(event.properties ->> 'upsellId', 'unknown')")
        .orderBy('COUNT(*)', 'DESC')
        .limit(8)
        .getRawMany<{ key: string; count: string }>(),
      this.createFreemiumAnalyticsBaseQuery(filters, scope)
        .andWhere('event.name = :eventName', {
          eventName: 'upgrade_cta_clicked',
        })
        .select("COALESCE(event.properties ->> 'source', 'unknown')", 'key')
        .addSelect('COUNT(*)::int', 'count')
        .groupBy("COALESCE(event.properties ->> 'source', 'unknown')")
        .orderBy('COUNT(*)', 'DESC')
        .limit(8)
        .getRawMany<{ key: string; count: string }>(),
    ]);

    return {
      byUpsell: byUpsellRows.map((row) => ({
        key: row.key,
        label: FREEMIUM_UPSELL_LABELS[row.key] ?? row.key,
        count: Number(row.count),
      })),
      bySource: bySourceRows.map((row) => ({
        key: row.key,
        label: row.key === 'unknown' ? 'Nieznane źródło' : row.key,
        count: Number(row.count),
      })),
    };
  }

  private async buildClientsSourceBreakdown(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ClientsBreakdownItem[]> {
    const clientBase = this.createClientReportBaseQuery(filters, scope);

    const rows = await clientBase
      .clone()
      .select('client.source', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect(
        `COUNT(*) FILTER (WHERE client.status = :wonStatus)::int`,
        'wonCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE client.status = :lostStatus)::int`,
        'lostCount',
      )
      .setParameter('wonStatus', ClientStatus.CLOSED_WON)
      .setParameter('lostStatus', ClientStatus.CLOSED_LOST)
      .andWhere('client.createdAt <= :dateTo', { dateTo: filters.dateTo })
      .groupBy('client.source')
      .getRawMany<{
        key: string;
        count: string;
        wonCount: string;
        lostCount: string;
      }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    return rows
      .map((row) => ({
        key: row.key,
        count: Number(row.count),
        percentage:
          total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
        wonCount: Number(row.wonCount),
        lostCount: Number(row.lostCount),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async buildListingsStatusBreakdown(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ListingsBreakdownItem[]> {
    const listingBase = this.createListingBaseQuery(filters, scope);

    const rows = await listingBase
      .clone()
      .select('listing.status', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .andWhere('listing.createdAt <= :dateTo', { dateTo: filters.dateTo })
      .groupBy('listing.status')
      .getRawMany<{ key: string; count: string }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    return rows
      .map((row) => ({
        key: row.key,
        count: Number(row.count),
        percentage:
          total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async buildListingsPropertyTypeBreakdown(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ListingsBreakdownItem[]> {
    const listingBase = this.createListingBaseQuery(filters, scope);

    const rows = await listingBase
      .clone()
      .select('listing.propertyType', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect(
        `COUNT(*) FILTER (WHERE listing.status = :activeStatus)::int`,
        'activeCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE listing.status IN (:...closedStatuses))::int`,
        'closedCount',
      )
      .addSelect('COALESCE(SUM(listing.price), 0)::numeric', 'totalValue')
      .setParameter('activeStatus', ListingStatus.ACTIVE)
      .setParameter('closedStatuses', [
        ListingStatus.SOLD,
        ListingStatus.RENTED,
      ])
      .andWhere('listing.createdAt <= :dateTo', { dateTo: filters.dateTo })
      .groupBy('listing.propertyType')
      .getRawMany<{
        key: string;
        count: string;
        activeCount: string;
        closedCount: string;
        totalValue: string;
      }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    return rows
      .map((row) => ({
        key: row.key,
        count: Number(row.count),
        percentage:
          total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
        activeCount: Number(row.activeCount),
        closedCount: Number(row.closedCount),
        totalValue: Number(row.totalValue),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async buildListingsTransactionTypeBreakdown(
    filters: NormalizedFilters,
    scope: ResolvedScope,
  ): Promise<ListingsBreakdownItem[]> {
    const listingBase = this.createListingBaseQuery(filters, scope);

    const rows = await listingBase
      .clone()
      .select('listing.transactionType', 'key')
      .addSelect('COUNT(*)::int', 'count')
      .addSelect(
        `COUNT(*) FILTER (WHERE listing.status = :activeStatus)::int`,
        'activeCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE listing.status IN (:...closedStatuses))::int`,
        'closedCount',
      )
      .addSelect('COALESCE(SUM(listing.price), 0)::numeric', 'totalValue')
      .setParameter('activeStatus', ListingStatus.ACTIVE)
      .setParameter('closedStatuses', [
        ListingStatus.SOLD,
        ListingStatus.RENTED,
      ])
      .andWhere('listing.createdAt <= :dateTo', { dateTo: filters.dateTo })
      .groupBy('listing.transactionType')
      .getRawMany<{
        key: string;
        count: string;
        activeCount: string;
        closedCount: string;
        totalValue: string;
      }>();

    const total = rows.reduce((sum, row) => sum + Number(row.count), 0);

    return rows
      .map((row) => ({
        key: row.key,
        count: Number(row.count),
        percentage:
          total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
        activeCount: Number(row.activeCount),
        closedCount: Number(row.closedCount),
        totalValue: Number(row.totalValue),
      }))
      .sort((a, b) => b.count - a.count);
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
        .select(
          `TO_CHAR(${appointmentBucketExpr}, '${bucketFormat}')`,
          'bucket',
        )
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
    const direction = change === 0 ? 'flat' : change > 0 ? 'up' : 'down';

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

  private createClientReportBaseQuery(
    filters: Pick<NormalizedFilters, 'propertyType'>,
    scope: ResolvedScope,
  ): SelectQueryBuilder<Client> {
    const query = this.clientRepo
      .createQueryBuilder('client')
      .leftJoin('client.preference', 'preference')
      .where('client.agentId IN (:...agentIds)', {
        agentIds: scope.effectiveAgentIds,
      });

    if (filters.propertyType) {
      query.andWhere('preference.propertyType = :propertyType', {
        propertyType: filters.propertyType,
      });
    }

    return query;
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

  private createAppointmentReportBaseQuery(
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

  private createFreemiumAnalyticsBaseQuery(
    filters: Pick<NormalizedFilters, 'dateFrom' | 'dateTo'>,
    scope: ResolvedScope,
  ): SelectQueryBuilder<AnalyticsEvent> {
    return this.analyticsEventRepo
      .createQueryBuilder('event')
      .where('event.agentId IN (:...agentIds)', {
        agentIds: scope.effectiveAgentIds,
      })
      .andWhere('event.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      })
      .andWhere('event.name IN (:...eventNames)', {
        eventNames: FREEMIUM_METRICS.map((metric) => metric.key),
      });
  }

  private percentage(numerator: number, denominator: number): number {
    return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
  }

  private getBucketExpression(column: string, groupBy: ReportsGroupBy): string {
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

const FREEMIUM_METRICS: Array<{
  key: FreemiumMetricKey;
  label: string;
}> = [
  { key: 'listing_created', label: 'Utworzone oferty' },
  { key: 'listing_published', label: 'Opublikowane oferty' },
  { key: 'public_listing_viewed', label: 'Odsłony publicznych ofert' },
  { key: 'public_listing_link_copied', label: 'Skopiowane linki ofert' },
  { key: 'public_listing_share_clicked', label: 'Udostępnienia ofert' },
  { key: 'public_lead_submitted', label: 'Publiczne leady' },
  { key: 'public_listing_claim_started', label: 'Rozpoczęte claimy' },
  { key: 'public_listing_claim_completed', label: 'Zakończone claimy' },
  { key: 'limit_warning_shown', label: 'Ostrzeżenia limitów' },
  { key: 'limit_reached', label: 'Osiągnięte limity' },
  { key: 'upgrade_cta_clicked', label: 'Kliknięcia upgrade CTA' },
];

const FREEMIUM_UPSELL_LABELS: Record<string, string> = {
  'custom-branding': 'Własny branding',
  'profile-pro': 'Profile pro',
  'embed-customization': 'Personalizacja widgetów',
  'growth-automation': 'Automatyzacje',
  'higher-limits': 'Większe limity',
  unknown: 'Nieznany upsell',
};
