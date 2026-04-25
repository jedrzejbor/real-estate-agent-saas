import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { AppointmentStatus, ListingStatus, ClientStatus } from '../common/enums';
import { Client } from '../clients/entities/client.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities/agent.entity';
import { UsersService } from '../users';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationRead } from './entities';

export type NotificationVariant = 'info' | 'warning' | 'success';
export type NotificationCategory = 'appointment' | 'client' | 'listing';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  variant: NotificationVariant;
  title: string;
  description: string;
  href?: string;
  createdAt: string;
  isRead: boolean;
}

export interface NotificationsResponse {
  generatedAt: string;
  unreadCount: number;
  items: NotificationItem[];
}

interface RankedNotification extends Omit<NotificationItem, 'isRead'> {
  priority: number;
  sortTimestamp: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(NotificationRead)
    private readonly notificationReadRepo: Repository<NotificationRead>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    userId: string,
    query: NotificationsQueryDto,
  ): Promise<NotificationsResponse> {
    const agent = await this.resolveAgent(userId);
    const limit = query.limit ?? 8;
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [overdueAppointments, upcomingAppointments, newClients, staleDrafts] =
      await Promise.all([
        this.appointmentRepo.find({
          where: {
            agentId: agent.id,
            status: AppointmentStatus.SCHEDULED,
            startTime: LessThan(now),
          },
          order: { startTime: 'DESC' },
          take: 3,
          relations: ['client'],
        }),
        this.appointmentRepo.find({
          where: {
            agentId: agent.id,
            status: AppointmentStatus.SCHEDULED,
            startTime: MoreThanOrEqual(now),
          },
          order: { startTime: 'ASC' },
          take: 4,
          relations: ['client'],
        }),
        this.clientRepo.find({
          where: {
            agentId: agent.id,
            status: ClientStatus.NEW,
            createdAt: MoreThanOrEqual(threeDaysAgo),
          },
          order: { createdAt: 'DESC' },
          take: 3,
        }),
        this.listingRepo.count({
          where: {
            agentId: agent.id,
            status: ListingStatus.DRAFT,
            createdAt: LessThan(sevenDaysAgo),
          },
        }),
      ]);

    const ranked: RankedNotification[] = [];

    for (const appointment of overdueAppointments) {
      ranked.push({
        id: `appointment-overdue-${appointment.id}`,
        category: 'appointment',
        variant: 'warning',
        title: 'Spotkanie wymaga aktualizacji statusu',
        description: `"${appointment.title}" miało rozpocząć się ${appointment.startTime.toLocaleString('pl-PL')}.`,
        href: `/dashboard/calendar/${appointment.id}`,
        createdAt: appointment.startTime.toISOString(),
        priority: 300,
        sortTimestamp: appointment.startTime.getTime(),
      });
    }

    for (const appointment of upcomingAppointments.filter(
      (item) => item.startTime <= in24Hours,
    )) {
      ranked.push({
        id: `appointment-upcoming-${appointment.id}`,
        category: 'appointment',
        variant: 'info',
        title: 'Nadchodzące spotkanie',
        description: `${appointment.title} rozpoczyna się ${appointment.startTime.toLocaleString('pl-PL')}.`,
        href: `/dashboard/calendar/${appointment.id}`,
        createdAt: appointment.startTime.toISOString(),
        priority: 240,
        sortTimestamp: appointment.startTime.getTime(),
      });
    }

    for (const client of newClients) {
      ranked.push({
        id: `client-new-${client.id}`,
        category: 'client',
        variant: 'success',
        title: 'Nowy lead do obsłużenia',
        description: `${client.firstName} ${client.lastName} oczekuje na pierwszy kontakt.`,
        href: `/dashboard/clients/${client.id}`,
        createdAt: client.createdAt.toISOString(),
        priority: 180,
        sortTimestamp: client.createdAt.getTime(),
      });
    }

    if (staleDrafts > 0) {
      const staleDraftListings = await this.listingRepo.find({
        where: {
          agentId: agent.id,
          status: ListingStatus.DRAFT,
          createdAt: LessThan(sevenDaysAgo),
        },
        order: { createdAt: 'ASC' },
        take: Math.min(limit, 5),
      });

      for (const listing of staleDraftListings) {
        ranked.push({
          id: `listing-stale-draft-${listing.id}`,
          category: 'listing',
          variant: 'warning',
          title: 'Szkic oferty czeka na publikację',
          description: `Oferta "${listing.title}" pozostaje szkicem od ${listing.createdAt.toLocaleDateString('pl-PL')}.`,
          href: `/dashboard/listings/${listing.id}`,
          createdAt: listing.createdAt.toISOString(),
          priority: 120,
          sortTimestamp: listing.createdAt.getTime(),
        });
      }
    }

    const candidateItems = ranked
      .sort((left, right) => {
        if (right.priority !== left.priority) {
          return right.priority - left.priority;
        }
        return right.sortTimestamp - left.sortTimestamp;
      })
      .slice(0, limit);

    const readIds = await this.getReadIds(
      agent.id,
      candidateItems.map((item) => item.id),
    );

    const items = candidateItems.map(({ priority, sortTimestamp, ...item }) => ({
      ...item,
      isRead: readIds.has(item.id),
    }));

    return {
      generatedAt: now.toISOString(),
      unreadCount: items.filter((item) => !item.isRead).length,
      items,
    };
  }

  async markAsRead(userId: string, ids: string[]) {
    const agent = await this.resolveAgent(userId);
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return { success: true, count: 0 };
    }

    const existingIds = await this.getReadIds(agent.id, uniqueIds);
    const newRows = uniqueIds
      .filter((id) => !existingIds.has(id))
      .map((notificationId) =>
        this.notificationReadRepo.create({
          agentId: agent.id,
          notificationId,
        }),
      );

    if (newRows.length > 0) {
      await this.notificationReadRepo.save(newRows);
    }

    return {
      success: true,
      count: uniqueIds.length,
    };
  }

  private async resolveAgent(userId: string): Promise<Agent> {
    return this.usersService.resolveAgentForUser(userId);
  }

  private async getReadIds(
    agentId: string,
    notificationIds: string[],
  ): Promise<Set<string>> {
    if (notificationIds.length === 0) {
      return new Set<string>();
    }

    const readItems = await this.notificationReadRepo
      .createQueryBuilder('notification_read')
      .where('notification_read.agentId = :agentId', { agentId })
      .andWhere('notification_read.notificationId IN (:...notificationIds)', {
        notificationIds,
      })
      .getMany();

    return new Set(readItems.map((item) => item.notificationId));
  }

  private pluralize(
    value: number,
    one: string,
    few: string,
    many: string,
  ): string {
    const mod10 = value % 10;
    const mod100 = value % 100;

    if (value === 1) return one;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      return few;
    }
    return many;
  }
}
