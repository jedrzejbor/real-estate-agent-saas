import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Agent } from './entities/agent.entity';
import { UserRole } from '../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
  ) {}

  /** Find user by email (includes passwordHash for auth). */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  /** Find user by id. */
  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      relations: ['agent'],
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

    const user = this.userRepo.create({
      email: params.email,
      passwordHash: params.passwordHash,
      role: params.role ?? UserRole.AGENT,
    });

    const savedUser = await this.userRepo.save(user);

    // Create associated agent profile
    const agent = this.agentRepo.create({
      userId: savedUser.id,
      firstName: params.firstName,
      lastName: params.lastName,
    });
    await this.agentRepo.save(agent);

    return this.findById(savedUser.id) as Promise<User>;
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
}
