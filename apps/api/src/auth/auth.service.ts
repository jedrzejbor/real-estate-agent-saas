import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AgencyPlanService } from '../users/agency-plan.service';
import { ReleaseFlagsService } from '../release-flags';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly agencyPlanService: AgencyPlanService,
    private readonly releaseFlagsService: ReleaseFlagsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Register a new user and return tokens. */
  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const createdUser = await this.usersService.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const user = await this.usersService.ensureAgencyForUser(createdUser.id);

    this.logger.log(`User registered: ${user.email}`);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: await this.serializeUser(user),
      ...tokens,
    };
  }

  /** Authenticate user and return tokens. */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(
      dto.email.toLowerCase().trim(),
    );

    if (!user) {
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Konto zostało dezaktywowane');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    this.logger.log(`User logged in: ${user.email}`);

    // Re-fetch with agent relation
    const fullUser = await this.usersService.ensureAgencyForUser(user.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: await this.serializeUser(fullUser),
      ...tokens,
    };
  }

  /** Refresh tokens — issues a new access + refresh token pair. */
  async refresh(userId: string, email: string, role: string) {
    this.logger.log(`Token refreshed for user: ${email}`);
    return this.generateTokens(userId, email, role);
  }

  /** Get current user profile. */
  async getProfile(userId: string) {
    const user = await this.usersService.ensureAgencyForUser(userId);

    if (!user) {
      throw new UnauthorizedException('Użytkownik nie znaleziony');
    }

    return {
      ...(await this.serializeUser(user)),
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  // ── Private helpers ──

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ) {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async serializeUser(user: User) {
    const access = await this.usersService.getAgencyAccessContext(user.id);
    const usage = await this.usersService.getAgencyUsageSummaryByAgentIds(
      access.agencyAgentIds,
    );

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      agent: access.agent
        ? {
            id: access.agent.id,
            firstName: access.agent.firstName,
            lastName: access.agent.lastName,
            phone: access.agent.phone,
            licenseNo: access.agent.licenseNo,
            bio: access.agent.bio,
            avatarUrl: access.agent.avatarUrl,
          }
        : null,
      agency: access.agency
        ? {
            id: access.agency.id,
            name: access.agency.name,
            plan: access.agency.plan,
            subscription: access.agency.subscription,
            ownerId: access.agency.ownerId,
          }
        : null,
      entitlements: access.entitlements,
      releaseFlags: this.releaseFlagsService.getFlags(),
      usage,
    };
  }
}
