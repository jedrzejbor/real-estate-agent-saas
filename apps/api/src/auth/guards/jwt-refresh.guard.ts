import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard that validates the refresh token from the `x-refresh-token` header. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
