import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import {
  ListingAgentProposalCommissionType,
  UserRole,
} from '../common/enums';
import { ListingAgentProposalsController } from './listing-agent-proposals.controller';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

describe('ListingAgentProposalsController', () => {
  let controller: ListingAgentProposalsController;
  let service: {
    createForListing: jest.Mock;
    findForAgent: jest.Mock;
    findOneForAgent: jest.Mock;
    updateForAgent: jest.Mock;
    withdrawForAgent: jest.Mock;
  };

  beforeEach(() => {
    service = {
      createForListing: jest.fn(),
      findForAgent: jest.fn(),
      findOneForAgent: jest.fn(),
      updateForAgent: jest.fn(),
      withdrawForAgent: jest.fn(),
    };
    controller = new ListingAgentProposalsController(
      service as unknown as ListingAgentProposalsService,
    );
  });

  it('delegates proposal creation to the service', async () => {
    const dto = {
      commissionType: ListingAgentProposalCommissionType.PERCENTAGE,
      commissionValue: 2,
      services: ['Zdjecia', 'Portale'],
      message: 'Chce pomoc w sprzedazy tej nieruchomosci.',
    };
    const response = { id: PROPOSAL_ID };
    service.createForListing.mockResolvedValue(response);

    await expect(
      controller.createForListing(USER_ID, LISTING_ID, dto),
    ).resolves.toBe(response);

    expect(service.createForListing).toHaveBeenCalledWith(
      USER_ID,
      LISTING_ID,
      dto,
    );
  });

  it('delegates agent proposal list lookup to the service', async () => {
    const query = { page: 2, limit: 10 };
    const response = { data: [], meta: { total: 0 } };
    service.findForAgent.mockResolvedValue(response);

    await expect(controller.findForAgent(USER_ID, query)).resolves.toBe(
      response,
    );

    expect(service.findForAgent).toHaveBeenCalledWith(USER_ID, query);
  });

  it('delegates agent proposal detail lookup to the service', async () => {
    const response = { id: PROPOSAL_ID };
    service.findOneForAgent.mockResolvedValue(response);

    await expect(
      controller.findOneForAgent(USER_ID, PROPOSAL_ID),
    ).resolves.toBe(response);

    expect(service.findOneForAgent).toHaveBeenCalledWith(USER_ID, PROPOSAL_ID);
  });

  it('delegates agent proposal updates to the service', async () => {
    const dto = { message: 'Aktualizuje warunki wspolpracy z wlascicielem.' };
    const response = { id: PROPOSAL_ID };
    service.updateForAgent.mockResolvedValue(response);

    await expect(
      controller.updateForAgent(USER_ID, PROPOSAL_ID, dto),
    ).resolves.toBe(response);

    expect(service.updateForAgent).toHaveBeenCalledWith(
      USER_ID,
      PROPOSAL_ID,
      dto,
    );
  });

  it('delegates agent proposal withdrawal to the service', async () => {
    const response = { id: PROPOSAL_ID };
    service.withdrawForAgent.mockResolvedValue(response);

    await expect(
      controller.withdrawForAgent(USER_ID, PROPOSAL_ID),
    ).resolves.toBe(response);

    expect(service.withdrawForAgent).toHaveBeenCalledWith(
      USER_ID,
      PROPOSAL_ID,
    );
  });

  it('requires authenticated agent role', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, ListingAgentProposalsController),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ListingAgentProposalsController.prototype.createForListing,
      ),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(ROLES_KEY, ListingAgentProposalsController),
    ).toEqual([UserRole.AGENT]);
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LISTING_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '33333333-3333-4333-8333-333333333333';
