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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  DeactivateMyAccountDto,
  LoginDto,
  RegisterDto,
  UpdateMyProfileDto,
} from './dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/register — public */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /api/auth/login — public */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** POST /api/auth/refresh — requires valid refresh token in x-refresh-token header */
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: { id: string; email: string; role: string },
  ) {
    return this.authService.refresh(user.id, user.email, user.role);
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
