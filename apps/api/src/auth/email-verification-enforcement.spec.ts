import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

const pendingUser = {
  id: 'user-1',
  email: 'agent@example.com',
  role: UserRole.AGENT,
  isActive: true,
  emailVerifiedAt: null,
  emailVerificationRequiredAt: new Date(),
} as User;

describe('email verification at HTTP and JWT boundaries', () => {
  it('registers pending without setting session cookies and clears an old session', async () => {
    const auth = {
      register: jest
        .fn()
        .mockResolvedValue({ status: 'pending_email_verification' }),
    };
    const config = {
      get: jest
        .fn()
        .mockImplementation((_key: string, fallback: unknown) => fallback),
    };
    const controller = new AuthController(
      auth as never,
      config as never,
      {} as never,
    );
    const response = {
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;

    const result = await controller.register(
      { email: 'agent@example.com', password: 'StrongPass123' },
      response,
    );

    expect(result).toEqual({ status: 'pending_email_verification' });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.ACCEPTED);
    expect(response.cookie).not.toHaveBeenCalled();
    expect(response.clearCookie).toHaveBeenCalledWith(
      'accessToken',
      expect.anything(),
    );
    expect(response.clearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.anything(),
    );
  });

  it.each([
    ['access', JwtStrategy],
    ['refresh', JwtRefreshStrategy],
  ])(
    'rejects pending account with a valid %s JWT',
    async (_kind, StrategyClass) => {
      const users = { findById: jest.fn().mockResolvedValue(pendingUser) };
      const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
      const strategy = new StrategyClass(config as never, users as never);
      const payload = {
        sub: pendingUser.id,
        email: pendingUser.email,
        role: pendingUser.role,
      };
      if (strategy instanceof JwtRefreshStrategy) {
        await expect(
          strategy.validate({} as never, payload),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      } else {
        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }
    },
  );
});
