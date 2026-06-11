import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import {
  ListingCommissionType,
  TransactionEventType,
  TransactionStatus,
  TransactionTaskPriority,
  TransactionTaskStatus,
} from '../common/enums';
import { Client } from '../clients/entities/client.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities/agent.entity';
import {
  CreateTransactionDto,
  CreateTransactionTaskDto,
  TransactionQueryDto,
  UpdateTransactionDto,
  UpdateTransactionStatusDto,
  UpdateTransactionTaskDto,
} from './dto';
import { Transaction, TransactionEvent, TransactionTask } from './entities';
import {
  calculateTransactionCommissionAmount,
  normalizeTransactionCommissionInput,
  parseMoneyLikeValue,
} from './transaction-commission';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const CLOSED_TRANSACTION_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.CLOSED_WON,
  TransactionStatus.CLOSED_LOST,
]);

const DEFAULT_TASKS: Array<{
  title: string;
  priority: TransactionTaskPriority;
}> = [
  {
    title: 'Potwierdź dane stron transakcji',
    priority: TransactionTaskPriority.NORMAL,
  },
  {
    title: 'Zweryfikuj komplet dokumentów oferty',
    priority: TransactionTaskPriority.HIGH,
  },
  {
    title: 'Potwierdź cenę i warunki transakcji',
    priority: TransactionTaskPriority.NORMAL,
  },
];

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(TransactionTask)
    private readonly taskRepo: Repository<TransactionTask>,
    @InjectRepository(TransactionEvent)
    private readonly eventRepo: Repository<TransactionEvent>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    const agent = await this.resolveAgent(userId);
    const listing = await this.findOwnedListing(dto.listingId, agent.id);
    const buyerClient = await this.findOwnedClient(dto.buyerClientId, agent.id);
    const sellerClient = dto.sellerClientId
      ? await this.findOwnedClient(dto.sellerClientId, agent.id)
      : null;

    if (sellerClient && sellerClient.id === buyerClient.id) {
      throw new BadRequestException(
        'Kupujący/najemca i właściciel nie mogą być tym samym klientem',
      );
    }

    await this.assertNoActiveTransactionForListing(listing.id, agent.id);

    const status = dto.status ?? TransactionStatus.LEAD_OFFER;
    this.assertStatusPayload(status, dto.lostReason);

    const dealValue =
      parseMoneyLikeValue(dto.dealValue, 'Wartość transakcji') ??
      parseMoneyLikeValue(listing.price, 'Cena oferty') ??
      0;
    const commission = normalizeTransactionCommissionInput({
      commissionType: dto.commissionType ?? listing.commissionType ?? null,
      commissionValue: dto.commissionValue ?? listing.commissionValue ?? null,
    });

    const transaction = this.transactionRepo.create({
      agentId: agent.id,
      listingId: listing.id,
      buyerClientId: buyerClient.id,
      sellerClientId: sellerClient?.id ?? null,
      status,
      title: dto.title?.trim() || listing.title,
      dealValue,
      currency: normalizeCurrency(dto.currency ?? listing.currency),
      commissionType: commission.commissionType ?? null,
      commissionValue: commission.commissionValue ?? null,
      expectedCloseDate: parseOptionalDate(dto.expectedCloseDate),
      reservationExpiresAt: parseOptionalDate(dto.reservationExpiresAt),
      preliminaryAgreementDate: parseOptionalDate(dto.preliminaryAgreementDate),
      financingDeadline: parseOptionalDate(dto.financingDeadline),
      notaryDate: parseOptionalDate(dto.notaryDate),
      handoverDate: parseOptionalDate(dto.handoverDate),
      commissionDueDate: parseOptionalDate(dto.commissionDueDate),
      closedAt: status === TransactionStatus.CLOSED_WON ? new Date() : null,
      lostReason:
        status === TransactionStatus.CLOSED_LOST
          ? normalizeNullableText(dto.lostReason)
          : null,
      blockerNote: normalizeNullableText(dto.blockerNote),
      privateNote: normalizeNullableText(dto.privateNote),
    });

    const saved = await this.transactionRepo.manager.transaction(
      async (manager) => {
        const savedTransaction = await manager.save(Transaction, transaction);
        const tasks = DEFAULT_TASKS.map((task) =>
          manager.create(TransactionTask, {
            ...task,
            transactionId: savedTransaction.id,
            agentId: agent.id,
            status: TransactionTaskStatus.TODO,
          }),
        );
        await manager.save(TransactionTask, tasks);
        await manager.save(
          TransactionEvent,
          this.eventRepo.create({
            transactionId: savedTransaction.id,
            agentId: agent.id,
            actorUserId: userId,
            type: TransactionEventType.CREATED,
            metadata: {
              status: savedTransaction.status,
              listingId: savedTransaction.listingId,
              buyerClientId: savedTransaction.buyerClientId,
            },
          }),
        );
        return savedTransaction;
      },
    );

    this.logger.log(
      `Transaction created: "${saved.title}" (${saved.id}) by agent ${agent.id}`,
    );

    return this.findOne(saved.id, userId);
  }

  async findAll(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<PaginatedResult<Transaction>> {
    const agent = await this.resolveAgent(userId);
    const {
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'DESC',
      ...filters
    } = query;

    const qb = this.baseTransactionQuery()
      .where('transaction.agentId = :agentId', { agentId: agent.id })
      .loadRelationCountAndMap(
        'transaction.openTasksCount',
        'transaction.tasks',
        'openTask',
        (taskQb) =>
          taskQb.where('openTask.status = :taskStatus', {
            taskStatus: TransactionTaskStatus.TODO,
          }),
      );

    this.applyFilters(qb, filters);

    const allowedSortColumns = [
      'createdAt',
      'updatedAt',
      'expectedCloseDate',
      'dealValue',
    ];
    const column = allowedSortColumns.includes(sortBy) ? sortBy : 'updatedAt';
    qb.orderBy(`transaction.${column}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((transaction) => this.withDerivedFields(transaction)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string): Promise<Transaction> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.baseTransactionQuery()
      .leftJoinAndSelect('transaction.tasks', 'tasks')
      .where('transaction.id = :id', { id })
      .andWhere('transaction.agentId = :agentId', { agentId: agent.id })
      .orderBy('tasks.createdAt', 'ASC')
      .getOne();

    if (!transaction) {
      throw new NotFoundException('Nie znaleziono transakcji');
    }

    return this.withDerivedFields(transaction);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);

    if (dto.buyerClientId) {
      await this.findOwnedClient(dto.buyerClientId, agent.id);
      transaction.buyerClientId = dto.buyerClientId;
    }

    if (Object.prototype.hasOwnProperty.call(dto, 'sellerClientId')) {
      transaction.sellerClientId = dto.sellerClientId
        ? (await this.findOwnedClient(dto.sellerClientId, agent.id)).id
        : null;
    }

    if (
      transaction.sellerClientId &&
      transaction.sellerClientId === transaction.buyerClientId
    ) {
      throw new BadRequestException(
        'Kupujący/najemca i właściciel nie mogą być tym samym klientem',
      );
    }

    const previous = this.createTransactionSnapshot(transaction);

    if (dto.status) {
      this.applyStatus(transaction, dto.status, dto.lostReason);
    }

    if (dto.title !== undefined) {
      transaction.title = dto.title.trim();
    }

    if (dto.dealValue !== undefined) {
      transaction.dealValue =
        parseMoneyLikeValue(dto.dealValue, 'Wartość transakcji') ?? 0;
    }

    if (dto.currency !== undefined) {
      transaction.currency = normalizeCurrency(dto.currency);
    }

    const commission = normalizeTransactionCommissionInput(dto, {
      current: transaction,
      partial: true,
    });
    if (Object.keys(commission).length > 0) {
      transaction.commissionType = commission.commissionType ?? null;
      transaction.commissionValue = commission.commissionValue ?? null;
    }

    this.applyDateUpdates(transaction, dto);
    this.applyTextUpdates(transaction, dto);

    const saved = await this.transactionRepo.save(transaction);
    await this.logEvent(userId, saved, TransactionEventType.DETAILS_UPDATED, {
      previous,
      next: this.createTransactionSnapshot(saved),
    });

    return this.findOne(id, userId);
  }

  async updateStatus(
    id: string,
    userId: string,
    dto: UpdateTransactionStatusDto,
  ): Promise<Transaction> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);
    const previousStatus = transaction.status;

    this.applyStatus(transaction, dto.status, dto.lostReason);
    const saved = await this.transactionRepo.save(transaction);

    await this.logEvent(
      userId,
      saved,
      CLOSED_TRANSACTION_STATUSES.has(saved.status)
        ? TransactionEventType.CLOSED
        : TransactionEventType.STATUS_CHANGED,
      {
        previousStatus,
        nextStatus: saved.status,
        lostReason: saved.lostReason,
      },
    );

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);
    await this.transactionRepo.softRemove(transaction);
    await this.logEvent(userId, transaction, TransactionEventType.DELETED, {});
  }

  async findTasks(id: string, userId: string): Promise<TransactionTask[]> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);

    return this.taskRepo.find({
      where: {
        transactionId: transaction.id,
        agentId: agent.id,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async addTask(
    id: string,
    userId: string,
    dto: CreateTransactionTaskDto,
  ): Promise<TransactionTask> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);
    const status = dto.status ?? TransactionTaskStatus.TODO;

    const task = this.taskRepo.create({
      transactionId: transaction.id,
      agentId: agent.id,
      title: dto.title.trim(),
      status,
      priority: dto.priority ?? TransactionTaskPriority.NORMAL,
      dueDate: parseOptionalDate(dto.dueDate),
      completedAt: status === TransactionTaskStatus.DONE ? new Date() : null,
    });

    const saved = await this.taskRepo.save(task);
    await this.logEvent(
      userId,
      transaction,
      TransactionEventType.TASK_CREATED,
      {
        taskId: saved.id,
        title: saved.title,
      },
    );

    return saved;
  }

  async updateTask(
    id: string,
    taskId: string,
    userId: string,
    dto: UpdateTransactionTaskDto,
  ): Promise<TransactionTask> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);
    const task = await this.taskRepo.findOne({
      where: {
        id: taskId,
        transactionId: transaction.id,
        agentId: agent.id,
      },
    });

    if (!task) {
      throw new NotFoundException('Nie znaleziono zadania transakcji');
    }

    const previousStatus = task.status;

    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined)
      task.dueDate = parseOptionalDate(dto.dueDate);
    if (dto.status !== undefined) {
      task.status = dto.status;
      task.completedAt =
        dto.status === TransactionTaskStatus.DONE
          ? (task.completedAt ?? new Date())
          : null;
    }

    const saved = await this.taskRepo.save(task);

    if (
      previousStatus !== TransactionTaskStatus.DONE &&
      saved.status === TransactionTaskStatus.DONE
    ) {
      await this.logEvent(
        userId,
        transaction,
        TransactionEventType.TASK_COMPLETED,
        {
          taskId: saved.id,
          title: saved.title,
        },
      );
    }

    return saved;
  }

  async removeTask(id: string, taskId: string, userId: string): Promise<void> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);
    const result = await this.taskRepo.delete({
      id: taskId,
      transactionId: transaction.id,
      agentId: agent.id,
    });

    if (!result.affected) {
      throw new NotFoundException('Nie znaleziono zadania transakcji');
    }
  }

  async findEvents(id: string, userId: string): Promise<TransactionEvent[]> {
    const agent = await this.resolveAgent(userId);
    const transaction = await this.findOwnedTransaction(id, agent.id);

    return this.eventRepo.find({
      where: {
        transactionId: transaction.id,
        agentId: agent.id,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private baseTransactionQuery(): SelectQueryBuilder<Transaction> {
    return this.transactionRepo
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.listing', 'listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('transaction.buyerClient', 'buyerClient')
      .leftJoinAndSelect('transaction.sellerClient', 'sellerClient');
  }

  private applyFilters(
    qb: SelectQueryBuilder<Transaction>,
    filters: Omit<
      TransactionQueryDto,
      'page' | 'limit' | 'sortBy' | 'sortOrder'
    >,
  ): void {
    if (filters.status) {
      qb.andWhere('transaction.status = :status', { status: filters.status });
    }

    if (filters.listingId) {
      qb.andWhere('transaction.listingId = :listingId', {
        listingId: filters.listingId,
      });
    }

    if (filters.clientId) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('transaction.buyerClientId = :clientId', {
              clientId: filters.clientId,
            })
            .orWhere('transaction.sellerClientId = :clientId', {
              clientId: filters.clientId,
            });
        }),
      );
    }

    if (filters.dateFrom) {
      qb.andWhere('transaction.expectedCloseDate >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      qb.andWhere('transaction.expectedCloseDate <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.hasBlocker !== undefined) {
      if (filters.hasBlocker) {
        qb.andWhere(
          "transaction.blockerNote IS NOT NULL AND transaction.blockerNote <> ''",
        );
      } else {
        qb.andWhere(
          "(transaction.blockerNote IS NULL OR transaction.blockerNote = '')",
        );
      }
    }
  }

  private async resolveAgent(userId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) {
      throw new ForbiddenException('Brak profilu agenta dla użytkownika');
    }
    return agent;
  }

  private async findOwnedListing(
    listingId: string,
    agentId: string,
  ): Promise<Listing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, agentId },
    });

    if (!listing) {
      throw new NotFoundException('Nie znaleziono oferty');
    }

    return listing;
  }

  private async findOwnedClient(
    clientId: string,
    agentId: string,
  ): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, agentId },
    });

    if (!client) {
      throw new NotFoundException('Nie znaleziono klienta');
    }

    return client;
  }

  private async findOwnedTransaction(
    id: string,
    agentId: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({
      where: { id, agentId },
    });

    if (!transaction) {
      throw new NotFoundException('Nie znaleziono transakcji');
    }

    return transaction;
  }

  private async assertNoActiveTransactionForListing(
    listingId: string,
    agentId: string,
  ): Promise<void> {
    const active = await this.transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.listingId = :listingId', { listingId })
      .andWhere('transaction.agentId = :agentId', { agentId })
      .andWhere('transaction.status NOT IN (:...closedStatuses)', {
        closedStatuses: Array.from(CLOSED_TRANSACTION_STATUSES),
      })
      .getExists();

    if (active) {
      throw new BadRequestException(
        'Ta oferta ma już aktywną transakcję w pipeline',
      );
    }
  }

  private applyStatus(
    transaction: Transaction,
    status: TransactionStatus,
    lostReason?: string | null,
  ): void {
    this.assertStatusPayload(status, lostReason ?? transaction.lostReason);
    transaction.status = status;

    if (status === TransactionStatus.CLOSED_WON) {
      transaction.closedAt = transaction.closedAt ?? new Date();
      transaction.lostReason = null;
      return;
    }

    if (status === TransactionStatus.CLOSED_LOST) {
      transaction.closedAt = transaction.closedAt ?? new Date();
      transaction.lostReason = normalizeNullableText(lostReason);
      return;
    }

    transaction.closedAt = null;
    transaction.lostReason = null;
  }

  private assertStatusPayload(
    status: TransactionStatus,
    lostReason?: string | null,
  ): void {
    if (
      status === TransactionStatus.CLOSED_LOST &&
      !normalizeNullableText(lostReason)
    ) {
      throw new BadRequestException(
        'Powód utraty transakcji jest wymagany przy statusie zamknięta przegrana',
      );
    }
  }

  private applyDateUpdates(
    transaction: Transaction,
    dto: UpdateTransactionDto,
  ): void {
    const dateFields = [
      'expectedCloseDate',
      'reservationExpiresAt',
      'preliminaryAgreementDate',
      'financingDeadline',
      'notaryDate',
      'handoverDate',
      'commissionDueDate',
    ] as const;

    for (const field of dateFields) {
      if (dto[field] !== undefined) {
        transaction[field] = parseOptionalDate(dto[field]);
      }
    }
  }

  private applyTextUpdates(
    transaction: Transaction,
    dto: UpdateTransactionDto,
  ): void {
    if (dto.lostReason !== undefined) {
      transaction.lostReason = normalizeNullableText(dto.lostReason);
    }
    if (dto.blockerNote !== undefined) {
      transaction.blockerNote = normalizeNullableText(dto.blockerNote);
    }
    if (dto.privateNote !== undefined) {
      transaction.privateNote = normalizeNullableText(dto.privateNote);
    }
  }

  private async logEvent(
    userId: string,
    transaction: Transaction,
    type: TransactionEventType,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.eventRepo.save(
      this.eventRepo.create({
        transactionId: transaction.id,
        agentId: transaction.agentId,
        actorUserId: userId,
        type,
        metadata,
      }),
    );
  }

  private withDerivedFields(transaction: Transaction): Transaction {
    transaction.commissionAmount = calculateTransactionCommissionAmount({
      dealValue: transaction.dealValue,
      commissionType: transaction.commissionType,
      commissionValue: transaction.commissionValue,
    });

    return transaction;
  }

  private createTransactionSnapshot(
    transaction: Transaction,
  ): Record<string, unknown> {
    return {
      status: transaction.status,
      title: transaction.title,
      dealValue: transaction.dealValue,
      currency: transaction.currency,
      commissionType: transaction.commissionType,
      commissionValue: transaction.commissionValue,
      expectedCloseDate: transaction.expectedCloseDate,
      reservationExpiresAt: transaction.reservationExpiresAt,
      preliminaryAgreementDate: transaction.preliminaryAgreementDate,
      financingDeadline: transaction.financingDeadline,
      notaryDate: transaction.notaryDate,
      handoverDate: transaction.handoverDate,
      commissionDueDate: transaction.commissionDueDate,
      closedAt: transaction.closedAt,
      lostReason: transaction.lostReason,
      blockerNote: transaction.blockerNote,
    };
  }
}

function parseOptionalDate(
  value: string | Date | null | undefined,
): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function normalizeNullableText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCurrency(value: string | null | undefined): string {
  const normalized = (value || 'PLN').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new BadRequestException('Waluta musi być trzyliterowym kodem ISO');
  }
  return normalized;
}
