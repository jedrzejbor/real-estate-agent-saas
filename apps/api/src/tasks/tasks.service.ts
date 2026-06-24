import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import {
  TaskPriority,
  TaskRelatedEntityType,
  TaskStatus,
  TaskType,
} from '../common/enums';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Client } from '../clients/entities/client.entity';
import { Listing } from '../listings/entities/listing.entity';
import { UsersService } from '../users';
import { CreateTaskDto, TaskQueryDto, UpdateTaskDto } from './dto';
import { Task } from './entities';

export interface PaginatedTasksResult {
  data: Task[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AppointmentFollowUpInput {
  title?: string;
  description?: string | null;
  dueAt?: string | Date | null;
}

type TaskRelationIds = Pick<
  Task,
  | 'appointmentId'
  | 'clientId'
  | 'listingId'
  | 'relatedEntityType'
  | 'relatedEntityId'
>;

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    userId: string,
    query: TaskQueryDto,
  ): Promise<PaginatedTasksResult> {
    const agent = await this.usersService.resolveAgentForUser(userId);
    const {
      page = 1,
      limit = 50,
      sortBy = 'dueAt',
      sortOrder = 'ASC',
      ...filters
    } = query;

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.appointment', 'appointment')
      .leftJoinAndSelect('task.client', 'client')
      .leftJoinAndSelect('task.listing', 'listing')
      .where('task.agentId = :agentId', { agentId: agent.id });

    this.applyFilters(qb, filters);

    const allowedSortColumns = ['dueAt', 'createdAt', 'updatedAt', 'title'];
    const column = allowedSortColumns.includes(sortBy) ? sortBy : 'dueAt';
    qb.orderBy(
      `task.${column}`,
      sortOrder === 'DESC' ? 'DESC' : 'ASC',
      column === 'dueAt' ? 'NULLS LAST' : undefined,
    );
    qb.addOrderBy('task.createdAt', 'ASC');
    qb.skip((page - 1) * limit).take(limit);

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

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    const agent = await this.usersService.resolveAgentForUser(userId);
    const status = dto.status ?? TaskStatus.TODO;
    const relationIds = await this.normalizeAndAssertRelations(agent.id, dto);

    const task = this.taskRepo.create({
      title: this.normalizeTitle(dto.title),
      description: normalizeNullableText(dto.description),
      status,
      priority: dto.priority ?? TaskPriority.NORMAL,
      type: dto.type ?? TaskType.OTHER,
      dueAt: parseOptionalDate(dto.dueAt),
      completedAt: status === TaskStatus.DONE ? new Date() : null,
      agentId: agent.id,
      ...relationIds,
    });

    return this.taskRepo.save(task);
  }

  async createAppointmentFollowUp(
    userId: string,
    appointmentId: string,
    input: AppointmentFollowUpInput = {},
  ): Promise<Task> {
    const agent = await this.usersService.resolveAgentForUser(userId);
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId, agentId: agent.id },
      relations: ['client', 'listing'],
    });

    if (!appointment) {
      throw new NotFoundException('Nie znaleziono powiązanego spotkania');
    }

    const existing = await this.findOpenAppointmentFollowUp(
      agent.id,
      appointment.id,
    );
    if (existing) {
      return existing;
    }

    const task = this.taskRepo.create({
      agentId: agent.id,
      title: this.normalizeTitle(
        input.title ?? `Follow-up: ${appointment.title}`,
      ),
      description:
        normalizeNullableText(input.description) ??
        'Skontaktuj się z klientem po spotkaniu i zapisz kolejny krok.',
      status: TaskStatus.TODO,
      priority: TaskPriority.NORMAL,
      type: TaskType.FOLLOW_UP,
      dueAt:
        parseOptionalDate(input.dueAt) ?? getDefaultFollowUpDueAt(appointment),
      completedAt: null,
      appointmentId: appointment.id,
      clientId: appointment.clientId ?? null,
      listingId: appointment.listingId ?? null,
      relatedEntityType: TaskRelatedEntityType.APPOINTMENT,
      relatedEntityId: appointment.id,
    });

    return this.taskRepo.save(task);
  }

  async update(id: string, userId: string, dto: UpdateTaskDto): Promise<Task> {
    const agent = await this.usersService.resolveAgentForUser(userId);
    const task = await this.taskRepo.findOne({
      where: { id, agentId: agent.id },
    });

    if (!task) {
      throw new NotFoundException('Nie znaleziono zadania');
    }

    if (dto.title !== undefined) task.title = this.normalizeTitle(dto.title);
    if (dto.description !== undefined) {
      task.description = normalizeNullableText(dto.description);
    }
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.type !== undefined) task.type = dto.type;
    if (dto.dueAt !== undefined) task.dueAt = parseOptionalDate(dto.dueAt);
    if (hasRelationUpdate(dto)) {
      Object.assign(
        task,
        await this.normalizeAndAssertRelations(agent.id, {
          appointmentId: dto.appointmentId,
          clientId: dto.clientId,
          listingId: dto.listingId,
          relatedEntityId: dto.relatedEntityId,
          relatedEntityType: dto.relatedEntityType,
        }),
      );
    }
    if (dto.status !== undefined) {
      task.status = dto.status;
      task.completedAt =
        dto.status === TaskStatus.DONE
          ? (task.completedAt ?? new Date())
          : null;
    }

    return this.taskRepo.save(task);
  }

  private findOpenAppointmentFollowUp(
    agentId: string,
    appointmentId: string,
  ): Promise<Task | null> {
    return this.taskRepo.findOne({
      where: {
        agentId,
        appointmentId,
        type: TaskType.FOLLOW_UP,
        status: TaskStatus.TODO,
      },
    });
  }

  private async normalizeAndAssertRelations(
    agentId: string,
    dto: Partial<
      Pick<
        CreateTaskDto,
        | 'appointmentId'
        | 'clientId'
        | 'listingId'
        | 'relatedEntityType'
        | 'relatedEntityId'
      >
    >,
  ): Promise<TaskRelationIds> {
    const relationIds: TaskRelationIds = {
      appointmentId: normalizeNullableUuid(dto.appointmentId),
      clientId: normalizeNullableUuid(dto.clientId),
      listingId: normalizeNullableUuid(dto.listingId),
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: normalizeNullableUuid(dto.relatedEntityId),
    };

    if (relationIds.appointmentId) {
      await this.assertAppointmentOwned(relationIds.appointmentId, agentId);
    }
    if (relationIds.clientId) {
      await this.assertClientOwned(relationIds.clientId, agentId);
    }
    if (relationIds.listingId) {
      await this.assertListingOwned(relationIds.listingId, agentId);
    }

    if (!relationIds.relatedEntityType && !relationIds.relatedEntityId) {
      return this.inferRelatedEntity(relationIds);
    }

    if (!relationIds.relatedEntityType || !relationIds.relatedEntityId) {
      throw new BadRequestException(
        'Typ i ID powiązanej encji muszą być podane razem',
      );
    }

    await this.assertRelatedEntityOwned(
      relationIds.relatedEntityType,
      relationIds.relatedEntityId,
      agentId,
    );

    return relationIds;
  }

  private inferRelatedEntity(relationIds: TaskRelationIds): TaskRelationIds {
    if (relationIds.appointmentId) {
      return {
        ...relationIds,
        relatedEntityType: TaskRelatedEntityType.APPOINTMENT,
        relatedEntityId: relationIds.appointmentId,
      };
    }
    if (relationIds.clientId) {
      return {
        ...relationIds,
        relatedEntityType: TaskRelatedEntityType.CLIENT,
        relatedEntityId: relationIds.clientId,
      };
    }
    if (relationIds.listingId) {
      return {
        ...relationIds,
        relatedEntityType: TaskRelatedEntityType.LISTING,
        relatedEntityId: relationIds.listingId,
      };
    }

    return relationIds;
  }

  private assertRelatedEntityOwned(
    type: TaskRelatedEntityType,
    id: string,
    agentId: string,
  ): Promise<void> {
    if (type === TaskRelatedEntityType.APPOINTMENT) {
      return this.assertAppointmentOwned(id, agentId);
    }
    if (type === TaskRelatedEntityType.CLIENT) {
      return this.assertClientOwned(id, agentId);
    }
    return this.assertListingOwned(id, agentId);
  }

  private async assertAppointmentOwned(
    id: string,
    agentId: string,
  ): Promise<void> {
    const exists = await this.appointmentRepo.exist({ where: { id, agentId } });
    if (!exists) {
      throw new NotFoundException('Nie znaleziono powiązanego spotkania');
    }
  }

  private async assertClientOwned(id: string, agentId: string): Promise<void> {
    const exists = await this.clientRepo.exist({ where: { id, agentId } });
    if (!exists) {
      throw new NotFoundException('Nie znaleziono powiązanego klienta');
    }
  }

  private async assertListingOwned(id: string, agentId: string): Promise<void> {
    const exists = await this.listingRepo.exist({ where: { id, agentId } });
    if (!exists) {
      throw new NotFoundException('Nie znaleziono powiązanej oferty');
    }
  }

  private normalizeTitle(title: string): string {
    const value = title.trim();
    if (!value) {
      throw new BadRequestException('Tytuł zadania jest wymagany');
    }
    return value;
  }

  private applyFilters(
    qb: SelectQueryBuilder<Task>,
    filters: Omit<TaskQueryDto, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
  ): void {
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      qb.andWhere('task.priority = :priority', { priority: filters.priority });
    }
    if (filters.type) {
      qb.andWhere('task.type = :type', { type: filters.type });
    }
    if (filters.relatedEntityType) {
      qb.andWhere('task.relatedEntityType = :relatedEntityType', {
        relatedEntityType: filters.relatedEntityType,
      });
    }
    if (filters.relatedEntityId) {
      qb.andWhere('task.relatedEntityId = :relatedEntityId', {
        relatedEntityId: filters.relatedEntityId,
      });
    }
    if (filters.appointmentId) {
      qb.andWhere('task.appointmentId = :appointmentId', {
        appointmentId: filters.appointmentId,
      });
    }
    if (filters.clientId) {
      qb.andWhere('task.clientId = :clientId', { clientId: filters.clientId });
    }
    if (filters.listingId) {
      qb.andWhere('task.listingId = :listingId', {
        listingId: filters.listingId,
      });
    }
    if (filters.dueFrom) {
      qb.andWhere('task.dueAt >= :dueFrom', {
        dueFrom: new Date(filters.dueFrom),
      });
    }
    if (filters.dueTo) {
      qb.andWhere('task.dueAt <= :dueTo', {
        dueTo: new Date(filters.dueTo),
      });
    }
    if (filters.search) {
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('LOWER(task.title) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            })
            .orWhere('LOWER(task.description) LIKE LOWER(:search)', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }
  }
}

function hasRelationUpdate(dto: UpdateTaskDto): boolean {
  return (
    dto.appointmentId !== undefined ||
    dto.clientId !== undefined ||
    dto.listingId !== undefined ||
    dto.relatedEntityType !== undefined ||
    dto.relatedEntityId !== undefined
  );
}

function normalizeNullableText(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableUuid(
  value: string | null | undefined,
): string | null {
  return value ?? null;
}

function parseOptionalDate(
  value: string | Date | null | undefined,
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}

function getDefaultFollowUpDueAt(appointment: Appointment): Date {
  const baseDate = appointment.endTime ?? appointment.startTime ?? new Date();
  const dueAt = new Date(baseDate);
  dueAt.setUTCDate(dueAt.getUTCDate() + 1);

  if (dueAt.getUTCDay() === 6) {
    dueAt.setUTCDate(dueAt.getUTCDate() + 2);
  } else if (dueAt.getUTCDay() === 0) {
    dueAt.setUTCDate(dueAt.getUTCDate() + 1);
  }

  return dueAt;
}
