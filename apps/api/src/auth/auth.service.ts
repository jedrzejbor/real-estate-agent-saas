import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { APP_NAME } from '../common/brand';
import { EmailService } from '../email';
import { UsersService } from '../users/users.service';
import { AgencyPlanService } from '../users/agency-plan.service';
import { ReleaseFlagsService } from '../release-flags';
import {
  ChangePasswordDto,
  DeactivateMyAccountDto,
  LoginDto,
  RegisterDto,
  RegisterAccountType,
  RequestPasswordResetDto,
  ResetPasswordDto,
  UpdateMyProfileDto,
} from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';
import { AgencyPlan } from '../common/enums';

const BCRYPT_ROUNDS = 12;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly agencyPlanService: AgencyPlanService,
    private readonly releaseFlagsService: ReleaseFlagsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  /** Register a new user and return tokens. */
  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const createdUser = await this.usersService.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role:
        dto.accountType === RegisterAccountType.PRIVATE_SELLER
          ? UserRole.VIEWER
          : UserRole.AGENT,
      initialPlan:
        dto.accountType === RegisterAccountType.PRIVATE_SELLER
          ? AgencyPlan.FREE
          : (dto.selectedPlan ?? AgencyPlan.FREE),
    });

    const user = await this.usersService.ensureAgencyForUser(createdUser.id);

    this.logger.log(`User registered: ${user.email}`);

    return {
      user: await this.serializeUser(user),
      tokens: await this.generateTokens(user.id, user.email, user.role),
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

    return {
      user: await this.serializeUser(fullUser),
      tokens: await this.generateTokens(user.id, user.email, user.role),
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

  /** Update current user's profile and return refreshed profile payload. */
  async updateProfile(userId: string, dto: UpdateMyProfileDto) {
    const user = await this.usersService.updateProfile(userId, dto);
    return this.getProfile(user.id);
  }

  /** Change current user's password after validating the current password. */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Użytkownik nie znaleziony');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Obecne hasło jest nieprawidłowe');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersService.updatePasswordHash(userId, passwordHash);
  }

  async requestPasswordReset(
    dto: RequestPasswordResetDto,
  ): Promise<{ success: true }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.isActive) {
      return { success: true };
    }

    const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await this.usersService.setPasswordResetToken(
      user.id,
      tokenHash,
      expiresAt,
    );
    await this.sendPasswordResetEmail(user.email, token, expiresAt);

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Hasła nie są takie same');
    }

    const tokenHash = hashPasswordResetToken(dto.token);
    const user = await this.usersService.findByPasswordResetTokenHash(
      tokenHash,
    );

    if (
      !user ||
      !user.isActive ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Link resetu hasła jest nieprawidłowy lub wygasł',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.usersService.completePasswordReset(user.id, passwordHash);
  }

  /** Deactivate current user's account after password confirmation. */
  async deactivateMyAccount(
    userId: string,
    dto: DeactivateMyAccountDto,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Użytkownik nie znaleziony');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Konto administratora nie może zostać dezaktywowane z poziomu aplikacji',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Hasło jest nieprawidłowe');
    }

    await this.usersService.deactivate(userId);
  }

  // ── Private helpers ──

  private async generateTokens(userId: string, email: string, role: string) {
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

  private async sendPasswordResetEmail(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const resetUrl = this.buildFrontendUrl(
      `/reset-password?token=${encodeURIComponent(token)}`,
    );

    await this.emailService.send({
      to: email,
      subject: `Reset hasła ${APP_NAME}`,
      text: [
        `Otrzymaliśmy prośbę o ustawienie nowego hasła do konta ${APP_NAME}.`,
        '',
        `Kliknij link i podaj nowe hasło: ${resetUrl}`,
        '',
        `Link jest ważny do ${formatDateTimeForEmail(expiresAt)}.`,
        'Jeśli to nie Ty wysłałeś tę prośbę, zignoruj tę wiadomość.',
      ].join('\n'),
    });
  }

  private buildFrontendUrl(path: string): string {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const normalizedFrontendUrl = String(frontendUrl).replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${normalizedFrontendUrl}${normalizedPath}`;
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
            billingInterval: access.agency.billingInterval ?? null,
            currentPeriodEnd: access.agency.currentPeriodEnd ?? null,
            trialEndsAt: access.agency.trialEndsAt ?? null,
          }
        : null,
      entitlements: access.entitlements,
      releaseFlags: this.releaseFlagsService.getFlags(),
      usage,
    };
  }
}

function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function formatDateTimeForEmail(value: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}
