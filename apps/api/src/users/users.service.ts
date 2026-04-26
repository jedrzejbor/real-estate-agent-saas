import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Agent } from './entities/agent.entity';
import { Agency } from './entities/agency.entity';
import { Listing } from '../listings/entities/listing.entity';
import { Client } from '../clients/entities/client.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import {
  AgencyPlan,
  ListingStatus,
  SubscriptionStatus,
  UserRole,
} from '../common/enums';
import {
  AgencyEntitlements,
  AgencyPlanService,
} from './agency-plan.service';

export interface UserAgencyAccessContext {
  user: User;
  agent: Agent;
  agency: Agency;
  agencyAgentIds: string[];
  entitlements: AgencyEntitlements;
}

export interface AgencyUsageSummary {
  activeListings: number;
  clients: number;
  monthlyAppointments: number;
  users: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    private readonly agencyPlanService: AgencyPlanService,
  ) {}

  /** Find user by email (includes passwordHash for auth). */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  /** Find user by id. */
  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['agent', 'agent.agency'],
    });
  }

  /** Create a new user + agent profile (registration). */
  async create(params: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  }): Promise<User> {
    const existing = await this.findByEmail(params.email);
    if (existing) {
      throw new ConflictException('Użytkownik z tym adresem email już istnieje');
    }

    const userId = await this.userRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const agentRepo = manager.getRepository(Agent);
      const agencyRepo = manager.getRepository(Agency);

      const user = userRepo.create({
        email: params.email,
        passwordHash: params.passwordHash,
        role: params.role ?? UserRole.AGENT,
      });

      const savedUser = await userRepo.save(user);

      const agency = agencyRepo.create({
        name: this.buildAgencyName(
          params.email,
          params.firstName,
          params.lastName,
        ),
        ownerId: savedUser.id,
        plan: AgencyPlan.FREE,
        subscription: SubscriptionStatus.ACTIVE,
      });

      const savedAgency = await agencyRepo.save(agency);

      const agent = agentRepo.create({
        userId: savedUser.id,
        firstName: params.firstName,
        lastName: params.lastName,
        agencyId: savedAgency.id,
        user: savedUser,
        agency: savedAgency,
      });
      await agentRepo.save(agent);

      return savedUser.id;
    });

    return this.findById(userId) as Promise<User>;
  }

  async ensureAgencyForUser(id: string): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    if (user.agent?.agencyId && user.agent.agency) {
      return user;
    }

    await this.userRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const agentRepo = manager.getRepository(Agent);
      const agencyRepo = manager.getRepository(Agency);

      const transactionalUser = await userRepo.findOne({ where: { id } });

      if (!transactionalUser) {
        throw new NotFoundException('Użytkownik nie znaleziony');
      }

      let agent = await agentRepo.findOne({
        where: { userId: transactionalUser.id },
      });

      if (!agent) {
        agent = agentRepo.create({
          userId: transactionalUser.id,
          user: transactionalUser,
        });
        agent = await agentRepo.save(agent);
      }

      if (agent.agencyId) {
        const existingAgency = await agencyRepo.findOne({
          where: { id: agent.agencyId },
        });

        if (existingAgency) {
          agent.agency = existingAgency;
          await agentRepo.save(agent);
          return;
        }
      }

      const agency = agencyRepo.create({
        name: this.buildAgencyName(
          transactionalUser.email,
          agent.firstName,
          agent.lastName,
        ),
        ownerId: transactionalUser.id,
        plan: AgencyPlan.FREE,
        subscription: SubscriptionStatus.ACTIVE,
      });

      const savedAgency = await agencyRepo.save(agency);

      agent.agencyId = savedAgency.id;
      agent.agency = savedAgency;
      await agentRepo.save(agent);
    });

    return this.findById(id) as Promise<User>;
  }

  async getAgencyAccessContext(userId: string): Promise<UserAgencyAccessContext> {
    const user = await this.ensureAgencyForUser(userId);

    const agent = await this.agentRepo.findOne({ where: { userId } });

    if (!agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }

    const agency = agent.agencyId
      ? await this.agencyRepo.findOne({ where: { id: agent.agencyId } })
      : null;

    if (!agency) {
      throw new NotFoundException('Workspace nie znaleziony');
    }

    const agencyAgents = await this.agentRepo.find({
      where: { agencyId: agency.id },
      select: ['id'],
    });

    return {
      user,
      agent,
      agency,
      agencyAgentIds: agencyAgents.map((agent) => agent.id),
      entitlements: this.agencyPlanService.getEntitlements(agency),
    };
  }

  async resolveAgentForUser(userId: string): Promise<Agent> {
    const access = await this.getAgencyAccessContext(userId);
    return access.agent;
  }

  async getAgencyUsageSummary(userId: string): Promise<AgencyUsageSummary> {
    const access = await this.getAgencyAccessContext(userId);
    return this.getAgencyUsageSummaryByAgentIds(access.agencyAgentIds);
  }

  async getAgencyUsageSummaryByAgentIds(
    agencyAgentIds: string[],
  ): Promise<AgencyUsageSummary> {
    const now = new Date();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const monthEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const [activeListings, clients, monthlyAppointments, users] =
      await Promise.all([
        this.listingRepo.count({
          where: {
            agentId: In(agencyAgentIds),
            status: Not(ListingStatus.ARCHIVED),
          },
        }),
        this.clientRepo.count({
          where: {
            agentId: In(agencyAgentIds),
          },
        }),
        this.appointmentRepo
          .createQueryBuilder('appointment')
          .where('appointment.agentId IN (:...agentIds)', {
            agentIds: agencyAgentIds,
          })
          .andWhere('appointment.startTime >= :monthStart', { monthStart })
          .andWhere('appointment.startTime < :monthEnd', { monthEnd })
          .getCount(),
        Promise.resolve(agencyAgentIds.length),
      ]);

    return {
      activeListings,
      clients,
      monthlyAppointments,
      users,
    };
  }

  /** Deactivate user account. */
  async deactivate(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }
    user.isActive = false;
    await this.userRepo.save(user);
  }

  private buildAgencyName(
    email: string,
    firstName?: string,
    lastName?: string,
  ): string {
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

    if (fullName) {
      return `${fullName} Real Estate`;
    }

    const emailPrefix = email.split('@')[0]?.trim();
    if (emailPrefix) {
      return `${emailPrefix} Real Estate`;
    }

    return 'EstateFlow Workspace';
  }
}
