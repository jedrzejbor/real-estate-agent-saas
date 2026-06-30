import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Listing } from '../listings/entities/listing.entity';
import { calculateListingCommissionAmount } from '../listings/listing-commission';
import { PublicLead } from '../public-leads/entities/public-lead.entity';
import { Task } from '../tasks/entities';
import { InsightDismissal } from './entities';
import {
  AppointmentStatus,
  ListingStatus,
  PublicLeadStatus,
  TaskStatus,
} from '../common/enums';
import { UsersService } from '../users';

const MAX_DASHBOARD_INSIGHTS = 6;
const STALE_LISTING_DAYS = 14;
const UNHANDLED_LEAD_HOURS = 24;
const LEAD_DROP_PERIOD_DAYS = 7;
const LEAD_DROP_MIN_PREVIOUS_PERIOD_LEADS = 5;
const LEAD_DROP_RATIO = 0.4;
const CANCELLED_APPOINTMENT_WINDOW_DAYS = 30;
const CANCELLED_APPOINTMENT_MIN_TOTAL = 3;
const CANCELLED_APPOINTMENT_RATIO = 0.3;
const HIGH_COMMISSION_THRESHOLD_PLN = 20_000;
const MAX_INSIGHT_ID_LENGTH = 160;

export type InsightSeverity = 'info' | 'warning' | 'success';
export type InsightEntityType =
  | 'listing'
  | 'public_lead'
  | 'appointment'
  | 'pipeline'
  | 'task';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  entityType: InsightEntityType;
  entityId: string | null;
  actionLabel: string;
  actionHref: string;
  createdAt: string;
}

export interface InsightsResponse {
  insights: Insight[];
  generatedAt: string;
}

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(PublicLead)
    private readonly publicLeadRepo: Repository<PublicLead>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(InsightDismissal)
    private readonly insightDismissalRepo: Repository<InsightDismissal>,
    private readonly usersService: UsersService,
  ) {}

  async getDashboardInsights(userId: string): Promise<InsightsResponse> {
    const access = await this.usersService.getAgencyAccessContext(userId);
    const agentIds = access.agencyAgentIds;
    const now = new Date();

    const [
      unhandledLead,
      leadDrop,
      overdueTasks,
      staleListing,
      cancelledAppointments,
      highCommissionListing,
    ] = await Promise.all([
      this.findUnhandledLeadInsight(agentIds, now),
      this.findLeadDropInsight(agentIds, now),
      this.findOverdueTasksInsight(agentIds, now),
      this.findStaleListingInsight(agentIds, now),
      this.findCancelledAppointmentsInsight(agentIds, now),
      this.findHighCommissionListingInsight(agentIds, now),
    ]);

    const dismissedIds = await this.findDismissedInsightIds(userId);
    const insights = [
      unhandledLead,
      leadDrop,
      overdueTasks,
      staleListing,
      cancelledAppointments,
      highCommissionListing,
    ].filter((insight): insight is Insight => {
      if (!insight) return false;
      return !dismissedIds.has(insight.id);
    });

    return {
      insights: insights.slice(0, MAX_DASHBOARD_INSIGHTS),
      generatedAt: now.toISOString(),
    };
  }

  async dismissDashboardInsight(
    userId: string,
    insightId: string,
  ): Promise<{ dismissed: true }> {
    const normalizedInsightId = insightId.trim();

    if (
      !normalizedInsightId ||
      normalizedInsightId.length > MAX_INSIGHT_ID_LENGTH
    ) {
      throw new BadRequestException('Invalid insight id');
    }

    await this.insightDismissalRepo.upsert(
      {
        userId,
        insightId: normalizedInsightId,
      },
      ['userId', 'insightId'],
    );

    return { dismissed: true };
  }

  private async findUnhandledLeadInsight(
    agentIds: string[],
    now: Date,
  ): Promise<Insight | null> {
    const threshold = new Date(
      now.getTime() - UNHANDLED_LEAD_HOURS * 60 * 60 * 1000,
    );
    const lead = await this.publicLeadRepo.findOne({
      where: {
        agentId: In(agentIds),
        status: PublicLeadStatus.NEW,
        createdAt: LessThanOrEqual(threshold),
      },
      relations: ['listing'],
      order: { createdAt: 'ASC' },
    });

    if (!lead) return null;

    const listingTitle = lead.listing?.title
      ? ` dla oferty "${lead.listing.title}"`
      : '';

    return {
      id: `public-lead-unhandled:${lead.id}`,
      severity: 'warning',
      title: 'Lead czeka na obsługę',
      description: `Nowe zapytanie${listingTitle} czeka ponad ${UNHANDLED_LEAD_HOURS} godziny. Szybki kontakt zwiększa szansę na prezentację.`,
      entityType: 'public_lead',
      entityId: lead.id,
      actionLabel: 'Obsłuż zapytanie',
      actionHref: lead.listingId
        ? `/dashboard/inquiries?status=${PublicLeadStatus.NEW}&listingId=${lead.listingId}`
        : `/dashboard/inquiries?status=${PublicLeadStatus.NEW}`,
      createdAt: now.toISOString(),
    };
  }

  private async findStaleListingInsight(
    agentIds: string[],
    now: Date,
  ): Promise<Insight | null> {
    const threshold = new Date(
      now.getTime() - STALE_LISTING_DAYS * 24 * 60 * 60 * 1000,
    );
    const listing = await this.listingRepo.findOne({
      where: {
        agentId: In(agentIds),
        status: ListingStatus.ACTIVE,
        updatedAt: LessThanOrEqual(threshold),
      },
      order: { updatedAt: 'ASC' },
    });

    if (!listing) return null;

    return {
      id: `listing-stale:${listing.id}`,
      severity: 'info',
      title: 'Oferta bez świeżej aktywności',
      description: `"${listing.title}" nie była aktualizowana od ponad ${STALE_LISTING_DAYS} dni. Warto sprawdzić cenę, opis i ekspozycję.`,
      entityType: 'listing',
      entityId: listing.id,
      actionLabel: 'Otwórz ofertę',
      actionHref: `/dashboard/listings/${listing.id}`,
      createdAt: now.toISOString(),
    };
  }

  private async findOverdueTasksInsight(
    agentIds: string[],
    now: Date,
  ): Promise<Insight | null> {
    const [oldestTask, overdueCount] = await Promise.all([
      this.taskRepo.findOne({
        where: {
          agentId: In(agentIds),
          status: TaskStatus.TODO,
          dueAt: LessThanOrEqual(now),
        },
        order: { dueAt: 'ASC' },
      }),
      this.taskRepo.count({
        where: {
          agentId: In(agentIds),
          status: TaskStatus.TODO,
          dueAt: LessThanOrEqual(now),
        },
      }),
    ]);

    if (!oldestTask || overdueCount === 0) return null;

    const suffix =
      overdueCount === 1
        ? `Najpilniejsze: "${oldestTask.title}".`
        : `Najpilniejsze: "${oldestTask.title}" oraz ${overdueCount - 1} inne.`;

    return {
      id: 'tasks-overdue',
      severity: 'warning',
      title: 'Zaległe zadania wymagają reakcji',
      description: `${overdueCount} zadań CRM jest po terminie. ${suffix}`,
      entityType: 'task',
      entityId: oldestTask.id,
      actionLabel: 'Otwórz zadania',
      actionHref: `/dashboard/tasks?status=${TaskStatus.TODO}`,
      createdAt: now.toISOString(),
    };
  }

  private async findLeadDropInsight(
    agentIds: string[],
    now: Date,
  ): Promise<Insight | null> {
    const currentPeriodStart = new Date(
      now.getTime() - LEAD_DROP_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() -
        LEAD_DROP_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    );

    const [currentLeads, previousLeads] = await Promise.all([
      this.publicLeadRepo.count({
        where: {
          agentId: In(agentIds),
          createdAt: Between(currentPeriodStart, now),
        },
      }),
      this.publicLeadRepo.count({
        where: {
          agentId: In(agentIds),
          createdAt: Between(previousPeriodStart, currentPeriodStart),
        },
      }),
    ]);

    if (previousLeads < LEAD_DROP_MIN_PREVIOUS_PERIOD_LEADS) {
      return null;
    }

    const dropRatio = (previousLeads - currentLeads) / previousLeads;
    if (dropRatio < LEAD_DROP_RATIO) {
      return null;
    }

    const dropPercent = Math.round(dropRatio * 100);

    return {
      id: `public-leads-drop:${LEAD_DROP_PERIOD_DAYS}d`,
      severity: 'warning',
      title: 'Spadek liczby leadów',
      description: `W ostatnich ${LEAD_DROP_PERIOD_DAYS} dniach przyszło ${currentLeads} leadów, poprzednio ${previousLeads}. Spadek o ${dropPercent}% warto sprawdzić w źródłach zapytań i ekspozycji ofert.`,
      entityType: 'public_lead',
      entityId: null,
      actionLabel: 'Zobacz zapytania',
      actionHref: '/dashboard/inquiries',
      createdAt: now.toISOString(),
    };
  }

  private async findCancelledAppointmentsInsight(
    agentIds: string[],
    now: Date,
  ): Promise<Insight | null> {
    const from = new Date(
      now.getTime() - CANCELLED_APPOINTMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const dateFilter = Between(from, now);
    const [total, cancelled] = await Promise.all([
      this.appointmentRepo.count({
        where: {
          agentId: In(agentIds),
          startTime: dateFilter,
        },
      }),
      this.appointmentRepo.count({
        where: {
          agentId: In(agentIds),
          status: AppointmentStatus.CANCELLED,
          startTime: dateFilter,
        },
      }),
    ]);

    if (
      total < CANCELLED_APPOINTMENT_MIN_TOTAL ||
      cancelled / total < CANCELLED_APPOINTMENT_RATIO
    ) {
      return null;
    }

    return {
      id: 'appointments-cancelled-ratio',
      severity: 'warning',
      title: 'Dużo anulowanych spotkań',
      description: `${cancelled} z ${total} spotkań z ostatnich ${CANCELLED_APPOINTMENT_WINDOW_DAYS} dni zostało anulowanych. Warto sprawdzić kwalifikację leadów i potwierdzanie terminów.`,
      entityType: 'appointment',
      entityId: null,
      actionLabel: 'Sprawdź kalendarz',
      actionHref: '/dashboard/calendar',
      createdAt: now.toISOString(),
    };
  }

  private async findHighCommissionListingInsight(
    agentIds: string[],
    now: Date,
  ): Promise<Insight | null> {
    const listings = await this.listingRepo.find({
      where: {
        agentId: In(agentIds),
        status: ListingStatus.ACTIVE,
        commissionType: Not(IsNull()),
        commissionValue: Not(IsNull()),
      },
      take: 50,
      order: { updatedAt: 'DESC' },
    });

    const topListing = listings
      .map((listing) => ({
        listing,
        commissionAmount: calculateListingCommissionAmount(listing) ?? 0,
      }))
      .filter((item) => item.commissionAmount >= HIGH_COMMISSION_THRESHOLD_PLN)
      .sort((a, b) => b.commissionAmount - a.commissionAmount)[0];

    if (!topListing) return null;

    return {
      id: `pipeline-high-commission:${topListing.listing.id}`,
      severity: 'success',
      title: 'Wysoki potencjał prowizji',
      description: `"${topListing.listing.title}" ma szacowaną prowizję powyżej ${formatMoney(HIGH_COMMISSION_THRESHOLD_PLN)}. To dobra oferta do aktywnego follow-upu i raportowania właścicielowi.`,
      entityType: 'pipeline',
      entityId: topListing.listing.id,
      actionLabel: 'Zobacz ofertę',
      actionHref: `/dashboard/listings/${topListing.listing.id}`,
      createdAt: now.toISOString(),
    };
  }

  private async findDismissedInsightIds(userId: string): Promise<Set<string>> {
    const dismissals = await this.insightDismissalRepo.find({
      where: { userId },
      select: { insightId: true },
    });

    return new Set(dismissals.map((dismissal) => dismissal.insightId));
  }
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
