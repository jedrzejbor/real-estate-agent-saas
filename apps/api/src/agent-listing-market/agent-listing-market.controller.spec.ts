import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { AgentListingMarketController } from './agent-listing-market.controller';
import { AgentListingMarketService } from './agent-listing-market.service';

describe('AgentListingMarketController', () => {
  let controller: AgentListingMarketController;
  let service: { findAll: jest.Mock };

  beforeEach(() => {
    service = { findAll: jest.fn() };
    controller = new AgentListingMarketController(
      service as unknown as AgentListingMarketService,
    );
  });

  it('delegates listing market lookup to the service', async () => {
    const query = { page: 2, limit: 12 };
    service.findAll.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 2, limit: 12, totalPages: 0 },
    });

    await expect(controller.findAll(USER_ID, query)).resolves.toEqual({
      data: [],
      meta: { total: 0, page: 2, limit: 12, totalPages: 0 },
    });

    expect(service.findAll).toHaveBeenCalledWith(USER_ID, query);
  });

  it('requires authenticated agent role', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, AgentListingMarketController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        AgentListingMarketController.prototype.findAll,
      ),
    ).toBeUndefined();
    expect(Reflect.getMetadata(ROLES_KEY, AgentListingMarketController)).toEqual(
      [UserRole.AGENT],
    );
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
