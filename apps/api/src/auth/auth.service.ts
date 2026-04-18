import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /** Register a new user and return tokens. */
  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersService.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    this.logger.log(`User registered: ${user.email}`);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        agent: user.agent
          ? {
              firstName: user.agent.firstName,
              lastName: user.agent.lastName,
            }
          : null,
      },
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
    const fullUser = await this.usersService.findById(user.id);

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        agent: fullUser?.agent
          ? {
              firstName: fullUser.agent.firstName,
              lastName: fullUser.agent.lastName,
            }
          : null,
      },
      ...tokens,
    };
  }

  /** Get current user profile. */
  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Użytkownik nie znaleziony');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
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
}
