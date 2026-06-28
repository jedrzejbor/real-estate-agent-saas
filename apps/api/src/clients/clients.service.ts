import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { ActivityService } from '../activity';
import {
  ActivityTimelineItem,
  mapActivityHistoryToTimelineItem,
  toActivityIsoString,
} from '../activity/activity-timeline';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Client } from './entities/client.entity';
import { ClientNote } from './entities/client-note.entity';
import { ClientPreference } from './entities/client-preference.entity';
import { PublicLead } from '../public-leads/entities/public-lead.entity';
import { Task } from '../tasks/entities';
import { Agent } from '../users/entities/agent.entity';
import { Listing } from '../listings/entities/listing.entity';
import { AgencyLimitEnforcementService, UsersService } from '../users';
import {
  ActivityAction,
  ActivityEntityType,
  ListingStatus,
} from '../common/enums';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import { MonitoringService } from '../monitoring';
import {
  MatchingDismissal,
  MatchingService,
  type MatchingReason,
} from '../matching';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientActivityQueryDto } from './dto/client-activity-query.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { CreateClientNoteDto } from './dto/create-client-note.dto';
import { ImportClientsDto } from './dto/import-clients.dto';

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ImportClientsResult {
  imported: number;
  clients: Client[];
}

export type ClientActivityTimelineItemType =
  | 'activity'
  | 'note'
  | 'appointment'
  | 'task'
  | 'public_lead';

export type ClientActivityTimelineItem =
  ActivityTimelineItem<ClientActivityTimelineItemType>;

export type ClientActivityTimelineResult =
  PaginatedResult<ClientActivityTimelineItem>;

export interface MatchingListingSummary {
  id: string;
  title: string;
  propertyType: string;
  transactionType: string;
  price: number | string;
  currency: string;
  areaM2: number | string | null;
  rooms: number | null;
  address: {
    city: string | null;
    district: string | null;
  } | null;
}

export interface MatchingListingResult {
  listing: MatchingListingSummary;
  score: number;
  reasons: MatchingReason[];
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientNote)
    private readonly noteRepo: Repository<ClientNote>,
    @InjectRepository(ClientPreference)
    private readonly preferenceRepo: Repository<ClientPreference>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(PublicLead)
    private readonly publicLeadRepo: Repository<PublicLead>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly usersService: UsersService,
    private readonly agencyLimitEnforcementService: AgencyLimitEnforcementService,
    private readonly activityService: ActivityService,
    private readonly monitoringService: MonitoringService,
    private readonly matchingService: MatchingService,
    @Optional()
    @InjectRepository(MatchingDismissal)
    private readonly matchingDismissalRepo?: Repository<MatchingDismissal>,
  ) {}

  // ── Create ──

  async create(userId: string, dto: CreateClientDto): Promise<Client> {
    const { agent } = await this.assertClientCreateWithinPlanLimit(userId);

    const { preference: preferenceDto, ...clientData } = dto;

    const client = this.clientRepo.create({
      ...clientData,
      agentId: agent.id,
    });

    const savedClient = await this.clientRepo.save(client);

    // Create preference if provided
    if (preferenceDto) {
      const preference = this.preferenceRepo.create({
        ...preferenceDto,
        client: savedClient,
      });
      await this.preferenceRepo.save(preference);
    }

    this.logger.log(
      `Client created: "${savedClient.firstName} ${savedClient.lastName}" (${savedClient.id}) by agent ${agent.id}`,
    );

    const createdClient = await this.findOneOrFail(savedClient.id);

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.CLIENT,
      entityId: createdClient.id,
      action: ActivityAction.CREATED,
      description: 'Utworzono klienta',
    });

    return createdClient;
  }

  async importClients(
    userId: string,
    dto: ImportClientsDto,
  ): Promise<ImportClientsResult> {
    const { agent } = await this.assertClientBatchCreateWithinPlanLimit(
      userId,
      dto.rows.length,
    );

    const importedClients = await this.clientRepo.manager.transaction(
      async (manager) => {
        const clients: Client[] = [];

        for (const row of dto.rows) {
          const { preference: preferenceDto, ...clientData } = row;
          const client = manager.create(Client, {
            ...clientData,
            agentId: agent.id,
          });
          const savedClient = await manager.save(Client, client);

          if (preferenceDto) {
            const preference = manager.create(ClientPreference, {
              ...preferenceDto,
              client: savedClient,
            });
            await manager.save(ClientPreference, preference);
          }

          clients.push(savedClient);
        }

        return clients;
      },
    );

    for (const client of importedClients) {
      await this.activityService.log({
        userId,
        entityType: ActivityEntityType.CLIENT,
        entityId: client.id,
        action: ActivityAction.CREATED,
        description: 'Zaimportowano klienta z CSV',
      });
    }

    this.logger.log(
      `Imported ${importedClients.length} clients from CSV for agent ${agent.id}`,
    );

    const clients = await this.clientRepo.find({
      where: {
        id: In(importedClients.map((client) => client.id)),
      },
      relations: ['preference', 'clientNotes'],
    });

    return {
      imported: clients.length,
      clients,
    };
  }

  // ── Read (list with filters & pagination) ──

  async findAll(
    userId: string,
    query: ClientQueryDto,
  ): Promise<PaginatedResult<Client>> {
    const agent = await this.resolveAgent(userId);
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = query;

    const qb = this.clientRepo
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.preference', 'preference')
      .where('client.agentId = :agentId', { agentId: agent.id });

    this.applyFilters(qb, filters);

    // Sorting — only allow whitelisted columns
    const allowedSortColumns = ['createdAt', 'lastName', 'status'];
    const column = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`client.${column}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Read (single) ──

  async findOne(id: string, userId: string): Promise<Client> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);
    return client;
  }

  async findMatchingListings(
    id: string,
    userId: string,
  ): Promise<MatchingListingResult[]> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);
    const dismissedListingIds = await this.findDismissedListingIds(
      client.agentId,
      client.id,
    );

    const listings = await this.listingRepo.find({
      where: {
        agentId: client.agentId,
        status: ListingStatus.ACTIVE,
      },
      relations: ['address'],
    });

    return listings
      .filter((listing) => !dismissedListingIds.has(listing.id))
      .map((listing) => ({
        listing: this.toMatchingListingSummary(listing),
        match: this.matchingService.scoreClientListingMatch(client, listing),
      }))
      .filter((item) => !item.match.isExcluded)
      .sort((left, right) => right.match.score - left.match.score)
      .slice(0, 10)
      .map((item) => ({
        listing: item.listing,
        score: item.match.score,
        reasons: item.match.reasons.slice(0, 3),
      }));
  }

  async dismissMatchingListing(
    id: string,
    listingId: string,
    userId: string,
  ): Promise<void> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);

    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
    });
    if (!listing) {
      throw new NotFoundException('Oferta nie znaleziona');
    }
    if (listing.agentId !== client.agentId) {
      throw new ForbiddenException('Brak dostępu do tej oferty');
    }

    await this.upsertMatchingDismissal(client.agentId, client.id, listing.id);
  }

  async findHistory(id: string, userId: string) {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);

    return this.activityService.findEntityHistory(
      userId,
      ActivityEntityType.CLIENT,
      id,
    );
  }

  async findActivity(
    id: string,
    userId: string,
    query: ClientActivityQueryDto,
  ): Promise<ClientActivityTimelineResult> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);

    const agent = await this.resolveAgent(userId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const sourceLimit = Math.max(page * limit, 100);

    const [history, notes, appointments, tasks, publicLeads] =
      await Promise.all([
        this.activityService.findEntityHistory(
          userId,
          ActivityEntityType.CLIENT,
          id,
        ),
        this.noteRepo.find({
          where: { client: { id }, agent: { id: agent.id } },
          order: { createdAt: 'DESC' },
          take: sourceLimit,
        }),
        this.appointmentRepo.find({
          where: { agentId: agent.id, clientId: id },
          relations: ['listing'],
          order: { startTime: 'DESC' },
          take: sourceLimit,
        }),
        this.taskRepo.find({
          where: { agentId: agent.id, clientId: id },
          relations: ['appointment', 'listing'],
          order: { createdAt: 'DESC' },
          take: sourceLimit,
        }),
        this.publicLeadRepo.find({
          where: { agentId: agent.id, convertedClientId: id },
          relations: ['listing'],
          order: { createdAt: 'DESC' },
          take: sourceLimit,
        }),
      ]);

    const items = [
      ...history.map((item) => this.mapHistoryToTimelineItem(item)),
      ...notes.map((note) => this.mapNoteToTimelineItem(note)),
      ...appointments.map((appointment) =>
        this.mapAppointmentToTimelineItem(appointment),
      ),
      ...tasks.map((task) => this.mapTaskToTimelineItem(task)),
      ...publicLeads.map((lead) => this.mapPublicLeadToTimelineItem(lead)),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = items.length;
    const offset = (page - 1) * limit;

    return {
      data: items.slice(offset, offset + limit),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async rollbackStatus(id: string, userId: string): Promise<Client> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);

    const latestStatusChange =
      await this.activityService.findLatestStatusChange(
        userId,
        ActivityEntityType.CLIENT,
        id,
      );

    if (!latestStatusChange) {
      throw new BadRequestException('Brak zmiany statusu do cofnięcia');
    }

    const statusChange = latestStatusChange.changes.find(
      (change) => change.field === 'status',
    );

    if (
      !statusChange ||
      typeof statusChange.oldValue !== 'string' ||
      typeof statusChange.newValue !== 'string'
    ) {
      throw new BadRequestException('Nieprawidłowy wpis historii statusu');
    }

    if (client.status !== statusChange.newValue) {
      throw new BadRequestException(
        'Nie można cofnąć statusu, ponieważ bieżący status nie odpowiada ostatniej zmianie statusu',
      );
    }

    const previousState = this.createClientSnapshot(client);
    client.status = statusChange.oldValue as Client['status'];
    await this.clientRepo.save(client);

    const updatedClient = await this.findOneOrFail(id);
    const changes = this.activityService.buildChanges(
      previousState,
      this.createClientSnapshot(updatedClient),
    );

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.CLIENT,
      entityId: updatedClient.id,
      action: ActivityAction.STATUS_ROLLED_BACK,
      description: 'Cofnięto status klienta',
      changes,
    });

    return updatedClient;
  }

  // ── Update ──

  async update(
    id: string,
    userId: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);
    const previousState = this.createClientSnapshot(client);

    const { preference: preferenceDto, ...clientData } = dto;

    // Merge client fields
    Object.assign(client, clientData);
    await this.clientRepo.save(client);

    // Update or create preference if provided
    if (preferenceDto) {
      if (client.preference) {
        Object.assign(client.preference, preferenceDto);
        await this.preferenceRepo.save(client.preference);
      } else {
        const preference = this.preferenceRepo.create({
          ...preferenceDto,
          client: { id: client.id } as Client,
        });
        await this.preferenceRepo.save(preference);
      }
    }

    this.logger.log(`Client updated: ${id}`);

    const updatedClient = await this.findOneOrFail(id);
    const nextState = this.createClientSnapshot(updatedClient);
    const changes = this.activityService.buildChanges(previousState, nextState);

    if (changes.length > 0) {
      const isStatusOnlyChange =
        changes.length === 1 && changes[0].field === 'status';

      await this.activityService.log({
        userId,
        entityType: ActivityEntityType.CLIENT,
        entityId: updatedClient.id,
        action: isStatusOnlyChange
          ? ActivityAction.STATUS_CHANGED
          : ActivityAction.UPDATED,
        description: isStatusOnlyChange
          ? 'Zmieniono status klienta'
          : 'Zaktualizowano klienta',
        changes,
      });
    }

    return updatedClient;
  }

  // ── Delete ──

  async remove(id: string, userId: string): Promise<void> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.CLIENT,
      entityId: client.id,
      action: ActivityAction.DELETED,
      description: 'Usunięto klienta',
    });

    await this.clientRepo.remove(client);
    this.logger.log(`Client deleted: ${id}`);
  }

  // ── Notes ──

  async findNotes(clientId: string, userId: string): Promise<ClientNote[]> {
    const client = await this.findOneOrFail(clientId);
    await this.assertOwnership(client, userId);

    return this.noteRepo.find({
      where: { client: { id: clientId } },
      order: { createdAt: 'DESC' },
    });
  }

  async addNote(
    clientId: string,
    userId: string,
    dto: CreateClientNoteDto,
  ): Promise<ClientNote> {
    const client = await this.findOneOrFail(clientId);
    await this.assertOwnership(client, userId);

    const agent = await this.resolveAgent(userId);

    const note = this.noteRepo.create({
      content: dto.content,
      client: { id: clientId } as Client,
      agent: agent,
    });

    const saved = await this.noteRepo.save(note);

    this.logger.log(`Note added to client ${clientId} by agent ${agent.id}`);

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.CLIENT,
      entityId: clientId,
      action: ActivityAction.NOTE_ADDED,
      description: 'Dodano notatkę klienta',
    });

    return saved;
  }

  async removeNote(
    clientId: string,
    noteId: string,
    userId: string,
  ): Promise<void> {
    const client = await this.findOneOrFail(clientId);
    await this.assertOwnership(client, userId);

    const note = await this.noteRepo.findOne({
      where: { id: noteId, client: { id: clientId } },
    });
    if (!note) {
      throw new NotFoundException('Notatka nie znaleziona');
    }

    await this.noteRepo.remove(note);
    this.logger.log(`Note ${noteId} removed from client ${clientId}`);

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.CLIENT,
      entityId: clientId,
      action: ActivityAction.NOTE_REMOVED,
      description: 'Usunięto notatkę klienta',
    });
  }

  // ── Private helpers ──

  /** Resolve the Agent entity from a User id. */
  private async resolveAgent(userId: string): Promise<Agent> {
    return this.usersService.resolveAgentForUser(userId);
  }

  private async assertClientCreateWithinPlanLimit(
    userId: string,
  ): Promise<{ agent: Agent }> {
    const access = await this.usersService.getAgencyAccessContext(userId);
    await this.assertClientUsageWithinPlanLimit(access, 1);
    return { agent: access.agent };
  }

  private async assertClientBatchCreateWithinPlanLimit(
    userId: string,
    requestedCount: number,
  ): Promise<{ agent: Agent }> {
    if (requestedCount < 1) {
      throw new BadRequestException(
        'Import musi zawierać co najmniej jeden wiersz',
      );
    }

    const access = await this.usersService.getAgencyAccessContext(userId);
    await this.assertClientUsageWithinPlanLimit(access, requestedCount);
    return { agent: access.agent };
  }

  private async assertClientUsageWithinPlanLimit(
    access: Awaited<ReturnType<UsersService['getAgencyAccessContext']>>,
    addedUsage: number,
  ): Promise<void> {
    const currentUsage = await this.clientRepo.count({
      where: {
        agentId: In(access.agencyAgentIds),
      },
    });
    const attemptedUsage = currentUsage + addedUsage;
    const limitState = this.agencyLimitEnforcementService.evaluateResourceLimit(
      access.entitlements,
      'clients',
      attemptedUsage,
    );

    if (limitState.isOverLimit && limitState.limit !== null) {
      this.monitoringService.recordWarning(
        'plan_limit_enforcement',
        'plan_limit_resource_blocked',
        {
          agencyId: access.agency.id,
          resource: 'clients',
          planCode: access.entitlements.plan.code,
          limit: limitState.limit,
          currentUsage,
          attemptedUsage,
          addedUsage,
        },
      );
      throw new PlanLimitReachedException({
        resource: 'clients',
        limit: limitState.limit,
        currentUsage,
        attemptedUsage,
        planCode: access.entitlements.plan.code,
        message:
          addedUsage > 1
            ? 'Import przekroczyłby limit klientów w Twoim planie. Zmniejsz liczbę wierszy albo przejdź na wyższy plan.'
            : 'Osiągnięto limit klientów w Twoim planie. Przejdź na wyższy plan, aby dodać kolejnego klienta.',
      });
    }
  }

  /** Find client by id with relations, or throw. */
  private async findOneOrFail(id: string): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id },
      relations: ['preference', 'clientNotes'],
    });
    if (!client) {
      throw new NotFoundException('Klient nie znaleziony');
    }
    return client;
  }

  /** Verify the client belongs to the current user's agent profile. */
  private async assertOwnership(client: Client, userId: string): Promise<void> {
    const agent = await this.resolveAgent(userId);
    if (client.agentId !== agent.id) {
      throw new ForbiddenException('Brak dostępu do tego klienta');
    }
  }

  private mapHistoryToTimelineItem(
    item: Awaited<ReturnType<ActivityService['findEntityHistory']>>[number],
  ): ClientActivityTimelineItem {
    return mapActivityHistoryToTimelineItem(item, 'activity');
  }

  private mapNoteToTimelineItem(note: ClientNote): ClientActivityTimelineItem {
    return {
      id: `note:${note.id}`,
      type: 'note',
      title: 'Notatka',
      description: note.content,
      createdAt: toActivityIsoString(note.createdAt),
      actor: null,
      metadata: { noteId: note.id },
      href: null,
    };
  }

  private mapAppointmentToTimelineItem(
    appointment: Appointment,
  ): ClientActivityTimelineItem {
    return {
      id: `appointment:${appointment.id}`,
      type: 'appointment',
      title: appointment.title,
      description: [
        `Status: ${appointment.status}`,
        `Typ: ${appointment.type}`,
        appointment.listing?.title
          ? `Oferta: ${appointment.listing.title}`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      createdAt: toActivityIsoString(appointment.startTime),
      actor: null,
      metadata: {
        appointmentId: appointment.id,
        status: appointment.status,
        type: appointment.type,
        location: appointment.location,
        listingId: appointment.listingId,
      },
      href: `/dashboard/calendar/${appointment.id}`,
    };
  }

  private mapTaskToTimelineItem(task: Task): ClientActivityTimelineItem {
    const eventDate = task.completedAt ?? task.dueAt ?? task.createdAt;

    return {
      id: `task:${task.id}`,
      type: 'task',
      title: task.title,
      description:
        task.description ||
        [
          `Status: ${task.status}`,
          task.listing?.title ? `Oferta: ${task.listing.title}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      createdAt: toActivityIsoString(eventDate),
      actor: null,
      metadata: {
        taskId: task.id,
        status: task.status,
        priority: task.priority,
        type: task.type,
        appointmentId: task.appointmentId,
        listingId: task.listingId,
      },
      href: task.appointmentId
        ? `/dashboard/calendar/${task.appointmentId}`
        : task.listingId
          ? `/dashboard/listings/${task.listingId}`
          : null,
    };
  }

  private mapPublicLeadToTimelineItem(
    lead: PublicLead,
  ): ClientActivityTimelineItem {
    return {
      id: `public-lead:${lead.id}`,
      type: 'public_lead',
      title: `Zapytanie publiczne: ${lead.fullName}`,
      description:
        lead.message ||
        (lead.listing?.title ? `Oferta: ${lead.listing.title}` : null),
      createdAt: toActivityIsoString(lead.createdAt),
      actor: null,
      metadata: {
        leadId: lead.id,
        status: lead.status,
        source: lead.source,
        listingId: lead.listingId,
      },
      href: '/dashboard/inquiries',
    };
  }

  private toMatchingListingSummary(listing: Listing): MatchingListingSummary {
    return {
      id: listing.id,
      title: listing.title,
      propertyType: listing.propertyType,
      transactionType: listing.transactionType,
      price: listing.price,
      currency: listing.currency,
      areaM2: listing.areaM2 ?? null,
      rooms: listing.rooms ?? null,
      address: listing.address
        ? {
            city: listing.address.city ?? null,
            district: listing.address.district ?? null,
          }
        : null,
    };
  }

  private async findDismissedListingIds(
    agentId: string,
    clientId: string,
  ): Promise<Set<string>> {
    if (!this.matchingDismissalRepo) return new Set();

    const dismissals = await this.matchingDismissalRepo.find({
      where: { agentId, clientId },
      select: ['listingId'],
    });

    return new Set(dismissals.map((dismissal) => dismissal.listingId));
  }

  private async upsertMatchingDismissal(
    agentId: string,
    clientId: string,
    listingId: string,
  ): Promise<void> {
    if (!this.matchingDismissalRepo) {
      throw new Error('Matching dismissal repository is not configured');
    }

    const existing = await this.matchingDismissalRepo.findOne({
      where: { agentId, clientId, listingId },
    });
    if (existing) return;

    await this.matchingDismissalRepo.save(
      this.matchingDismissalRepo.create({
        agentId,
        clientId,
        listingId,
      }),
    );
  }

  /** Apply optional filters to the query builder. */
  private applyFilters(
    qb: SelectQueryBuilder<Client>,
    filters: Omit<ClientQueryDto, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
  ): void {
    if (filters.source) {
      qb.andWhere('client.source = :source', { source: filters.source });
    }

    if (filters.status) {
      qb.andWhere('client.status = :status', { status: filters.status });
    }

    if (filters.budgetMin !== undefined) {
      qb.andWhere('client.budgetMax >= :budgetMin', {
        budgetMin: filters.budgetMin,
      });
    }

    if (filters.budgetMax !== undefined) {
      qb.andWhere('client.budgetMin <= :budgetMax', {
        budgetMax: filters.budgetMax,
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(LOWER(client.firstName) LIKE LOWER(:search) OR LOWER(client.lastName) LIKE LOWER(:search) OR LOWER(client.email) LIKE LOWER(:search) OR LOWER(client.phone) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }
  }

  private createClientSnapshot(client: Client): Record<string, unknown> {
    return {
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email ?? null,
      phone: client.phone ?? null,
      source: client.source,
      status: client.status,
      budgetMin: client.budgetMin ?? null,
      budgetMax: client.budgetMax ?? null,
      notes: client.notes ?? null,
      'preference.propertyType': client.preference?.propertyType ?? null,
      'preference.minArea': client.preference?.minArea ?? null,
      'preference.maxPrice': client.preference?.maxPrice ?? null,
      'preference.preferredCity': client.preference?.preferredCity ?? null,
      'preference.minRooms': client.preference?.minRooms ?? null,
    };
  }
}
