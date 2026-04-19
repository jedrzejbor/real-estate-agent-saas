import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Client } from './entities/client.entity';
import { ClientNote } from './entities/client-note.entity';
import { ClientPreference } from './entities/client-preference.entity';
import { Agent } from '../users/entities/agent.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { CreateClientNoteDto } from './dto/create-client-note.dto';

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
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(ClientNote)
    private readonly noteRepo: Repository<ClientNote>,
    @InjectRepository(ClientPreference)
    private readonly preferenceRepo: Repository<ClientPreference>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  // ── Create ──

  async create(userId: string, dto: CreateClientDto): Promise<Client> {
    const agent = await this.resolveAgent(userId);

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

    return this.findOneOrFail(savedClient.id);
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

  // ── Update ──

  async update(
    id: string,
    userId: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);

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

    return this.findOneOrFail(id);
  }

  // ── Delete ──

  async remove(id: string, userId: string): Promise<void> {
    const client = await this.findOneOrFail(id);
    await this.assertOwnership(client, userId);

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
  }

  // ── Private helpers ──

  /** Resolve the Agent entity from a User id. */
  private async resolveAgent(userId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { userId } });
    if (!agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }
    return agent;
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
  private async assertOwnership(
    client: Client,
    userId: string,
  ): Promise<void> {
    const agent = await this.resolveAgent(userId);
    if (client.agentId !== agent.id) {
      throw new ForbiddenException('Brak dostępu do tego klienta');
    }
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
}
