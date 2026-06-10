import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard that validates the refresh token from an httpOnly cookie or legacy header. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
