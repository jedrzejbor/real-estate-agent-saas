import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { APP_NAME } from '../common/brand';
import { UserRole } from '../common/enums';
import { User } from '../users/entities';
import { AuthService } from './auth.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'agent@example.com',
    passwordHash: '$2b$12$existing-hash',
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    role: UserRole.AGENT,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildService(userOverrides: Partial<User> = {}) {
  const user = buildUser(userOverrides);
  const accessContext = {
    user,
    agent: {
      id: 'agent-1',
      firstName: 'Jan',
      lastName: 'Kowalski',
      phone: null,
      licenseNo: null,
      bio: null,
      avatarUrl: null,
    },
    agency: {
      id: 'agency-1',
      name: 'Kowalski Real Estate',
      plan: 'free',
      subscription: 'active',
      ownerId: 'user-1',
    },
    agencyAgentIds: ['agent-1'],
    entitlements: {
      plan: { code: 'free', label: 'Free', status: 'active' },
      limits: {},
      features: {},
    },
  };
  const usersService = {
    updateProfile: jest.fn().mockResolvedValue(user),
    findById: jest.fn().mockResolvedValue(user),
    updatePasswordHash: jest.fn().mockResolvedValue(undefined),
    setPasswordResetToken: jest.fn().mockResolvedValue(undefined),
    findByEmail: jest.fn().mockResolvedValue(user),
    findByPasswordResetTokenHash: jest.fn().mockResolvedValue(user),
    completePasswordReset: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    ensureAgencyForUser: jest.fn().mockResolvedValue(user),
    getAgencyAccessContext: jest.fn().mockResolvedValue(accessContext),
    getAgencyUsageSummaryByAgentIds: jest.fn().mockResolvedValue({
      activeListings: 0,
      clients: 0,
      monthlyAppointments: 0,
      users: 1,
    }),
  };
  const releaseFlagsService = {
    getFlags: jest.fn().mockReturnValue({}),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token'),
  };
  const configService = {
    get: jest.fn().mockImplementation((_key: string, fallback?: string) => fallback),
  };
  const emailService = {
    send: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new AuthService(
      usersService as never,
      {} as never,
      releaseFlagsService as never,
      jwtService as never,
      configService as never,
      emailService as never,
    ),
    usersService,
    emailService,
    accessContext,
  };
}

describe('AuthService account settings', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('updates profile and returns refreshed user payload', async () => {
    const { service, usersService, accessContext } = buildService();
    accessContext.agent.firstName = 'Anna';
    accessContext.agent.lastName = 'Nowak';

    const result = await service.updateProfile('user-1', {
      firstName: 'Anna',
      lastName: 'Nowak',
    });

    expect(usersService.updateProfile).toHaveBeenCalledWith('user-1', {
      firstName: 'Anna',
      lastName: 'Nowak',
    });
    expect(result.agent).toMatchObject({
      firstName: 'Anna',
      lastName: 'Nowak',
    });
  });

  it('changes password after validating current password', async () => {
    const currentPasswordHash = await bcrypt.hash('OldPass123', 4);
    const { service, usersService } = buildService({
      passwordHash: currentPasswordHash,
    });

    await service.changePassword('user-1', {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
    });

    const [, newPasswordHash] = usersService.updatePasswordHash.mock.calls[0];
    await expect(bcrypt.compare('NewPass123', newPasswordHash)).resolves.toBe(
      true,
    );
  });

  it('rejects password change when current password is invalid', async () => {
    const currentPasswordHash = await bcrypt.hash('OldPass123', 4);
    const { service, usersService } = buildService({
      passwordHash: currentPasswordHash,
    });

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'WrongPass123',
        newPassword: 'NewPass123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(usersService.updatePasswordHash).not.toHaveBeenCalled();
  });

  it('requests password reset with a hashed token and sends email', async () => {
    const { service, usersService, emailService } = buildService();

    const result = await service.requestPasswordReset({
      email: 'Agent@Example.com ',
    });

    expect(result).toEqual({ success: true });
    expect(usersService.findByEmail).toHaveBeenCalledWith('agent@example.com');
    expect(usersService.setPasswordResetToken).toHaveBeenCalledWith(
      'user-1',
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'agent@example.com',
        subject: `Reset hasła ${APP_NAME}`,
        text: expect.stringContaining('/reset-password?token='),
      }),
    );
  });

  it('does not reveal whether password reset email exists', async () => {
    const { service, usersService, emailService } = buildService();
    usersService.findByEmail.mockResolvedValue(null);

    const result = await service.requestPasswordReset({
      email: 'missing@example.com',
    });

    expect(result).toEqual({ success: true });
    expect(usersService.setPasswordResetToken).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('resets password when token is valid and confirmation matches', async () => {
    const { service, usersService } = buildService({
      passwordResetTokenHash: 'token-hash',
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    });

    await service.resetPassword({
      token: 'reset-token',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    });

    const [, newPasswordHash] = usersService.completePasswordReset.mock.calls[0];
    await expect(bcrypt.compare('NewPass123', newPasswordHash)).resolves.toBe(
      true,
    );
  });

  it('rejects password reset when confirmation does not match', async () => {
    const { service, usersService } = buildService({
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.resetPassword({
        token: 'reset-token',
        newPassword: 'NewPass123',
        confirmPassword: 'OtherPass123',
      }),
    ).rejects.toThrow('Hasła nie są takie same');

    expect(usersService.completePasswordReset).not.toHaveBeenCalled();
  });

  it('rejects expired password reset tokens', async () => {
    const { service, usersService } = buildService({
      passwordResetExpiresAt: new Date(Date.now() - 60_000),
    });

    await expect(
      service.resetPassword({
        token: 'reset-token',
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      }),
    ).rejects.toThrow('Link resetu hasła jest nieprawidłowy lub wygasł');

    expect(usersService.completePasswordReset).not.toHaveBeenCalled();
  });

  it('deactivates a non-admin account after password confirmation', async () => {
    const passwordHash = await bcrypt.hash('UserPass123', 4);
    const { service, usersService } = buildService({ passwordHash });

    await service.deactivateMyAccount('user-1', {
      password: 'UserPass123',
      confirmation: 'USUŃ KONTO',
    });

    expect(usersService.deactivate).toHaveBeenCalledWith('user-1');
  });

  it('rejects account deactivation when password is invalid', async () => {
    const passwordHash = await bcrypt.hash('UserPass123', 4);
    const { service, usersService } = buildService({ passwordHash });

    await expect(
      service.deactivateMyAccount('user-1', {
        password: 'WrongPass123',
        confirmation: 'USUŃ KONTO',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(usersService.deactivate).not.toHaveBeenCalled();
  });

  it('blocks admin account deactivation', async () => {
    const passwordHash = await bcrypt.hash('AdminPass123', 4);
    const { service, usersService } = buildService({
      passwordHash,
      role: UserRole.ADMIN,
    });

    await expect(
      service.deactivateMyAccount('user-1', {
        password: 'AdminPass123',
        confirmation: 'USUŃ KONTO',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(usersService.deactivate).not.toHaveBeenCalled();
  });
});
