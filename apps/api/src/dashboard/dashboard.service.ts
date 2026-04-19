import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Listing } from '../listings/entities/listing.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Agent } from '../users/entities/agent.entity';
import {
  ListingStatus,
  ClientStatus,
  AppointmentStatus,
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

export interface DashboardStats {
  listings: ListingStats;
  clients: ClientStats;
  appointments: AppointmentStats;
  revenue: RevenueStats;
  recentActivity: RecentActivity[];
  upcomingAppointments: UpcomingAppointment[];
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
  ) {}

  async getStats(userId: string): Promise<DashboardStats> {
    const agent = await this.resolveAgent(userId);
    const agentId = agent.id;

    const [
      listings,
      clients,
      appointments,
      revenue,
      recentActivity,
      upcomingAppointments,
    ] = await Promise.all([
      this.getListingStats(agentId),
      this.getClientStats(agentId),
      this.getAppointmentStats(agentId),
      this.getRevenueStats(agentId),
      this.getRecentActivity(agentId),
      this.getUpcomingAppointments(agentId),
    ]);

    return {
      listings,
      clients,
      appointments,
      revenue,
      recentActivity,
      upcomingAppointments,
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
        closedTotal > 0
          ? Math.round((closedWon / closedTotal) * 100)
          : 0,
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
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.status = :status', { status: ListingStatus.ACTIVE })
      .getRawOne();

    const soldResult = await this.listingRepo
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.price), 0)::numeric', 'soldValue')
      .where('l.agentId = :agentId', { agentId })
      .andWhere('l.status IN (:...statuses)', {
        statuses: [ListingStatus.SOLD, ListingStatus.RENTED],
      })
      .getRawOne();

    return {
      totalListedValue: parseFloat(activeResult?.totalValue ?? '0'),
      avgPrice: Math.round(parseFloat(activeResult?.avgPrice ?? '0')),
      soldValue: parseFloat(soldResult?.soldValue ?? '0'),
    };
  }

  // ── Recent activity ──

  private async getRecentActivity(
    agentId: string,
  ): Promise<RecentActivity[]> {
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

  // ── Helpers ──

  private async resolveAgent(userId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }
    return agent;
  }
}
