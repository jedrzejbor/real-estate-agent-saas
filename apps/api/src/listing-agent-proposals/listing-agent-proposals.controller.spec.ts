import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import {
  ListingAgentAssignmentStatus,
  ListingAgentProposalCommissionType,
  UserRole,
} from '../common/enums';
import { ListingAgentProposalsController } from './listing-agent-proposals.controller';
import { ListingAgentProposalsService } from './listing-agent-proposals.service';

describe('ListingAgentProposalsController', () => {
  let controller: ListingAgentProposalsController;
  let service: {
    createForListing: jest.Mock;
    findAssignmentsForAgent: jest.Mock;
    createListingCopyForAgentAssignment: jest.Mock;
    findForAgent: jest.Mock;
    findOneForAgent: jest.Mock;
    updateForAgent: jest.Mock;
    withdrawForAgent: jest.Mock;
    findForSeller: jest.Mock;
    findOneForSeller: jest.Mock;
    acceptForSeller: jest.Mock;
    rejectForSeller: jest.Mock;
    closeRecruitmentForSeller: jest.Mock;
    reopenRecruitmentForSeller: jest.Mock;
    findMessages: jest.Mock;
    createMessage: jest.Mock;
  };

  beforeEach(() => {
    service = {
      createForListing: jest.fn(),
      findAssignmentsForAgent: jest.fn(),
      createListingCopyForAgentAssignment: jest.fn(),
      findForAgent: jest.fn(),
      findOneForAgent: jest.fn(),
      updateForAgent: jest.fn(),
      withdrawForAgent: jest.fn(),
      findForSeller: jest.fn(),
      findOneForSeller: jest.fn(),
      acceptForSeller: jest.fn(),
      rejectForSeller: jest.fn(),
      closeRecruitmentForSeller: jest.fn(),
      reopenRecruitmentForSeller: jest.fn(),
      findMessages: jest.fn(),
      createMessage: jest.fn(),
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

  it('delegates agent assignment list lookup to the service', async () => {
    const query = { status: ListingAgentAssignmentStatus.ACTIVE };
    const response = { data: [], meta: { total: 0 } };
    service.findAssignmentsForAgent.mockResolvedValue(response);

    await expect(
      controller.findAssignmentsForAgent(USER_ID, query),
    ).resolves.toBe(response);

    expect(service.findAssignmentsForAgent).toHaveBeenCalledWith(
      USER_ID,
      query,
    );
  });

  it('delegates agent listing copy creation to the service', async () => {
    const response = { id: 'assignment-1', agentListingId: LISTING_ID };
    service.createListingCopyForAgentAssignment.mockResolvedValue(response);

    await expect(
      controller.createListingCopyForAgentAssignment(USER_ID, 'assignment-1'),
    ).resolves.toBe(response);

    expect(service.createListingCopyForAgentAssignment).toHaveBeenCalledWith(
      USER_ID,
      'assignment-1',
    );
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

  it('delegates seller proposal list lookup to the service', async () => {
    const query = { listingId: LISTING_ID };
    const response = { data: [], meta: { total: 0 } };
    service.findForSeller.mockResolvedValue(response);

    await expect(controller.findForSeller(USER_ID, query)).resolves.toBe(
      response,
    );

    expect(service.findForSeller).toHaveBeenCalledWith(USER_ID, query);
  });

  it('delegates seller proposal detail lookup to the service', async () => {
    const response = { id: PROPOSAL_ID };
    service.findOneForSeller.mockResolvedValue(response);

    await expect(
      controller.findOneForSeller(USER_ID, PROPOSAL_ID),
    ).resolves.toBe(response);

    expect(service.findOneForSeller).toHaveBeenCalledWith(USER_ID, PROPOSAL_ID);
  });

  it('delegates seller accept decision to the service', async () => {
    const response = { id: PROPOSAL_ID, assignment: { id: 'assignment-1' } };
    service.acceptForSeller.mockResolvedValue(response);

    await expect(
      controller.acceptForSeller(USER_ID, PROPOSAL_ID),
    ).resolves.toBe(response);

    expect(service.acceptForSeller).toHaveBeenCalledWith(USER_ID, PROPOSAL_ID);
  });

  it('delegates seller reject decision to the service', async () => {
    const response = { id: PROPOSAL_ID, assignment: null };
    service.rejectForSeller.mockResolvedValue(response);

    await expect(
      controller.rejectForSeller(USER_ID, PROPOSAL_ID),
    ).resolves.toBe(response);

    expect(service.rejectForSeller).toHaveBeenCalledWith(USER_ID, PROPOSAL_ID);
  });

  it('delegates seller close recruitment action to the service', async () => {
    const response = {
      listingId: LISTING_ID,
      agentCollaborationStatus: 'closed',
    };
    service.closeRecruitmentForSeller.mockResolvedValue(response);

    await expect(
      controller.closeRecruitmentForSeller(USER_ID, LISTING_ID),
    ).resolves.toBe(response);

    expect(service.closeRecruitmentForSeller).toHaveBeenCalledWith(
      USER_ID,
      LISTING_ID,
    );
  });

  it('delegates seller reopen recruitment action to the service', async () => {
    const response = {
      listingId: LISTING_ID,
      agentCollaborationStatus: 'open',
    };
    service.reopenRecruitmentForSeller.mockResolvedValue(response);

    await expect(
      controller.reopenRecruitmentForSeller(USER_ID, LISTING_ID),
    ).resolves.toBe(response);

    expect(service.reopenRecruitmentForSeller).toHaveBeenCalledWith(
      USER_ID,
      LISTING_ID,
    );
  });

  it('delegates proposal message list lookup to the service', async () => {
    const query = { page: 1, limit: 50 };
    const response = { data: [], meta: { total: 0 } };
    service.findMessages.mockResolvedValue(response);

    await expect(
      controller.findMessages(USER_ID, PROPOSAL_ID, query),
    ).resolves.toBe(response);

    expect(service.findMessages).toHaveBeenCalledWith(
      USER_ID,
      PROPOSAL_ID,
      query,
    );
  });

  it('delegates proposal message creation to the service', async () => {
    const dto = { body: 'Dzien dobry, prosze o szczegoly wspolpracy.' };
    const response = { id: 'message-1' };
    service.createMessage.mockResolvedValue(response);

    await expect(
      controller.createMessage(USER_ID, PROPOSAL_ID, dto),
    ).resolves.toBe(response);

    expect(service.createMessage).toHaveBeenCalledWith(
      USER_ID,
      PROPOSAL_ID,
      dto,
    );
  });

  it('requires authenticated scoped roles', () => {
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
      Reflect.getMetadata(
        ROLES_KEY,
        ListingAgentProposalsController.prototype.createForListing,
      ),
    ).toEqual([UserRole.AGENT]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ListingAgentProposalsController.prototype.findForSeller,
      ),
    ).toEqual([UserRole.OWNER]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ListingAgentProposalsController.prototype.closeRecruitmentForSeller,
      ),
    ).toEqual([UserRole.OWNER]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ListingAgentProposalsController.prototype.findMessages,
      ),
    ).toEqual([UserRole.OWNER, UserRole.AGENT]);
  });
});

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LISTING_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '33333333-3333-4333-8333-333333333333';
