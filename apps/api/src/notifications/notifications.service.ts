import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import {
  AppointmentStatus,
  ListingAgentAssignmentStatus,
  ListingAgentProposalStatus,
  ListingStatus,
  ClientStatus,
  TaskStatus,
  TaskType,
} from '../common/enums';
import { Client } from '../clients/entities/client.entity';
import { Listing } from '../listings/entities/listing.entity';
import {
  ListingAgentAssignment,
  ListingAgentProposal,
} from '../listing-agent-proposals/entities';
import { PublicLead } from '../public-leads/entities';
import { Task } from '../tasks/entities';
import { Agent } from '../users/entities/agent.entity';
import { UsersService } from '../users';
import {
  ListingDocumentsService,
  type ListingDocumentAttentionItem,
} from '../listing-documents';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import {
  NotificationPreference,
  NotificationRead,
  NotificationRuleSettings,
} from './entities';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from './notification-categories';

export type NotificationVariant = 'info' | 'warning' | 'success';
export type NotificationSeverity = 'critical';

const CRITICAL_FOLLOW_UP_OVERDUE_DAYS = 7;
const CRITICAL_STALE_LISTING_DAYS = 45;

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  variant: NotificationVariant;
  title: string;
  description: string;
  href?: string;
  createdAt: string;
  isRead: boolean;
  severity?: NotificationSeverity;
}

export interface NotificationsResponse {
  generatedAt: string;
  unreadCount: number;
  items: NotificationItem[];
}

export interface NotificationPreferenceItem {
  category: NotificationCategory;
  enabled: boolean;
}

export interface NotificationRuleSettingsItem {
  followUpOverdueDays: number;
  staleListingDays: number;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferenceItem[];
  ruleSettings: NotificationRuleSettingsItem;
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
    @InjectRepository(PublicLead)
    private readonly publicLeadRepo: Repository<PublicLead>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(ListingAgentProposal)
    private readonly listingAgentProposalRepo: Repository<ListingAgentProposal>,
    @InjectRepository(ListingAgentAssignment)
    private readonly listingAgentAssignmentRepo: Repository<ListingAgentAssignment>,
    @InjectRepository(NotificationRead)
    private readonly notificationReadRepo: Repository<NotificationRead>,
    @InjectRepository(NotificationPreference)
    private readonly notificationPreferenceRepo: Repository<NotificationPreference>,
    @InjectRepository(NotificationRuleSettings)
    private readonly notificationRuleSettingsRepo: Repository<NotificationRuleSettings>,
    private readonly usersService: UsersService,
    private readonly listingDocumentsService: ListingDocumentsService,
  ) {}

  async findAll(
    userId: string,
    query: NotificationsQueryDto,
  ): Promise<NotificationsResponse> {
    const agent = await this.resolveAgent(userId);
    const limit = query.limit ?? 8;
    const now = new Date();
    const ruleSettings = await this.getRuleSettings(agent.id);
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const followUpThreshold = new Date(
      now.getTime() - ruleSettings.followUpOverdueDays * 24 * 60 * 60 * 1000,
    );
    const criticalFollowUpThreshold = new Date(
      now.getTime() - CRITICAL_FOLLOW_UP_OVERDUE_DAYS * 24 * 60 * 60 * 1000,
    );
    const staleListingThreshold = new Date(
      now.getTime() - ruleSettings.staleListingDays * 24 * 60 * 60 * 1000,
    );
    const criticalStaleListingThreshold = new Date(
      now.getTime() - CRITICAL_STALE_LISTING_DAYS * 24 * 60 * 60 * 1000,
    );
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [
      overdueAppointments,
      upcomingAppointments,
      newClients,
      recentPublicLeads,
      overdueFollowUps,
      staleActiveListings,
      staleDrafts,
      documentAttention,
      recentListingAgentDecisions,
      listingAgentAssignmentsAwaitingCopy,
    ] = await Promise.all([
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
        take: 6,
      }),
      this.publicLeadRepo.find({
        where: {
          agentId: agent.id,
          createdAt: MoreThanOrEqual(threeDaysAgo),
        },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['listing', 'convertedClient'],
      }),
      this.taskRepo.find({
        where: {
          agentId: agent.id,
          status: TaskStatus.TODO,
          type: TaskType.FOLLOW_UP,
          dueAt: LessThan(
            maxDate(followUpThreshold, criticalFollowUpThreshold),
          ),
        },
        order: { dueAt: 'ASC' },
        take: 5,
        relations: ['client', 'listing', 'appointment'],
      }),
      this.listingRepo.find({
        where: {
          agentId: agent.id,
          status: ListingStatus.ACTIVE,
          updatedAt: LessThan(
            maxDate(staleListingThreshold, criticalStaleListingThreshold),
          ),
        },
        order: { updatedAt: 'ASC' },
        take: 3,
      }),
      this.listingRepo.count({
        where: {
          agentId: agent.id,
          status: ListingStatus.DRAFT,
          createdAt: LessThan(sevenDaysAgo),
        },
      }),
      this.listingDocumentsService.getAttentionSummaryForAgent(agent.id),
      this.listingAgentProposalRepo.find({
        where: {
          agentId: agent.id,
          status: In([
            ListingAgentProposalStatus.ACCEPTED,
            ListingAgentProposalStatus.REJECTED,
          ]),
          updatedAt: MoreThanOrEqual(sevenDaysAgo),
        },
        order: { updatedAt: 'DESC' },
        take: 5,
        relations: ['listing'],
      }),
      this.listingAgentAssignmentRepo.find({
        where: {
          agentId: agent.id,
          status: ListingAgentAssignmentStatus.ACTIVE,
          agentListingId: IsNull(),
        },
        order: { createdAt: 'DESC' },
        take: 5,
        relations: ['listing', 'proposal'],
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
        severity: 'critical',
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

    for (const lead of recentPublicLeads) {
      ranked.push({
        id: `public-lead-new-${lead.id}`,
        category: 'public_lead',
        variant: 'success',
        title: 'Nowy lead z publicznej oferty',
        description: this.buildPublicLeadDescription(lead),
        href: lead.convertedClientId
          ? `/dashboard/clients/${lead.convertedClientId}`
          : '/dashboard/clients',
        createdAt: lead.createdAt.toISOString(),
        priority: 220,
        sortTimestamp: lead.createdAt.getTime(),
      });
    }

    for (const task of overdueFollowUps) {
      ranked.push(this.buildOverdueFollowUpNotification(task, now));
    }

    for (const listing of staleActiveListings) {
      ranked.push(this.buildStaleActiveListingNotification(listing, now));
    }

    const publicLeadClientIds = new Set(
      recentPublicLeads
        .map((lead) => lead.convertedClientId)
        .filter((clientId): clientId is string => Boolean(clientId)),
    );

    for (const client of newClients
      .filter((client) => !publicLeadClientIds.has(client.id))
      .slice(0, 3)) {
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

    for (const item of documentAttention.items.slice(0, 5)) {
      ranked.push(this.buildDocumentNotification(item));
    }

    for (const assignment of listingAgentAssignmentsAwaitingCopy) {
      ranked.push(this.buildListingAgentAssignmentNotification(assignment));
    }

    const assignmentProposalIds = new Set(
      listingAgentAssignmentsAwaitingCopy.map(
        (assignment) => assignment.proposalId,
      ),
    );

    for (const proposal of recentListingAgentDecisions.filter(
      (proposal) => !assignmentProposalIds.has(proposal.id),
    )) {
      ranked.push(this.buildListingAgentProposalDecisionNotification(proposal));
    }

    const enabledCategories = await this.getEnabledCategorySet(agent.id);
    const candidateItems = ranked
      .filter((item) => enabledCategories.has(item.category))
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

    const items = candidateItems.map(
      ({ priority, sortTimestamp, ...item }) => ({
        ...item,
        isRead: readIds.has(item.id),
      }),
    );

    return {
      generatedAt: now.toISOString(),
      unreadCount: items.filter((item) => !item.isRead).length,
      items,
    };
  }

  async findPreferences(
    userId: string,
  ): Promise<NotificationPreferencesResponse> {
    const agent = await this.resolveAgent(userId);

    return {
      preferences: await this.getPreferences(agent.id),
      ruleSettings: await this.getRuleSettings(agent.id),
    };
  }

  async updatePreferences(
    userId: string,
    preferences: NotificationPreferenceItem[],
    ruleSettings?: NotificationRuleSettingsItem,
  ): Promise<NotificationPreferencesResponse> {
    const agent = await this.resolveAgent(userId);
    const uniquePreferences = Array.from(
      new Map(preferences.map((item) => [item.category, item])).values(),
    );

    if (uniquePreferences.length > 0) {
      await this.notificationPreferenceRepo.upsert(
        uniquePreferences.map((item) => ({
          agentId: agent.id,
          category: item.category,
          enabled: item.enabled,
        })),
        ['agentId', 'category'],
      );
    }

    if (ruleSettings) {
      await this.notificationRuleSettingsRepo.upsert(
        {
          agentId: agent.id,
          followUpOverdueDays: ruleSettings.followUpOverdueDays,
          staleListingDays: ruleSettings.staleListingDays,
        },
        ['agentId'],
      );
    }

    return {
      preferences: await this.getPreferences(agent.id),
      ruleSettings: await this.getRuleSettings(agent.id),
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

  private async getEnabledCategorySet(
    agentId: string,
  ): Promise<Set<NotificationCategory>> {
    const preferences = await this.getPreferences(agentId);

    return new Set(
      preferences
        .filter((preference) => preference.enabled)
        .map((preference) => preference.category),
    );
  }

  private async getPreferences(
    agentId: string,
  ): Promise<NotificationPreferenceItem[]> {
    const savedPreferences = await this.notificationPreferenceRepo.find({
      where: { agentId },
    });
    const savedByCategory = new Map(
      savedPreferences.map((preference) => [
        preference.category,
        preference.enabled,
      ]),
    );

    return NOTIFICATION_CATEGORIES.map((category) => ({
      category,
      enabled: savedByCategory.get(category) ?? true,
    }));
  }

  private async getRuleSettings(
    agentId: string,
  ): Promise<NotificationRuleSettingsItem> {
    const savedSettings = await this.notificationRuleSettingsRepo.findOne({
      where: { agentId },
    });

    return {
      followUpOverdueDays: savedSettings?.followUpOverdueDays ?? 0,
      staleListingDays: savedSettings?.staleListingDays ?? 14,
    };
  }

  private buildPublicLeadDescription(lead: PublicLead): string {
    const listingTitle =
      lead.listing?.publicTitle || lead.listing?.title || 'publicznej oferty';
    const contact = lead.fullName.trim() || 'Nowy kontakt';

    return `${contact} wysłał zapytanie z oferty "${listingTitle}".`;
  }

  private buildDocumentNotification(
    item: ListingDocumentAttentionItem,
  ): RankedNotification {
    const message = getDocumentNotificationMessage(item);

    return {
      id: item.id,
      category: 'document',
      variant: 'warning',
      title: message.title,
      description: message.description,
      href: `/dashboard/listings/${item.listingId}`,
      createdAt: item.createdAt,
      priority: getDocumentNotificationPriority(item.kind),
      sortTimestamp: new Date(item.createdAt).getTime(),
    };
  }

  private buildListingAgentAssignmentNotification(
    assignment: ListingAgentAssignment,
  ): RankedNotification {
    const listingTitle =
      assignment.listing?.publicTitle ||
      assignment.listing?.title ||
      'oferty właściciela';

    return {
      id: `listing-agent-assignment-copy-pending-${assignment.id}`,
      category: 'listing_agent_collaboration',
      variant: 'success',
      title: 'Właściciel zaakceptował współpracę',
      description: `Możesz utworzyć kopię CRM dla "${listingTitle}" i rozpocząć pracę na ofercie.`,
      href: '/dashboard/agent-assignments',
      createdAt: assignment.createdAt.toISOString(),
      severity: 'critical',
      priority: 330,
      sortTimestamp: assignment.createdAt.getTime(),
    };
  }

  private buildListingAgentProposalDecisionNotification(
    proposal: ListingAgentProposal,
  ): RankedNotification {
    const listingTitle =
      proposal.listing?.publicTitle ||
      proposal.listing?.title ||
      'oferty właściciela';
    const rejected = proposal.status === ListingAgentProposalStatus.REJECTED;

    return {
      id: `listing-agent-proposal-decision-${proposal.id}`,
      category: 'listing_agent_collaboration',
      variant: rejected ? 'warning' : 'success',
      title: rejected
        ? 'Właściciel odrzucił propozycję'
        : 'Właściciel zaakceptował propozycję',
      description: rejected
        ? `Propozycja dla "${listingTitle}" została odrzucona przez właściciela.`
        : `Propozycja dla "${listingTitle}" została zaakceptowana przez właściciela.`,
      href: `/dashboard/agent-proposals/${proposal.id}`,
      createdAt: proposal.updatedAt.toISOString(),
      priority: rejected ? 170 : 260,
      sortTimestamp: proposal.updatedAt.getTime(),
    };
  }

  private buildOverdueFollowUpNotification(
    task: Task,
    now: Date,
  ): RankedNotification {
    const context = this.getTaskContext(task);
    const dueAt = task.dueAt ?? task.createdAt;
    const overdueDays = Math.max(
      1,
      Math.ceil((now.getTime() - dueAt.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const isCritical = overdueDays >= CRITICAL_FOLLOW_UP_OVERDUE_DAYS;

    return {
      id: `task-overdue-follow-up-${task.id}`,
      category: 'task',
      variant: 'warning',
      title: 'Follow-up jest po terminie',
      description: `${task.title}${context.label ? ` (${context.label})` : ''} czeka ${overdueDays} ${this.pluralize(overdueDays, 'dzień', 'dni', 'dni')}.`,
      href: context.href,
      createdAt: dueAt.toISOString(),
      severity: isCritical ? 'critical' : undefined,
      priority: isCritical ? 340 : 280,
      sortTimestamp: dueAt.getTime(),
    };
  }

  private buildStaleActiveListingNotification(
    listing: Listing,
    now: Date,
  ): RankedNotification {
    const staleDays = Math.max(
      1,
      Math.ceil(
        (now.getTime() - listing.updatedAt.getTime()) / (24 * 60 * 60 * 1000),
      ),
    );
    const isCritical = staleDays >= CRITICAL_STALE_LISTING_DAYS;

    return {
      id: `listing-stale-active-${listing.id}`,
      category: 'listing',
      variant: 'warning',
      title: 'Aktywna oferta wymaga odświeżenia',
      description: `"${listing.title}" nie była aktualizowana od ${listing.updatedAt.toLocaleDateString('pl-PL')}. Warto sprawdzić cenę, opis i ekspozycję.`,
      href: `/dashboard/listings/${listing.id}`,
      createdAt: listing.updatedAt.toISOString(),
      severity: isCritical ? 'critical' : undefined,
      priority: isCritical ? 260 : 190,
      sortTimestamp: listing.updatedAt.getTime(),
    };
  }

  private getTaskContext(task: Task): { label: string | null; href: string } {
    if (task.appointmentId) {
      return {
        label: task.appointment?.title ?? null,
        href: `/dashboard/calendar/${task.appointmentId}`,
      };
    }

    if (task.clientId) {
      const clientName = task.client
        ? `${task.client.firstName} ${task.client.lastName}`.trim()
        : null;

      return {
        label: clientName || null,
        href: `/dashboard/clients/${task.clientId}`,
      };
    }

    if (task.listingId) {
      return {
        label: task.listing?.title ?? null,
        href: `/dashboard/listings/${task.listingId}`,
      };
    }

    return {
      label: null,
      href: '/dashboard/tasks',
    };
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

function getDocumentNotificationPriority(
  kind: ListingDocumentAttentionItem['kind'],
): number {
  const priorities: Record<ListingDocumentAttentionItem['kind'], number> = {
    overdue: 260,
    expired: 250,
    needs_correction: 230,
    missing_required: 170,
  };

  return priorities[kind];
}

function getDocumentNotificationMessage(item: ListingDocumentAttentionItem): {
  title: string;
  description: string;
} {
  const documentName = item.documentName ?? 'Dokument';

  if (item.kind === 'needs_correction') {
    return {
      title: 'Dokument wymaga poprawy',
      description: `${documentName} w ofercie "${item.listingTitle}" wymaga korekty.`,
    };
  }

  if (item.kind === 'overdue') {
    return {
      title: 'Termin dokumentu minął',
      description: `${documentName} w ofercie "${item.listingTitle}" jest po terminie.`,
    };
  }

  if (item.kind === 'expired') {
    return {
      title: 'Dokument stracił ważność',
      description: `${documentName} w ofercie "${item.listingTitle}" wymaga odświeżenia.`,
    };
  }

  return {
    title: 'Brak wymaganych dokumentów oferty',
    description: `Oferta "${item.listingTitle}" ma ${item.count} brakujące wymagane dokumenty.`,
  };
}

function maxDate(left: Date, right: Date): Date {
  return left.getTime() >= right.getTime() ? left : right;
}
