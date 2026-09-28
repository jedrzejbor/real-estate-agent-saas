import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { User } from '../users/entities/user.entity';
import { AccountEmailVerificationService } from './account-email-verification.service';

function pendingUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'owner@example.com',
    isActive: true,
    emailVerifiedAt: null,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
    emailVerificationSentAt: null,
    emailVerificationWindowStartedAt: null,
    emailVerificationSendCount: 0,
    ...overrides,
  } as User;
}

function harness(user: User | null = pendingUser()) {
  const findBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockImplementation(async () => user),
  };
  const manager = {
    getRepository: jest.fn().mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(findBuilder),
    }),
    update: jest.fn().mockImplementation(async (_entity, _id, changes) => {
      if (user) Object.assign(user, changes);
    }),
  };
  const updateBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const dataSource = {
    transaction: jest.fn().mockImplementation(async (action) => action(manager)),
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(user),
    }),
    createQueryBuilder: jest.fn().mockReturnValue(updateBuilder),
  };
  const emailService = { send: jest.fn().mockResolvedValue(undefined) };
  const configService = {
    get: jest.fn().mockImplementation((key: string, fallback?: string) => {
      if (key === 'FRONTEND_URL') return 'https://podadresem24.pl';
      if (key === 'NODE_ENV') return 'production';
      return fallback;
    }),
  };
  const monitoring = {
    recordSuccess: jest.fn(),
    recordWarning: jest.fn(),
    recordFailure: jest.fn(),
  };
  const service = new AccountEmailVerificationService(
    dataSource as never,
    configService as never,
    emailService as never,
    monitoring as never,
  );
  return { service, user, manager, updateBuilder, dataSource, emailService, monitoring };
}

describe('AccountEmailVerificationService', () => {
  it('stores only a token hash and emails a 24-hour verification link', async () => {
    const { service, manager, emailService } = harness();

    await expect(service.sendForUser('user-1')).resolves.toBe(true);

    const message = emailService.send.mock.calls[0][0];
    const token = /#token=([0-9a-f]{64})/.exec(message.text)?.[1];
    expect(token).toBeDefined();
    expect(message.text).toContain('https://podadresem24.pl/verify-email#token=');
    const saved = manager.update.mock.calls[0][2];
    expect(saved.emailVerificationTokenHash).toBe(
      createHash('sha256').update(token as string).digest('hex'),
    );
    expect(saved.emailVerificationTokenHash).not.toBe(token);
    expect(saved.emailVerificationExpiresAt.getTime() - saved.emailVerificationSentAt.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it('does not send again during cooldown or after the account limit', async () => {
    const cooldown = harness(
      pendingUser({ emailVerificationSentAt: new Date() }),
    );
    await expect(cooldown.service.sendForUser('user-1')).resolves.toBe(false);
    expect(cooldown.emailService.send).not.toHaveBeenCalled();

    const limited = harness(
      pendingUser({
        emailVerificationWindowStartedAt: new Date(Date.now() - 120_000),
        emailVerificationSentAt: new Date(Date.now() - 120_000),
        emailVerificationSendCount: 5,
      }),
    );
    await expect(limited.service.sendForUser('user-1')).resolves.toBe(false);
    expect(limited.emailService.send).not.toHaveBeenCalled();
  });

  it('restores the prior valid token and resend allowance after SMTP failure', async () => {
    const previousExpiresAt = new Date(Date.now() + 60_000);
    const previousSentAt = new Date(Date.now() - 120_000);
    const { service, emailService, updateBuilder } = harness(
      pendingUser({
        emailVerificationTokenHash: 'a'.repeat(64),
        emailVerificationExpiresAt: previousExpiresAt,
        emailVerificationSentAt: previousSentAt,
        emailVerificationWindowStartedAt: previousSentAt,
        emailVerificationSendCount: 1,
      }),
    );
    emailService.send.mockRejectedValue(new Error('smtp unavailable'));

    await expect(service.sendForUser('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(updateBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationTokenHash: 'a'.repeat(64),
        emailVerificationExpiresAt: previousExpiresAt,
        emailVerificationSentAt: previousSentAt,
        emailVerificationSendCount: 1,
      }),
    );
  });

  it('returns the same public resend result for unknown and verified accounts', async () => {
    const missing = harness(null);
    const verified = harness(pendingUser({ emailVerifiedAt: new Date() }));

    await expect(missing.service.requestResend('unknown@example.com')).resolves.toEqual({ success: true });
    await expect(verified.service.requestResend('owner@example.com')).resolves.toEqual({ success: true });
    expect(missing.emailService.send).not.toHaveBeenCalled();
    expect(verified.emailService.send).not.toHaveBeenCalled();
  });

  it('consumes a valid token in one database update and rejects replay', async () => {
    const { service, updateBuilder } = harness();
    const token = 'b'.repeat(64);
    updateBuilder.execute
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });

    await expect(service.confirm(token)).resolves.toBeUndefined();
    await expect(service.confirm(token)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(updateBuilder.where).toHaveBeenCalledWith(
      'email_verification_token_hash = :tokenHash',
      { tokenHash: createHash('sha256').update(token).digest('hex') },
    );
    expect(updateBuilder.set).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      }),
    );
  });
});
