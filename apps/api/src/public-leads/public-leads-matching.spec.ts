import type { EntityManager } from 'typeorm';
import { PublicLeadsService } from './public-leads.service';

describe('PublicLeadsService client matching', () => {
  function createService() {
    return new PublicLeadsService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  function createManager() {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
    } as unknown as EntityManager;

    return { manager, queryBuilder };
  }

  function findMatchingClient(service: PublicLeadsService) {
    return (
      service as unknown as {
        findMatchingClient: (
          manager: EntityManager,
          input: {
            agentId: string;
            fullName: string;
            email: string | null;
            phone: string | null;
          },
        ) => Promise<unknown>;
      }
    ).findMatchingClient.bind(service);
  }

  it('does not match an existing CRM client by phone unless full name matches too', async () => {
    const service = createService();
    const { manager, queryBuilder } = createManager();

    await findMatchingClient(service)(manager, {
      agentId: 'agent-1',
      fullName: 'Martyna Piękna',
      email: null,
      phone: '+48 500 600 700',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('LOWER(client.firstName) = :phoneFirstName'),
      expect.objectContaining({
        phone: '500600700',
        phoneFirstName: 'martyna',
        phoneLastName: 'piękna',
      }),
    );
  });

  it('still allows exact email matching without requiring a phone name match', async () => {
    const service = createService();
    const { manager, queryBuilder } = createManager();

    await findMatchingClient(service)(manager, {
      agentId: 'agent-1',
      fullName: 'Martyna Piękna',
      email: 'martyna@example.com',
      phone: null,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(LOWER(client.email) = LOWER(:email))',
      { email: 'martyna@example.com' },
    );
  });
});
