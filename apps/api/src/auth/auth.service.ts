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
    const usage = await this.usersService.getAgencyUsageSummary(user.id);

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      agent: user.agent
        ? {
            id: user.agent.id,
            firstName: user.agent.firstName,
            lastName: user.agent.lastName,
            phone: user.agent.phone,
            licenseNo: user.agent.licenseNo,
            bio: user.agent.bio,
            avatarUrl: user.agent.avatarUrl,
          }
        : null,
      agency: user.agent?.agency
        ? {
            id: user.agent.agency.id,
            name: user.agent.agency.name,
            plan: user.agent.agency.plan,
            subscription: user.agent.agency.subscription,
            ownerId: user.agent.agency.ownerId,
          }
        : null,
      entitlements: this.agencyPlanService.getEntitlements(user.agent?.agency),
      usage,
    };
  }
}
