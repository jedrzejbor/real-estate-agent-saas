import { NotFoundException } from '@nestjs/common';
import { AgencyPlan, SubscriptionStatus, UserRole } from '../common/enums';
import { Agency } from './entities/agency.entity';
import { Agent } from './entities/agent.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

type RepoMock<T> = {
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  find: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
  manager: {
    transaction: jest.Mock;
  };
};

function buildRepoMock<T>(): RepoMock<T> {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };
}

function buildAgency(overrides: Partial<Agency> = {}): Agency {
  return {
    id: 'agency-1',
    name: 'Kowalski Real Estate',
    address: '',
    logoUrl: '',
    subscription: SubscriptionStatus.ACTIVE,
    plan: AgencyPlan.FREE,
    ownerId: 'user-1',
    agents: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildAgent(overrides: Partial<Agent> = {}): Agent {
  const agency = buildAgency();

  return {
    id: 'agent-1',
    firstName: 'Jan',
    lastName: 'Kowalski',
    phone: null,
    licenseNo: null,
    bio: null,
    avatarUrl: null,
    userId: 'user-1',
    agencyId: agency.id,
    agency,
    user: undefined as unknown as User,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildUser(overrides: Partial<User> = {}): User {
  const agent = buildAgent();
  const user: User = {
    id: 'user-1',
    email: 'agent@example.com',
    passwordHash: 'existing-hash',
    role: UserRole.AGENT,
    isActive: true,
    agent,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };

  if (user.agent) {
    user.agent.user = user;
  }

  return user;
}

function buildService(userOverrides: Partial<User> = {}) {
  const userRepo = buildRepoMock<User>();
  const agentRepo = buildRepoMock<Agent>();
  const agencyRepo = buildRepoMock<Agency>();
  const listingRepo = buildRepoMock<never>();
  const clientRepo = buildRepoMock<never>();
  const appointmentRepo = buildRepoMock<never>();
  const agencyPlanService = {
    getEntitlements: jest.fn(),
  };
  const user = buildUser(userOverrides);
  const agent = user.agent as Agent;

  userRepo.findOne.mockResolvedValue(user);
  userRepo.save.mockImplementation(async (entity) => entity);
  agentRepo.findOne.mockResolvedValue(agent);
  agentRepo.save.mockImplementation(async (entity) => entity);

  return {
    service: new UsersService(
      userRepo as never,
      agentRepo as never,
      agencyRepo as never,
      listingRepo as never,
      clientRepo as never,
      appointmentRepo as never,
      agencyPlanService as never,
    ),
    userRepo,
    agentRepo,
    user,
    agent,
  };
}

describe('UsersService account settings', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('updates agent profile fields and normalizes blank optional values', async () => {
    const { service, agentRepo, agent } = buildService();

    await service.updateProfile('user-1', {
      firstName: ' Anna ',
      lastName: ' Nowak ',
      phone: ' ',
      licenseNo: ' LIC-123 ',
      bio: '',
    });

    expect(agentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName: 'Anna',
        lastName: 'Nowak',
        phone: null,
        licenseNo: 'LIC-123',
        bio: null,
      }),
    );
    expect(agent).toMatchObject({
      firstName: 'Anna',
      lastName: 'Nowak',
      phone: null,
      licenseNo: 'LIC-123',
      bio: null,
    });
  });

  it('throws when updating profile without an agent profile', async () => {
    const { service, agentRepo } = buildService();
    agentRepo.findOne.mockResolvedValueOnce(null);

    await expect(
      service.updateProfile('user-1', { firstName: 'Anna' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(agentRepo.save).not.toHaveBeenCalled();
  });

  it('updates user password hash', async () => {
    const { service, userRepo, user } = buildService();

    await service.updatePasswordHash('user-1', 'new-hash');

    expect(user.passwordHash).toBe('new-hash');
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', passwordHash: 'new-hash' }),
    );
  });

  it('deactivates user account', async () => {
    const { service, userRepo, user } = buildService();

    await service.deactivate('user-1');

    expect(user.isActive).toBe(false);
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', isActive: false }),
    );
  });
});
