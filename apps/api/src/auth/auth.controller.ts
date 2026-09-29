import {
  Controller,
  Delete,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AccountEmailVerificationService } from './account-email-verification.service';
import {
  ChangePasswordDto,
  ConfirmAccountEmailVerificationDto,
  DeactivateMyAccountDto,
  LoginDto,
  RegisterDto,
  RequestAccountEmailVerificationDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  UpdateMyProfileDto,
} from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import {
  clearAuthTokenCookies,
  setAuthTokenCookies,
  setCsrfTokenCookie,
} from './auth-token-cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly accountEmailVerificationService: AccountEmailVerificationService,
  ) {}

  /** POST /api/auth/register — public */
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(dto);
    if (result.status === 'pending_email_verification') {
      clearAuthTokenCookies(response, this.configService);
      response.status(HttpStatus.ACCEPTED);
      return { status: result.status };
    }
    setAuthTokenCookies(response, result.tokens, this.configService);
    return { user: result.user };
  }

  /** POST /api/auth/login — public */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    setAuthTokenCookies(response, result.tokens, this.configService);
    return { user: result.user };
  }

  /** POST /api/auth/password-reset/request — public, always returns generic success. */
  @Public()
  @Post('password-reset/request')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  /** POST /api/auth/password-reset/confirm — public, consumes password reset token. */
  @Public()
  @Post('password-reset/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
  }

  /** POST /api/auth/email-verification/request — neutral resend response. */
  @Public()
  @Post('email-verification/request')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  requestEmailVerification(@Body() dto: RequestAccountEmailVerificationDto) {
    return this.accountEmailVerificationService.requestResend(dto.email);
  }

  /** POST /api/auth/email-verification/confirm — single-use mailbox proof. */
  @Public()
  @Post('email-verification/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmailVerification(
    @Body() dto: ConfirmAccountEmailVerificationDto,
  ) {
    await this.accountEmailVerificationService.confirm(dto.token);
  }

  /** POST /api/auth/refresh — requires valid refresh token cookie or legacy header. */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: { id: string; email: string; role: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.refresh(user.id);
    setAuthTokenCookies(response, tokens, this.configService);
    return { success: true };
  }

  /** POST /api/auth/logout — clears auth cookies. */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) response: Response) {
    clearAuthTokenCookies(response, this.configService);
  }

  /** GET /api/auth/csrf — issues a readable CSRF token for browser clients. */
  @Public()
  @Get('csrf')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Res({ passthrough: true }) response: Response) {
    const token = setCsrfTokenCookie(response, this.configService);
    return { token };
  }

  /** GET /api/auth/me — protected */
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  /** PATCH /api/auth/me/profile — update current user's profile. */
  @Patch('me/profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  /** POST /api/auth/me/change-password — change current user's password. */
  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
  }

  /** DELETE /api/auth/me — deactivate current user's account. */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateMyAccount(
    @CurrentUser('id') userId: string,
    @Body() dto: DeactivateMyAccountDto,
  ) {
    await this.authService.deactivateMyAccount(userId, dto);
  }
}
