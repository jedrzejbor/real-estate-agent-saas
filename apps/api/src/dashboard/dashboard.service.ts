import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { buildListingCommissionSumSql } from '../listings/listing-commission-query';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Agent } from '../users/entities/agent.entity';
import { PublicLead } from '../public-leads/entities/public-lead.entity';
import { Task } from '../tasks/entities';
import { UsersService } from '../users';
import {
  ListingDocumentsService,
  type ListingDocumentAttentionItem,
} from '../listing-documents';
import {
  ListingStatus,
  ClientStatus,
  AppointmentStatus,
  PublicLeadStatus,
  TaskStatus,
} from '../common/enums';

// ── Response DTOs ──

export interface ListingStats {
  total: number;
  active: number;
  draft: number;
  reserved: number;
  sold: number;
  rented: number;
  archived: number;
}

export interface ClientStats {
  total: number;
  new: number;
  active: number;
  negotiating: number;
  closedWon: number;
  closedLost: number;
  conversionRate: number; // closedWon / (closedWon + closedLost) * 100
}

export interface AppointmentStats {
  total: number;
  thisWeek: number;
  today: number;
  upcoming: number;
  completed: number;
  cancelled: number;
}

export interface RevenueStats {
  totalListedValue: number; // Sum of prices of active listings
  avgPrice: number;
  soldValue: number; // Sum of prices of sold listings
  activeCommissionValue: number; // Estimated commission from active listings
  closedCommissionValue: number; // Estimated commission from sold/rented listings
}

export interface RecentActivity {
  id: string;
  type: 'listing' | 'client' | 'appointment';
  title: string;
  subtitle: string;
  createdAt: string;
}

export interface UpcomingAppointment {
  id: string;
  title: string;
  type: string;
  startTime: string;
  endTime: string;
  location?: string;
  clientName?: string;
}

export interface DocumentAttentionStats {
  total: number;
  missingRequired: number;
  needsCorrection: number;
  overdue: number;
  expired: number;
  items: ListingDocumentAttentionItem[];
}

export interface DashboardStats {
  listings: ListingStats;
  clients: ClientStats;
  appointments: AppointmentStats;
  revenue: RevenueStats;
  documentAttention: DocumentAttentionStats;
  recentActivity: RecentActivity[];
  upcomingAppointments: UpcomingAppointment[];
}

export type TodayItemType =
  | 'appointment'
  | 'public_lead'
  | 'document'
  | 'listing'
  | 'task';
export type TodayItemPriority = 'high' | 'medium' | 'low';
export type TodayItemEntityType =
  | 'appointment'
  | 'public_lead'
  | 'listing'
  | 'task';

export interface TodayItemAction {
  label: string;
  href: string;
}

export interface TodayItem {
  id: string;
  type: TodayItemType;
  priority: TodayItemPriority;
  title: string;
  description: string;
  entityType: TodayItemEntityType;
  entityId: string;
  href: string;
  dueAt: string | null;
  action: TodayItemAction;
}

export interface DashboardTodayResponse {
  items: TodayItem[];
  generatedAt: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(PublicLead)
    private readonly publicLeadRepo: Repository<PublicLead>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly usersService: UsersService,
    private readonly listingDocumentsService: ListingDocumentsService,
  ) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const agent = await this.resolveAgent(userId);
    const agentId = agent.id;

    const [
      listings,
      clients,
      appointments,
      revenue,
      documentAttention,
      recentActivity,
      upcomingAppointments,
    ] = await Promise.all([
      this.getListingStats(agentId),
      this.getClientStats(agentId),
      this.getAppointmentStats(agentId),
      this.getRevenueStats(agentId),
      this.listingDocumentsService.getAttentionSummaryForAgent(agentId),
      this.getRecentActivity(agentId),
      this.getUpcomingAppointments(agentId),
    ]);

    return {
      listings,
      clients,
      appointments,
      revenue,
      documentAttention,
      recentActivity,
      upcomingAppointments,
    };
  }

  async getToday(userId: string): Promise<DashboardTodayResponse> {
    const agent = await this.resolveAgent(userId);
    const agentId = agent.id;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const leadWindowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const staleListingThreshold = new Date(
      now.getTime() - 14 * 24 * 60 * 60 * 1000,
    );

    const [appointments, publicLeads, documentAttention, staleListings, tasks] =
      await Promise.all([
        this.getTodayAppointments(agentId, todayStart, todayEnd),
        this.getNewPublicLeads(agentId, leadWindowStart),
        this.listingDocumentsService.getAttentionSummaryForAgent(agentId),
        this.getStaleActiveListings(agentId, staleListingThreshold),
        this.getOpenTasks(agentId, todayEnd),
      ]);

    const items = [
      ...appointments.map((appointment) =>
        this.toAppointmentTodayItem(appointment),
      ),
      ...publicLeads.map((lead) => this.toPublicLeadTodayItem(lead, now)),
      ...documentAttention.items
        .slice(0, 5)
        .map((item) => this.toDocumentTodayItem(item)),
      ...staleListings.map((listing) => this.toStaleListingTodayItem(listing)),
      ...tasks.map((task) => this.toTaskTodayItem(task, now)),
    ];

    items.sort(compareTodayItems);

    return {
      items: items.slice(0, 10),
      generatedAt: now.toISOString(),
    };
  }

  // ── Listing stats ──

  private async getListingStats(agentId: string): Promise<ListingStats> {
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('l.agentId = :agentId', { agentId })
      .groupBy('l.status');

    const rows: { status: string; count: number }[] = await qb.getRawMany();
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));

    const total = rows.reduce((sum, r) => sum + r.count, 0);

    return {
      total,
      active: byStatus[ListingStatus.ACTIVE] ?? 0,
      draft: byStatus[ListingStatus.DRAFT] ?? 0,
      reserved: byStatus[ListingStatus.RESERVED] ?? 0,
      sold: byStatus[ListingStatus.SOLD] ?? 0,
      rented: byStatus[ListingStatus.RENTED] ?? 0,
      archived: byStatus[ListingStatus.ARCHIVED] ?? 0,
    };
  }

  // ── Client stats ──

  private async getClientStats(agentId: string): Promise<ClientStats> {
    const qb = this.clientRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('c.agentId = :agentId', { agentId })
      .groupBy('c.status');

    const rows: { status: string; count: number }[] = await qb.getRawMany();
    const byStatus = Object.fromEntries(rows.map((r) => [r.status, r.count]));

    const total = rows.reduce((sum, r) => sum + r.count, 0);
    const closedWon = byStatus[ClientStatus.CLOSED_WON] ?? 0;
    const closedLost = byStatus[ClientStatus.CLOSED_LOST] ?? 0;
    const closedTotal = closedWon + closedLost;

    return {
      total,
      new: byStatus[ClientStatus.NEW] ?? 0,
      active: byStatus[ClientStatus.ACTIVE] ?? 0,
      negotiating: byStatus[ClientStatus.NEGOTIATING] ?? 0,
      closedWon,
      closedLost,
      conversionRate:
        closedTotal > 0 ? Math.round((closedWon / closedTotal) * 100) : 0,
    };
  }

  // ── Appointment stats ──

  private async getAppointmentStats(
    agentId: string,
  ): Promise<AppointmentStats> {
    const now = new Date();

    // Week boundaries (Monday-based)
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Today boundaries
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const [total, thisWeek, today, upcoming, completed, cancelled] =
      await Promise.all([
        this.appointmentRepo.count({ where: { agentId } }),
        this.appointmentRepo.count({
          where: {
            agentId,
            startTime: Between(weekStart, weekEnd),
          },
        }),
        this.appointmentRepo.count({
          where: {
            agentId,
            startTime: Between(todayStart, todayEnd),
          },
        }),
        this.appointmentRepo.count({
          where: {
            agentId,
            status: AppointmentStatus.SCHEDULED,
            startTime: MoreThanOrEqual(now),
          },
        }),
        this.appointmentRepo.count({
          where: { agentId, status: AppointmentStatus.COMPLETED },
        }),
        this.appointmentRepo.count({
          where: { agentId, status: AppointmentStatus.CANCELLED },
        }),
      ]);

    return { total, thisWeek, today, upcoming, completed, cancelled };
  }

  // ── Revenue stats ──

  private async getRevenueStats(agentId: string): Promise<RevenueStats> {
    const activeResult = await this.listingRepo
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.price), 0)::numeric', 'totalValue')
      .addSelect('COALESCE(AVG(l.price), 0)::numeric', 'avgPrice')
      .addSelect(buildListingCommissionSumSql('l'), 'activeCommissionValue')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.status = :status', { status: ListingStatus.ACTIVE })
      .getRawOne();

    const soldResult = await this.listingRepo
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.price), 0)::numeric', 'soldValue')
      .addSelect(buildListingCommissionSumSql('l'), 'closedCommissionValue')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.status IN (:...statuses)', {
        statuses: [ListingStatus.SOLD, ListingStatus.RENTED],
      })
      .getRawOne();

    return {
      totalListedValue: parseFloat(activeResult?.totalValue ?? '0'),
      avgPrice: Math.round(parseFloat(activeResult?.avgPrice ?? '0')),
      soldValue: parseFloat(soldResult?.soldValue ?? '0'),
      activeCommissionValue: parseFloat(
        activeResult?.activeCommissionValue ?? '0',
      ),
      closedCommissionValue: parseFloat(
        soldResult?.closedCommissionValue ?? '0',
      ),
    };
  }

  // ── Recent activity ──

  private async getRecentActivity(agentId: string): Promise<RecentActivity[]> {
    // Fetch recent items from each entity type, merge and sort
    const [listings, clients, appointments] = await Promise.all([
      this.listingRepo.find({
        where: { agentId },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['address'],
      }),
      this.clientRepo.find({
        where: { agentId },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
      this.appointmentRepo.find({
        where: { agentId },
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    const activities: RecentActivity[] = [
      ...listings.map((l) => ({
        id: l.id,
        type: 'listing' as const,
        title: l.title,
        subtitle: `Oferta · ${l.address?.city ?? ''}`,
        createdAt: l.createdAt.toISOString(),
      })),
      ...clients.map((c) => ({
        id: c.id,
        type: 'client' as const,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: `Klient · ${c.status}`,
        createdAt: c.createdAt.toISOString(),
      })),
      ...appointments.map((a) => ({
        id: a.id,
        type: 'appointment' as const,
        title: a.title,
        subtitle: `Spotkanie · ${a.type}`,
        createdAt: a.createdAt.toISOString(),
      })),
    ];

    // Sort descending by date, take 10 most recent
    activities.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return activities.slice(0, 10);
  }

  // ── Upcoming appointments ──

  private async getUpcomingAppointments(
    agentId: string,
  ): Promise<UpcomingAppointment[]> {
    const now = new Date();

    const appointments = await this.appointmentRepo.find({
      where: {
        agentId,
        status: AppointmentStatus.SCHEDULED,
        startTime: MoreThanOrEqual(now),
      },
      order: { startTime: 'ASC' },
      take: 5,
      relations: ['client'],
    });

    return appointments.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      startTime: a.startTime.toISOString(),
      endTime: a.endTime.toISOString(),
      location: a.location ?? undefined,
      clientName: a.client
        ? `${a.client.firstName} ${a.client.lastName}`
        : undefined,
    }));
  }

  private getTodayAppointments(
    agentId: string,
    todayStart: Date,
    todayEnd: Date,
  ): Promise<Appointment[]> {
    return this.appointmentRepo.find({
      where: {
        agentId,
        status: AppointmentStatus.SCHEDULED,
        startTime: Between(todayStart, todayEnd),
      },
      order: { startTime: 'ASC' },
      take: 8,
      relations: ['client', 'listing'],
    });
  }

  private getNewPublicLeads(
    agentId: string,
    leadWindowStart: Date,
  ): Promise<PublicLead[]> {
    return this.publicLeadRepo.find({
      where: {
        agentId,
        status: In([PublicLeadStatus.NEW, PublicLeadStatus.CONTACTED]),
        createdAt: MoreThanOrEqual(leadWindowStart),
      },
      order: { createdAt: 'DESC' },
      take: 8,
      relations: ['listing', 'convertedClient'],
    });
  }

  private getStaleActiveListings(
    agentId: string,
    threshold: Date,
  ): Promise<Listing[]> {
    return this.listingRepo.find({
      where: {
        agentId,
        status: ListingStatus.ACTIVE,
        updatedAt: LessThanOrEqual(threshold),
      },
      order: { updatedAt: 'ASC' },
      take: 5,
    });
  }

  private getOpenTasks(agentId: string, todayEnd: Date): Promise<Task[]> {
    return this.taskRepo.find({
      where: [
        {
          agentId,
          status: TaskStatus.TODO,
          dueAt: LessThanOrEqual(todayEnd),
        },
        {
          agentId,
          status: TaskStatus.TODO,
          dueAt: IsNull(),
        },
      ],
      order: {
        dueAt: 'ASC',
        createdAt: 'ASC',
      },
      take: 8,
      relations: ['appointment', 'client', 'listing'],
    });
  }

  private toAppointmentTodayItem(appointment: Appointment): TodayItem {
    const clientName = appointment.client
      ? `${appointment.client.firstName} ${appointment.client.lastName}`.trim()
      : null;
    const listingTitle = appointment.listing?.title ?? null;
    const context = [clientName, listingTitle].filter(Boolean).join(' · ');

    return {
      id: `appointment-${appointment.id}`,
      type: 'appointment',
      priority: 'high',
      title: appointment.title,
      description:
        context || appointment.location || 'Spotkanie zaplanowane na dziś.',
      entityType: 'appointment',
      entityId: appointment.id,
      href: `/dashboard/calendar/${appointment.id}`,
      dueAt: appointment.startTime.toISOString(),
      action: {
        label: 'Otwórz spotkanie',
        href: `/dashboard/calendar/${appointment.id}`,
      },
    };
  }

  private toPublicLeadTodayItem(lead: PublicLead, now: Date): TodayItem {
    const ageMs = now.getTime() - lead.createdAt.getTime();
    const isOlderThanFourHours = ageMs >= 4 * 60 * 60 * 1000;
    const href = lead.listingId
      ? `/dashboard/inquiries?listingId=${lead.listingId}&status=${lead.status}`
      : `/dashboard/inquiries?status=${lead.status}`;

    return {
      id: `public-lead-${lead.id}`,
      type: 'public_lead',
      priority: isOlderThanFourHours ? 'high' : 'medium',
      title: lead.fullName,
      description: lead.listing?.title
        ? `Nowe zapytanie do oferty: ${lead.listing.title}`
        : 'Nowe zapytanie publiczne wymaga obsługi.',
      entityType: 'public_lead',
      entityId: lead.id,
      href,
      dueAt: lead.createdAt.toISOString(),
      action: {
        label: 'Obsłuż lead',
        href,
      },
    };
  }

  private toDocumentTodayItem(item: ListingDocumentAttentionItem): TodayItem {
    return {
      id: `document-${item.id}`,
      type: 'document',
      priority: getDocumentTodayPriority(item.kind),
      title: getDocumentTodayTitle(item),
      description: item.listingTitle,
      entityType: 'listing',
      entityId: item.listingId,
      href: `/dashboard/listings/${item.listingId}?tab=documents`,
      dueAt: item.dueDate ?? item.createdAt,
      action: {
        label: 'Uzupełnij dokument',
        href: `/dashboard/listings/${item.listingId}?tab=documents`,
      },
    };
  }

  private toStaleListingTodayItem(listing: Listing): TodayItem {
    const daysWithoutUpdate = getFullDaysBetween(listing.updatedAt, new Date());

    return {
      id: `listing-stale-${listing.id}`,
      type: 'listing',
      priority: daysWithoutUpdate >= 30 ? 'medium' : 'low',
      title: listing.title,
      description: `Aktywna oferta bez aktualizacji od ${daysWithoutUpdate} dni.`,
      entityType: 'listing',
      entityId: listing.id,
      href: `/dashboard/listings/${listing.id}`,
      dueAt: listing.updatedAt.toISOString(),
      action: {
        label: 'Sprawdź ofertę',
        href: `/dashboard/listings/${listing.id}`,
      },
    };
  }

  private toTaskTodayItem(task: Task, now: Date): TodayItem {
    const href = getTaskHref(task);
    const isOverdue = task.dueAt ? task.dueAt.getTime() < now.getTime() : false;

    return {
      id: `task-${task.id}`,
      type: 'task',
      priority: isOverdue ? 'high' : 'medium',
      title: task.title,
      description: getTaskDescription(task),
      entityType: 'task',
      entityId: task.id,
      href,
      dueAt: task.dueAt?.toISOString() ?? null,
      action: {
        label: 'Otwórz kontekst',
        href,
      },
    };
  }

  // ── Helpers ──

  private async resolveAgent(userId: string): Promise<Agent> {
    return this.usersService.resolveAgentForUser(userId);
  }
}

const TODAY_PRIORITY_WEIGHT: Record<TodayItemPriority, number> = {
  high: 300,
  medium: 200,
  low: 100,
};

function compareTodayItems(left: TodayItem, right: TodayItem): number {
  const priorityDiff =
    TODAY_PRIORITY_WEIGHT[right.priority] -
    TODAY_PRIORITY_WEIGHT[left.priority];
  if (priorityDiff !== 0) return priorityDiff;

  const leftDue = left.dueAt
    ? new Date(left.dueAt).getTime()
    : Number.MAX_SAFE_INTEGER;
  const rightDue = right.dueAt
    ? new Date(right.dueAt).getTime()
    : Number.MAX_SAFE_INTEGER;

  return leftDue - rightDue;
}

function getDocumentTodayPriority(
  kind: ListingDocumentAttentionItem['kind'],
): TodayItemPriority {
  if (kind === 'overdue' || kind === 'expired') return 'high';
  if (kind === 'needs_correction') return 'medium';
  return 'low';
}

function getDocumentTodayTitle(item: ListingDocumentAttentionItem): string {
  if (item.kind === 'missing_required') {
    return `${item.count} brakujące wymagane dokumenty`;
  }

  if (item.kind === 'needs_correction') {
    return `${item.documentName ?? 'Dokument'} wymaga poprawy`;
  }

  if (item.kind === 'expired') {
    return `${item.documentName ?? 'Dokument'} stracił ważność`;
  }

  return `${item.documentName ?? 'Dokument'} jest po terminie`;
}

function getFullDaysBetween(left: Date, right: Date): number {
  const diffMs = right.getTime() - left.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function getTaskHref(task: Task): string {
  if (task.appointmentId) return `/dashboard/calendar/${task.appointmentId}`;
  if (task.clientId) return `/dashboard/clients/${task.clientId}`;
  if (task.listingId) return `/dashboard/listings/${task.listingId}`;
  return '/dashboard';
}

function getTaskDescription(task: Task): string {
  const context = [
    task.client
      ? `${task.client.firstName} ${task.client.lastName}`.trim()
      : null,
    task.listing?.title ?? null,
    task.appointment?.title ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

  return task.description ?? (context || 'Zadanie wymaga obsługi.');
}
