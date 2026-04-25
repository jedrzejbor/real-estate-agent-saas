import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Agent } from './entities/agent.entity';
import { Agency } from './entities/agency.entity';
import { AgencyPlan, SubscriptionStatus, UserRole } from '../common/enums';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
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

    if (user.agent?.agencyId) {
      return user;
    }

    await this.userRepo.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const agentRepo = manager.getRepository(Agent);
      const agencyRepo = manager.getRepository(Agency);

      const transactionalUser = await userRepo.findOne({
        where: { id },
        relations: ['agent'],
      });

      if (!transactionalUser) {
        throw new NotFoundException('Użytkownik nie znaleziony');
      }

      let agent = transactionalUser.agent;

      if (!agent) {
        agent = agentRepo.create({
          userId: transactionalUser.id,
        });
        agent = await agentRepo.save(agent);
      }

      if (agent.agencyId) {
        return;
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
      await agentRepo.save(agent);
    });

    return this.findById(id) as Promise<User>;
  }

  async getAgencyAccessContext(userId: string): Promise<UserAgencyAccessContext> {
    const user = await this.ensureAgencyForUser(userId);

    if (!user.agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }

    if (!user.agent.agency) {
      throw new NotFoundException('Workspace nie znaleziony');
    }

    const agencyAgents = await this.agentRepo.find({
      where: { agencyId: user.agent.agency.id },
      select: ['id'],
    });

    return {
      user,
      agent: user.agent,
      agency: user.agent.agency,
      agencyAgentIds: agencyAgents.map((agent) => agent.id),
      entitlements: this.agencyPlanService.getEntitlements(user.agent.agency),
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
