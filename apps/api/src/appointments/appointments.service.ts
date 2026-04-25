import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Agent } from '../users/entities/agent.entity';
import { UsersService } from '../users';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';

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

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly usersService: UsersService,
  ) {}

  // ── Create ──

  async create(
    userId: string,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    this.validateDateRange(dto.startTime, dto.endTime);

    const { agent } = await this.assertAppointmentCreateWithinPlanLimit(
      userId,
      dto.startTime,
    );

    const appointment = this.appointmentRepo.create({
      ...dto,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      agentId: agent.id,
    });

    const saved = await this.appointmentRepo.save(appointment);

    this.logger.log(
      `Appointment created: "${saved.title}" (${saved.id}) by agent ${agent.id}`,
    );

    return this.findOneOrFail(saved.id);
  }

  // ── Read (list with filters & pagination) ──

  async findAll(
    userId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResult<Appointment>> {
    const agent = await this.resolveAgent(userId);
    const {
      page = 1,
      limit = 50,
      sortBy = 'startTime',
      sortOrder = 'ASC',
      ...filters
    } = query;

    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.listing', 'listing')
      .where('appointment.agentId = :agentId', { agentId: agent.id });

    this.applyFilters(qb, filters);

    // Sorting
    const allowedSortColumns = ['startTime', 'createdAt', 'title'];
    const column = allowedSortColumns.includes(sortBy) ? sortBy : 'startTime';
    qb.orderBy(
      `appointment.${column}`,
      sortOrder === 'DESC' ? 'DESC' : 'ASC',
    );

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

  async findOne(id: string, userId: string): Promise<Appointment> {
    const appointment = await this.findOneOrFail(id);
    await this.assertOwnership(appointment, userId);
    return appointment;
  }

  // ── Update ──

  async update(
    id: string,
    userId: string,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const appointment = await this.findOneOrFail(id);
    await this.assertOwnership(appointment, userId);

    // Validate date range if either date is being changed
    const startTime = dto.startTime
      ? new Date(dto.startTime)
      : appointment.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : appointment.endTime;
    this.validateDateRange(startTime, endTime);

    const updateData: Partial<Appointment> = { ...dto } as Partial<Appointment>;
    if (dto.startTime) updateData.startTime = new Date(dto.startTime);
    if (dto.endTime) updateData.endTime = new Date(dto.endTime);

    Object.assign(appointment, updateData);
    await this.appointmentRepo.save(appointment);

    this.logger.log(`Appointment updated: ${id}`);

    return this.findOneOrFail(id);
  }

  // ── Delete ──

  async remove(id: string, userId: string): Promise<void> {
    const appointment = await this.findOneOrFail(id);
    await this.assertOwnership(appointment, userId);

    await this.appointmentRepo.remove(appointment);
    this.logger.log(`Appointment deleted: ${id}`);
  }

  // ── Private helpers ──

  private async resolveAgent(userId: string): Promise<Agent> {
    return this.usersService.resolveAgentForUser(userId);
  }

  private async assertAppointmentCreateWithinPlanLimit(
    userId: string,
    startTime: string,
  ): Promise<{ agent: Agent }> {
    const access = await this.usersService.getAgencyAccessContext(userId);
    const limit = access.entitlements.limits.monthlyAppointments;

    if (limit !== null) {
      const startDate = new Date(startTime);
      const periodStart = new Date(
        Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1),
      );
      const periodEnd = new Date(
        Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 1),
      );

      const currentUsage = await this.appointmentRepo
        .createQueryBuilder('appointment')
        .where('appointment.agentId IN (:...agentIds)', {
          agentIds: access.agencyAgentIds,
        })
        .andWhere('appointment.startTime >= :periodStart', { periodStart })
        .andWhere('appointment.startTime < :periodEnd', { periodEnd })
        .getCount();

      if (currentUsage >= limit) {
        throw new PlanLimitReachedException({
          resource: 'appointments',
          limit,
          currentUsage,
          planCode: access.entitlements.plan.code,
          message:
            'Osiągnięto miesięczny limit spotkań w Twoim planie. Przejdź na wyższy plan, aby zaplanować kolejne spotkanie.',
        });
      }
    }

    return { agent: access.agent };
  }

  private async findOneOrFail(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['client', 'listing'],
    });
    if (!appointment) {
      throw new NotFoundException('Spotkanie nie znalezione');
    }
    return appointment;
  }

  private async assertOwnership(
    appointment: Appointment,
    userId: string,
  ): Promise<void> {
    const agent = await this.resolveAgent(userId);
    if (appointment.agentId !== agent.id) {
      throw new ForbiddenException('Brak dostępu do tego spotkania');
    }
  }

  /** Validate that endTime is after startTime. */
  private validateDateRange(
    start: string | Date,
    end: string | Date,
  ): void {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'Data zakończenia musi być późniejsza niż data rozpoczęcia',
      );
    }
  }

  private applyFilters(
    qb: SelectQueryBuilder<Appointment>,
    filters: Omit<
      AppointmentQueryDto,
      'page' | 'limit' | 'sortBy' | 'sortOrder'
    >,
  ): void {
    if (filters.type) {
      qb.andWhere('appointment.type = :type', { type: filters.type });
    }

    if (filters.status) {
      qb.andWhere('appointment.status = :status', {
        status: filters.status,
      });
    }

    if (filters.clientId) {
      qb.andWhere('appointment.clientId = :clientId', {
        clientId: filters.clientId,
      });
    }

    if (filters.listingId) {
      qb.andWhere('appointment.listingId = :listingId', {
        listingId: filters.listingId,
      });
    }

    // Date range filtering — critical for calendar views
    if (filters.from) {
      qb.andWhere('appointment.startTime >= :from', {
        from: new Date(filters.from),
      });
    }

    if (filters.to) {
      qb.andWhere('appointment.startTime <= :to', {
        to: new Date(filters.to),
      });
    }

    if (filters.search) {
      qb.andWhere(
        '(LOWER(appointment.title) LIKE LOWER(:search) OR LOWER(appointment.location) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }
  }
}
