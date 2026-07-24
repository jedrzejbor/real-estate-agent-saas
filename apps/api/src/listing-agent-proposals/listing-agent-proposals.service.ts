import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, QueryFailedError, Repository } from 'typeorm';
import { EmailService } from '../email';
import {
  ListingAgentAssignmentStatus,
  ListingAgentCollaborationMode,
  ListingAgentCollaborationStatus,
  ListingAgentProposalCommissionType,
  ListingAgentProposalStatus,
  ListingPublicationStatus,
  ListingStatus,
} from '../common/enums';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import { Address, Listing, ListingImage } from '../listings/entities';
import { UsersService } from '../users';
import {
  CreateListingAgentProposalMessageDto,
  ListingAgentAssignmentQueryDto,
  ListingAgentProposalInputDto,
  ListingAgentProposalMessageQueryDto,
  ListingAgentProposalQueryDto,
  UpdateListingAgentProposalDto,
} from './dto';
import {
  ListingAgentAssignment,
  ListingAgentProposal,
  ListingAgentProposalMessage,
} from './entities';
import {
  canEditListingAgentProposal,
  canTransitionListingAgentProposal,
} from './listing-agent-proposal-status';
import type {
  ListingAgentAssignmentPage,
  ListingAgentAssignmentResponse,
  ListingAgentProposalDecisionResponse,
  ListingAgentProposalMessagePage,
  ListingAgentProposalMessageResponse,
  ListingAgentProposalParticipantRole,
  ListingAgentProposalPage,
  ListingAgentProposalResponse,
  ListingAgentRecruitmentResponse,
} from './listing-agent-proposals.types';

const UNIQUE_VIOLATION_CODE = '23505';
const ACTIVE_PROPOSAL_STATUSES = [
  ListingAgentProposalStatus.DRAFT,
  ListingAgentProposalStatus.SENT,
  ListingAgentProposalStatus.UPDATED,
] as const;
const MESSAGEABLE_PROPOSAL_STATUSES = new Set<ListingAgentProposalStatus>([
  ListingAgentProposalStatus.SENT,
  ListingAgentProposalStatus.UPDATED,
  ListingAgentProposalStatus.ACCEPTED,
]);

type AgentAccessContext = Awaited<
  ReturnType<UsersService['getAgencyAccessContext']>
>;

@Injectable()
export class ListingAgentProposalsService {
  private readonly logger = new Logger(ListingAgentProposalsService.name);

  constructor(
    @InjectRepository(ListingAgentProposal)
    private readonly proposalRepo: Repository<ListingAgentProposal>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Address)
    private readonly addressRepo: Repository<Address>,
    @InjectRepository(ListingImage)
    private readonly listingImageRepo: Repository<ListingImage>,
    @InjectRepository(ListingAgentAssignment)
    private readonly assignmentRepo: Repository<ListingAgentAssignment>,
    @InjectRepository(ListingAgentProposalMessage)
    private readonly messageRepo: Repository<ListingAgentProposalMessage>,
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async findAssignmentsForAgent(
    userId: string,
    query: ListingAgentAssignmentQueryDto,
  ): Promise<ListingAgentAssignmentPage> {
    const access = await this.resolvePaidAgentAccess(userId);
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
    } = query;

    const qb = this.assignmentRepo
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.listing', 'listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('assignment.proposal', 'proposal')
      .leftJoinAndSelect('proposal.agent', 'agent')
      .leftJoinAndSelect('agent.agency', 'agency')
      .where('assignment.agentId = :agentId', { agentId: access.agent.id });

    if (status) {
      qb.andWhere('assignment.status = :status', { status });
    }

    const sortColumn = getAssignmentSortColumn(sortBy);
    qb.orderBy(sortColumn, sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .addOrderBy('assignment.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [assignments, total] = await qb.getManyAndCount();

    return {
      data: assignments.map(toAssignmentListItemResponse),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sort: `${sortBy}:${sortOrder}`,
      },
    };
  }

  async createForListing(
    userId: string,
    listingId: string,
    dto: ListingAgentProposalInputDto,
  ): Promise<ListingAgentProposalResponse> {
    const access = await this.resolvePaidAgentAccess(userId);
    const listing = await this.findOpenListingForProposalOrFail(
      listingId,
      access.agent.id,
    );
    const input = normalizeProposalInput(dto);
    this.assertValidProposalInput(input);

    const existing = await this.proposalRepo.findOne({
      where: {
        listingId,
        agentId: access.agent.id,
        status: In([...ACTIVE_PROPOSAL_STATUSES]),
      },
    });

    if (existing) {
      throw new ConflictException(
        'Masz już aktywną ofertę współpracy dla tego ogłoszenia',
      );
    }

    const proposal = this.proposalRepo.create({
      ...input,
      listingId,
      ownerUserId: listing.ownerUserId as string,
      agentId: access.agent.id,
      agencyId: access.agency?.id ?? null,
      status: ListingAgentProposalStatus.SENT,
    });

    try {
      const saved = await this.proposalRepo.save(proposal);
      saved.listing = listing;
      saved.agent = access.agent;
      saved.agency = access.agency ?? null;
      await this.notifyOwnerAboutProposal(saved, listing);
      return toProposalResponse(saved);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Masz już aktywną ofertę współpracy dla tego ogłoszenia',
        );
      }

      throw error;
    }
  }

  async createListingCopyForAgentAssignment(
    userId: string,
    assignmentId: string,
  ): Promise<ListingAgentAssignmentResponse> {
    const access = await this.resolvePaidAgentAccess(userId);

    const assignment = await this.assignmentRepo.findOne({
      where: {
        id: assignmentId,
        agentId: access.agent.id,
        status: ListingAgentAssignmentStatus.ACTIVE,
      },
      relations: [
        'listing',
        'listing.address',
        'listing.images',
        'proposal',
        'proposal.agent',
        'proposal.agent.agency',
      ],
    });

    if (!assignment) {
      throw new NotFoundException('Nie znaleziono aktywnej współpracy');
    }

    if (assignment.agentListingId) {
      throw new ConflictException('Kopia oferty w CRM została już utworzona');
    }

    const sourceListing = assignment.listing;
    if (!sourceListing) {
      throw new NotFoundException('Oferta źródłowa jest niedostępna');
    }

    await this.assertAgentListingCreateWithinPlanLimit(access);

    const savedAssignment = await this.dataSource.transaction(async (manager) => {
      const listingRepo = manager.getRepository(Listing);
      const addressRepo = manager.getRepository(Address);
      const imageRepo = manager.getRepository(ListingImage);
      const assignmentRepo = manager.getRepository(ListingAgentAssignment);

      const listingCopy = listingRepo.create(
        buildAgentListingCopy(sourceListing, assignment, access.agent.id),
      );
      const savedListing = await listingRepo.save(listingCopy);

      if (sourceListing.address) {
        const addressCopy = addressRepo.create(
          buildAgentListingAddressCopy(sourceListing, savedListing),
        );
        await addressRepo.save(addressCopy);
      }

      if (Array.isArray(sourceListing.images) && sourceListing.images.length > 0) {
        const imageCopies = sourceListing.images.map((image) =>
          imageRepo.create({
            url: image.url,
            order: image.order,
            isPrimary: image.isPrimary,
            altText: image.altText,
            listing: savedListing,
          }),
        );
        await imageRepo.save(imageCopies);
      }

      assignment.agentListingId = savedListing.id;
      const updatedAssignment = await assignmentRepo.save(assignment);
      updatedAssignment.listing = sourceListing;
      updatedAssignment.proposal = assignment.proposal;

      return updatedAssignment;
    });

    return toAssignmentResponse(savedAssignment);
  }

  async findForAgent(
    userId: string,
    query: ListingAgentProposalQueryDto,
  ): Promise<ListingAgentProposalPage> {
    const access = await this.resolvePaidAgentAccess(userId);
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      listingId,
    } = query;

    const qb = this.proposalRepo
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.listing', 'listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('proposal.agent', 'agent')
      .leftJoinAndSelect('agent.agency', 'agency')
      .where('proposal.agentId = :agentId', { agentId: access.agent.id });

    if (status) {
      qb.andWhere('proposal.status = :status', { status });
    }

    if (listingId) {
      qb.andWhere('proposal.listingId = :listingId', { listingId });
    }

    const sortColumn = getProposalSortColumn(sortBy);
    qb.orderBy(sortColumn, sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .addOrderBy('proposal.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [proposals, total] = await qb.getManyAndCount();

    return {
      data: proposals.map(toProposalResponse),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sort: `${sortBy}:${sortOrder}`,
      },
    };
  }

  async findOneForAgent(
    userId: string,
    id: string,
  ): Promise<ListingAgentProposalResponse> {
    const access = await this.resolvePaidAgentAccess(userId);
    const proposal = await this.findOwnedProposalOrFail(access.agent.id, id);

    return toProposalResponse(proposal);
  }

  async updateForAgent(
    userId: string,
    id: string,
    dto: UpdateListingAgentProposalDto,
  ): Promise<ListingAgentProposalResponse> {
    const access = await this.resolvePaidAgentAccess(userId);
    const proposal = await this.findOwnedProposalOrFail(access.agent.id, id);

    if (!canEditListingAgentProposal(proposal.status)) {
      throw new BadRequestException(
        'Tej oferty współpracy nie można już edytować',
      );
    }

    const input = normalizeProposalInput({
      commissionType: dto.commissionType ?? proposal.commissionType,
      commissionValue:
        dto.commissionValue !== undefined
          ? dto.commissionValue
          : proposal.commissionValue === null
            ? null
            : Number(proposal.commissionValue),
      minimumContractMonths:
        dto.minimumContractMonths !== undefined
          ? dto.minimumContractMonths
          : proposal.minimumContractMonths,
      exclusivity:
        dto.exclusivity !== undefined ? dto.exclusivity : proposal.exclusivity,
      services: dto.services ?? proposal.services,
      marketingPlan:
        dto.marketingPlan !== undefined
          ? dto.marketingPlan
          : proposal.marketingPlan,
      valuationOpinion:
        dto.valuationOpinion !== undefined
          ? dto.valuationOpinion
          : proposal.valuationOpinion,
      proposedPrice:
        dto.proposedPrice !== undefined
          ? dto.proposedPrice
          : proposal.proposedPrice === null
            ? null
            : Number(proposal.proposedPrice),
      availability:
        dto.availability !== undefined ? dto.availability : proposal.availability,
      message: dto.message ?? proposal.message ?? '',
      validUntil:
        dto.validUntil !== undefined
          ? dto.validUntil
          : proposal.validUntil?.toISOString() ?? null,
    });
    this.assertValidProposalInput(input);

    Object.assign(proposal, input, {
      status: ListingAgentProposalStatus.UPDATED,
    });

    const saved = await this.proposalRepo.save(proposal);
    return toProposalResponse(saved);
  }

  async withdrawForAgent(
    userId: string,
    id: string,
  ): Promise<ListingAgentProposalResponse> {
    const access = await this.resolvePaidAgentAccess(userId);
    const proposal = await this.findOwnedProposalOrFail(access.agent.id, id);

    if (
      !canTransitionListingAgentProposal(
        proposal.status,
        ListingAgentProposalStatus.WITHDRAWN,
      )
    ) {
      throw new BadRequestException(
        'Tej oferty współpracy nie można już wycofać',
      );
    }

    proposal.status = ListingAgentProposalStatus.WITHDRAWN;
    proposal.withdrawnAt = new Date();

    const saved = await this.proposalRepo.save(proposal);
    return toProposalResponse(saved);
  }

  async findForSeller(
    userId: string,
    query: ListingAgentProposalQueryDto,
  ): Promise<ListingAgentProposalPage> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      listingId,
    } = query;

    const qb = this.proposalRepo
      .createQueryBuilder('proposal')
      .leftJoinAndSelect('proposal.listing', 'listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('proposal.agent', 'agent')
      .leftJoinAndSelect('agent.agency', 'agency')
      .where('proposal.ownerUserId = :ownerUserId', { ownerUserId: userId });

    if (status) {
      qb.andWhere('proposal.status = :status', { status });
    }

    if (listingId) {
      qb.andWhere('proposal.listingId = :listingId', { listingId });
    }

    const sortColumn = getProposalSortColumn(sortBy);
    qb.orderBy(sortColumn, sortOrder === 'ASC' ? 'ASC' : 'DESC')
      .addOrderBy('proposal.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [proposals, total] = await qb.getManyAndCount();

    return {
      data: proposals.map(toProposalResponse),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        sort: `${sortBy}:${sortOrder}`,
      },
    };
  }

  async findOneForSeller(
    userId: string,
    id: string,
  ): Promise<ListingAgentProposalResponse> {
    const proposal = await this.findSellerProposalOrFail(userId, id);

    return toProposalResponse(proposal);
  }

  async acceptForSeller(
    userId: string,
    id: string,
  ): Promise<ListingAgentProposalDecisionResponse> {
    try {
      const result = await this.dataSource.transaction(async (manager) => {
        const proposalRepo = manager.getRepository(ListingAgentProposal);
        const listingRepo = manager.getRepository(Listing);
        const assignmentRepo = manager.getRepository(ListingAgentAssignment);
        const proposal = await proposalRepo.findOne({
          where: { id, ownerUserId: userId },
          relations: [
            'listing',
            'listing.address',
            'agent',
            'agent.user',
            'agent.agency',
          ],
          lock: { mode: 'pessimistic_write' },
        });

        if (!proposal) {
          throw new NotFoundException('Oferta współpracy nie znaleziona');
        }

        this.assertProposalCanBeAccepted(proposal);

        const listing = proposal.listing;
        if (
          !listing.agentCollaborationEnabled ||
          listing.agentCollaborationStatus !== ListingAgentCollaborationStatus.OPEN
        ) {
          throw new BadRequestException(
            'Nabór agentów dla tej oferty nie jest już otwarty',
          );
        }

        const now = new Date();
        proposal.status = ListingAgentProposalStatus.ACCEPTED;
        proposal.acceptedAt = now;

        const assignment = assignmentRepo.create({
          listingId: proposal.listingId,
          proposalId: proposal.id,
          ownerUserId: proposal.ownerUserId,
          agentId: proposal.agentId,
          agencyId: proposal.agencyId ?? null,
          status: ListingAgentAssignmentStatus.ACTIVE,
          acceptedTermsSnapshot: buildAcceptedTermsSnapshot(proposal),
        });

        const savedAssignment = await assignmentRepo.save(assignment);
        const savedProposal = await proposalRepo.save(proposal);

        if (
          listing.agentCollaborationMode ===
          ListingAgentCollaborationMode.SINGLE_AGENT
        ) {
          listing.agentCollaborationStatus =
            ListingAgentCollaborationStatus.ASSIGNED;
          listing.agentCollaborationClosedAt = now;
          await listingRepo.save(listing);

          await proposalRepo
            .createQueryBuilder()
            .update(ListingAgentProposal)
            .set({ status: ListingAgentProposalStatus.CLOSED })
            .where('listing_id = :listingId', { listingId: proposal.listingId })
            .andWhere('id != :proposalId', { proposalId: proposal.id })
            .andWhere('status IN (:...statuses)', {
              statuses: [...ACTIVE_PROPOSAL_STATUSES],
            })
            .execute();
        }

        savedProposal.listing = listing;
        savedProposal.agent = proposal.agent;
        savedProposal.agency = proposal.agent.agency ?? null;
        savedAssignment.proposal = savedProposal;

        return { proposal: savedProposal, assignment: savedAssignment };
      });

      await this.notifyAgentAboutSellerDecision(result.proposal, 'accepted');

      return {
        ...toProposalResponse(result.proposal),
        assignment: toAssignmentResponse(result.assignment),
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Ta oferta współpracy została już zaakceptowana',
        );
      }

      throw error;
    }
  }

  async rejectForSeller(
    userId: string,
    id: string,
  ): Promise<ListingAgentProposalDecisionResponse> {
    const proposal = await this.findSellerProposalOrFail(userId, id);

    if (
      !canTransitionListingAgentProposal(
        proposal.status,
        ListingAgentProposalStatus.REJECTED,
      )
    ) {
      throw new BadRequestException(
        'Tej oferty współpracy nie można już odrzucić',
      );
    }

    proposal.status = ListingAgentProposalStatus.REJECTED;
    proposal.rejectedAt = new Date();

    const saved = await this.proposalRepo.save(proposal);
    await this.notifyAgentAboutSellerDecision(saved, 'rejected');

    return {
      ...toProposalResponse(saved),
      assignment: null,
    };
  }

  async closeRecruitmentForSeller(
    userId: string,
    listingId: string,
  ): Promise<ListingAgentRecruitmentResponse> {
    const listing = await this.findSellerListingForRecruitmentOrFail(
      userId,
      listingId,
    );

    if (!listing.agentCollaborationEnabled) {
      throw new BadRequestException(
        'Współpraca z agentami nie jest włączona dla tej oferty',
      );
    }

    if (listing.agentCollaborationStatus === ListingAgentCollaborationStatus.CLOSED) {
      throw new BadRequestException('Nabór agentów jest już zamknięty');
    }

    if (
      listing.agentCollaborationStatus === ListingAgentCollaborationStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        'Oferta ma już zaakceptowanego agenta',
      );
    }

    listing.agentCollaborationStatus = ListingAgentCollaborationStatus.CLOSED;
    listing.agentCollaborationClosedAt = new Date();

    const saved = await this.listingRepo.save(listing);
    return toRecruitmentResponse(saved);
  }

  async reopenRecruitmentForSeller(
    userId: string,
    listingId: string,
  ): Promise<ListingAgentRecruitmentResponse> {
    const listing = await this.findSellerListingForRecruitmentOrFail(
      userId,
      listingId,
    );

    this.assertListingCanOpenRecruitment(listing);

    if (listing.agentCollaborationStatus === ListingAgentCollaborationStatus.OPEN) {
      throw new BadRequestException('Nabór agentów jest już otwarty');
    }

    if (
      listing.agentCollaborationStatus === ListingAgentCollaborationStatus.ASSIGNED
    ) {
      throw new BadRequestException(
        'Oferta ma już zaakceptowanego agenta',
      );
    }

    listing.agentCollaborationEnabled = true;
    listing.agentCollaborationStatus = ListingAgentCollaborationStatus.OPEN;
    listing.agentCollaborationOpenedAt = new Date();
    listing.agentCollaborationClosedAt = null;

    const saved = await this.listingRepo.save(listing);
    return toRecruitmentResponse(saved);
  }

  async findMessages(
    userId: string,
    proposalId: string,
    query: ListingAgentProposalMessageQueryDto,
  ): Promise<ListingAgentProposalMessagePage> {
    const participant = await this.findParticipantProposalOrFail(
      userId,
      proposalId,
    );
    const { page = 1, limit = 50 } = query;

    const unreadCount = await this.messageRepo
      .createQueryBuilder('message')
      .where('message.proposalId = :proposalId', { proposalId })
      .andWhere('message.senderUserId != :userId', { userId })
      .andWhere('message.readAt IS NULL')
      .getCount();

    const [messages, total] = await this.messageRepo.findAndCount({
      where: { proposalId },
      order: { createdAt: 'ASC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (unreadCount > 0) {
      await this.messageRepo
        .createQueryBuilder()
        .update(ListingAgentProposalMessage)
        .set({ readAt: new Date() })
        .where('proposal_id = :proposalId', { proposalId })
        .andWhere('sender_user_id != :userId', { userId })
        .andWhere('read_at IS NULL')
        .execute();
    }

    return {
      data: messages.map((message) =>
        toMessageResponse(message, participant.proposal),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async createMessage(
    userId: string,
    proposalId: string,
    dto: CreateListingAgentProposalMessageDto,
  ): Promise<ListingAgentProposalMessageResponse> {
    const participant = await this.findParticipantProposalOrFail(
      userId,
      proposalId,
    );

    if (!MESSAGEABLE_PROPOSAL_STATUSES.has(participant.proposal.status)) {
      throw new BadRequestException(
        'Nie można wysłać wiadomości w zamkniętej propozycji',
      );
    }

    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Wiadomość nie może być pusta');
    }

    const message = this.messageRepo.create({
      proposalId,
      senderUserId: userId,
      body,
      readAt: null,
      metadata: {
        senderRole: participant.role,
      },
    });

    const saved = await this.messageRepo.save(message);
    await this.notifyParticipantAboutMessage(participant.proposal, userId, body);

    return toMessageResponse(saved, participant.proposal);
  }

  private async resolvePaidAgentAccess(
    userId: string,
  ): Promise<AgentAccessContext> {
    const access = await this.usersService.getAgencyAccessContext(userId);

    if (!access.entitlements.features.agentListingMarket) {
      throw new FeatureAccessDeniedException({
        feature: 'agentListingMarket',
        planCode: access.entitlements.plan.code,
        message:
          'Oferty współpracy są dostępne w płatnych planach agentów.',
      });
    }

    return access;
  }

  private async assertAgentListingCreateWithinPlanLimit(
    access: AgentAccessContext,
  ): Promise<void> {
    const currentUsage = await this.listingRepo.count({
      where: {
        agentId: In(access.agencyAgentIds),
        status: Not(ListingStatus.ARCHIVED),
      },
    });
    const attemptedUsage = currentUsage + 1;
    const limit = access.entitlements.limits.activeListings;

    if (limit !== null && attemptedUsage > limit) {
      throw new PlanLimitReachedException({
        resource: 'listings',
        limit,
        currentUsage,
        attemptedUsage,
        planCode: access.entitlements.plan.code,
        message:
          'Osiągnięto limit aktywnych ofert w Twoim planie. Przejdź na wyższy plan, aby utworzyć kopię oferty w CRM.',
      });
    }
  }

  private async findOpenListingForProposalOrFail(
    listingId: string,
    agentId: string,
  ): Promise<Listing> {
    const listing = await this.listingRepo
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.address', 'address')
      .leftJoinAndSelect('listing.images', 'images')
      .leftJoinAndSelect('listing.ownerUser', 'ownerUser')
      .where('listing.id = :listingId', { listingId })
      .andWhere('listing.agentCollaborationEnabled = :enabled', {
        enabled: true,
      })
      .andWhere('listing.agentCollaborationStatus = :collaborationStatus', {
        collaborationStatus: ListingAgentCollaborationStatus.OPEN,
      })
      .andWhere('listing.ownerUserId IS NOT NULL')
      .andWhere('listing.agentId != :agentId', { agentId })
      .andWhere('listing.publicationStatus = :publicationStatus', {
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      })
      .andWhere('listing.status = :listingStatus', {
        listingStatus: ListingStatus.ACTIVE,
      })
      .andWhere('listing.publicSlug IS NOT NULL')
      .andWhere('listing.publishedAt IS NOT NULL')
      .andWhere('(listing.expiresAt IS NULL OR listing.expiresAt > :now)', {
        now: new Date(),
      })
      .getOne();

    if (!listing) {
      throw new NotFoundException(
        'Oferta nie jest dostępna do współpracy z agentem',
      );
    }

    return listing;
  }

  private async findParticipantProposalOrFail(
    userId: string,
    proposalId: string,
  ): Promise<{
    proposal: ListingAgentProposal;
    role: ListingAgentProposalParticipantRole;
  }> {
    const proposal = await this.proposalRepo.findOne({
      where: { id: proposalId },
      relations: [
        'listing',
        'listing.address',
        'ownerUser',
        'agent',
        'agent.user',
        'agent.agency',
      ],
    });

    if (!proposal) {
      throw new NotFoundException('Oferta współpracy nie znaleziona');
    }

    if (proposal.ownerUserId === userId) {
      return { proposal, role: 'owner' };
    }

    if (proposal.agent?.userId === userId) {
      return { proposal, role: 'agent' };
    }

    throw new NotFoundException('Oferta współpracy nie znaleziona');
  }

  private async findOwnedProposalOrFail(
    agentId: string,
    id: string,
  ): Promise<ListingAgentProposal> {
    const proposal = await this.proposalRepo.findOne({
      where: { id, agentId },
      relations: ['listing', 'listing.address', 'agent', 'agent.agency'],
    });

    if (!proposal) {
      throw new NotFoundException('Oferta współpracy nie znaleziona');
    }

    return proposal;
  }

  private async findSellerListingForRecruitmentOrFail(
    ownerUserId: string,
    listingId: string,
  ): Promise<Listing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, ownerUserId },
    });

    if (!listing) {
      throw new NotFoundException('Oferta nie znaleziona');
    }

    return listing;
  }

  private assertListingCanOpenRecruitment(listing: Listing): void {
    if (
      listing.status !== ListingStatus.ACTIVE ||
      listing.publicationStatus !== ListingPublicationStatus.PUBLISHED ||
      !listing.publicSlug ||
      !listing.publishedAt ||
      (listing.expiresAt && listing.expiresAt <= new Date())
    ) {
      throw new BadRequestException(
        'Nabór agentów można otworzyć tylko dla aktywnej, opublikowanej i niewygasłej oferty',
      );
    }
  }

  private async findSellerProposalOrFail(
    ownerUserId: string,
    id: string,
  ): Promise<ListingAgentProposal> {
    const proposal = await this.proposalRepo.findOne({
      where: { id, ownerUserId },
      relations: [
        'listing',
        'listing.address',
        'agent',
        'agent.user',
        'agent.agency',
      ],
    });

    if (!proposal) {
      throw new NotFoundException('Oferta współpracy nie znaleziona');
    }

    return proposal;
  }

  private assertProposalCanBeAccepted(proposal: ListingAgentProposal): void {
    if (
      !canTransitionListingAgentProposal(
        proposal.status,
        ListingAgentProposalStatus.ACCEPTED,
      )
    ) {
      throw new BadRequestException(
        'Tej oferty współpracy nie można już zaakceptować',
      );
    }

    if (proposal.validUntil && proposal.validUntil <= new Date()) {
      throw new BadRequestException('Ta oferta współpracy już wygasła');
    }
  }

  private assertValidProposalInput(input: NormalizedProposalInput): void {
    if (input.validUntil && input.validUntil <= new Date()) {
      throw new BadRequestException(
        'Termin ważności oferty współpracy musi być w przyszłości',
      );
    }

    if (input.services.length === 0) {
      throw new BadRequestException('Wybierz co najmniej jeden zakres usług');
    }

    if (input.message.length < 20) {
      throw new BadRequestException(
        'Wiadomość do właściciela musi mieć minimum 20 znaków',
      );
    }

    if (input.commissionType === ListingAgentProposalCommissionType.NONE) {
      if (input.commissionValue !== null) {
        throw new BadRequestException(
          'Brak prowizji nie może mieć podanej wartości prowizji',
        );
      }
      return;
    }

    if (input.commissionValue === null) {
      throw new BadRequestException('Podaj wartość prowizji');
    }

    if (
      input.commissionType === ListingAgentProposalCommissionType.PERCENTAGE &&
      input.commissionValue > 100
    ) {
      throw new BadRequestException('Prowizja procentowa nie może przekraczać 100');
    }
  }

  private async notifyOwnerAboutProposal(
    proposal: ListingAgentProposal,
    listing: Listing,
  ): Promise<void> {
    if (!listing.ownerUser?.email) {
      return;
    }

    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const sellerUrl = `${frontendUrl.replace(/\/+$/, '')}/seller`;
    const listingTitle = listing.publicTitle || listing.title;
    const agentName = [proposal.agent?.firstName, proposal.agent?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    try {
      await this.emailService.send({
        to: listing.ownerUser.email,
        subject: `Nowa oferta współpracy dla ogłoszenia: ${listingTitle}`,
        text: [
          `Masz nową ofertę współpracy dla ogłoszenia "${listingTitle}".`,
          agentName ? `Agent: ${agentName}` : null,
          proposal.message ? `Wiadomość: ${proposal.message}` : null,
          '',
          `Zobacz propozycję w panelu właściciela: ${sellerUrl}`,
        ]
          .filter((line): line is string => line !== null)
          .join('\n'),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to notify owner ${listing.ownerUserId} about listing agent proposal ${proposal.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async notifyAgentAboutSellerDecision(
    proposal: ListingAgentProposal,
    decision: 'accepted' | 'rejected',
  ): Promise<void> {
    const agentEmail = proposal.agent?.user?.email;
    if (!agentEmail) {
      return;
    }

    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const agentUrl = `${frontendUrl.replace(/\/+$/, '')}/dashboard`;
    const listingTitle = proposal.listing?.publicTitle || proposal.listing?.title;
    const accepted = decision === 'accepted';

    try {
      await this.emailService.send({
        to: agentEmail,
        subject: accepted
          ? `Właściciel zaakceptował Twoją ofertę współpracy: ${listingTitle}`
          : `Właściciel odrzucił Twoją ofertę współpracy: ${listingTitle}`,
        text: [
          accepted
            ? `Właściciel zaakceptował Twoją ofertę współpracy dla ogłoszenia "${listingTitle}".`
            : `Właściciel odrzucił Twoją ofertę współpracy dla ogłoszenia "${listingTitle}".`,
          '',
          `Zobacz szczegóły w panelu agenta: ${agentUrl}`,
        ].join('\n'),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to notify agent ${proposal.agentId} about seller decision for proposal ${proposal.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async notifyParticipantAboutMessage(
    proposal: ListingAgentProposal,
    senderUserId: string,
    body: string,
  ): Promise<void> {
    const recipientEmail =
      proposal.ownerUserId === senderUserId
        ? proposal.agent?.user?.email
        : proposal.ownerUser?.email;

    if (!recipientEmail) {
      return;
    }

    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const url = `${frontendUrl.replace(/\/+$/, '')}/dashboard`;
    const listingTitle = proposal.listing?.publicTitle || proposal.listing?.title;

    try {
      await this.emailService.send({
        to: recipientEmail,
        subject: `Nowa wiadomość dotycząca propozycji: ${listingTitle}`,
        text: [
          `Masz nową wiadomość dotyczącą propozycji współpracy dla ogłoszenia "${listingTitle}".`,
          '',
          body,
          '',
          `Zobacz rozmowę w panelu: ${url}`,
        ].join('\n'),
      });
    } catch (error) {
      this.logger.warn(
        `Failed to notify participant about proposal message for ${proposal.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }
}

interface NormalizedProposalInput {
  commissionType: ListingAgentProposalCommissionType;
  commissionValue: number | null;
  minimumContractMonths: number | null;
  exclusivity: ListingAgentProposal['exclusivity'];
  services: string[];
  marketingPlan: string | null;
  valuationOpinion: string | null;
  proposedPrice: number | null;
  availability: string | null;
  message: string;
  validUntil: Date | null;
}

function normalizeProposalInput(
  input: ListingAgentProposalInputDto | UpdateListingAgentProposalDto,
): NormalizedProposalInput {
  return {
    commissionType:
      input.commissionType ?? ListingAgentProposalCommissionType.NONE,
    commissionValue: normalizeNullableNumber(input.commissionValue),
    minimumContractMonths: normalizeNullableNumber(input.minimumContractMonths),
    exclusivity: input.exclusivity ?? null,
    services: normalizeServices(input.services ?? []),
    marketingPlan: normalizeOptionalString(input.marketingPlan),
    valuationOpinion: normalizeOptionalString(input.valuationOpinion),
    proposedPrice: normalizeNullableNumber(input.proposedPrice),
    availability: normalizeOptionalString(input.availability),
    message: normalizeRequiredString(input.message),
    validUntil: normalizeNullableDate(input.validUntil),
  };
}

function normalizeServices(services: string[]): string[] {
  return Array.from(
    new Set(services.map((service) => service.trim()).filter(Boolean)),
  ).slice(0, 20);
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeRequiredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeNullableDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getProposalSortColumn(sortBy: string): string {
  switch (sortBy) {
    case 'updatedAt':
      return 'proposal.updatedAt';
    case 'status':
      return 'proposal.status';
    case 'createdAt':
    default:
      return 'proposal.createdAt';
  }
}

function getAssignmentSortColumn(sortBy: string): string {
  switch (sortBy) {
    case 'status':
      return 'assignment.status';
    case 'createdAt':
    default:
      return 'assignment.createdAt';
  }
}

function toProposalResponse(
  proposal: ListingAgentProposal,
): ListingAgentProposalResponse {
  return {
    id: proposal.id,
    listingId: proposal.listingId,
    ownerUserId: proposal.ownerUserId,
    agentId: proposal.agentId,
    agencyId: proposal.agencyId ?? null,
    status: proposal.status,
    commissionType: proposal.commissionType ?? null,
    commissionValue: proposal.commissionValue ?? null,
    minimumContractMonths: proposal.minimumContractMonths ?? null,
    exclusivity: proposal.exclusivity ?? null,
    services: proposal.services ?? [],
    marketingPlan: proposal.marketingPlan ?? null,
    valuationOpinion: proposal.valuationOpinion ?? null,
    proposedPrice: proposal.proposedPrice ?? null,
    availability: proposal.availability ?? null,
    message: proposal.message ?? null,
    validUntil: proposal.validUntil ?? null,
    acceptedAt: proposal.acceptedAt ?? null,
    rejectedAt: proposal.rejectedAt ?? null,
    withdrawnAt: proposal.withdrawnAt ?? null,
    createdAt: proposal.createdAt,
    updatedAt: proposal.updatedAt,
    listing: proposal.listing ? toListingSummary(proposal.listing) : null,
    agent: proposal.agent ? toAgentSummary(proposal.agent) : null,
  };
}

function toAssignmentListItemResponse(assignment: ListingAgentAssignment) {
  return {
    ...toAssignmentResponse(assignment),
    listing: assignment.listing ? toListingSummary(assignment.listing) : null,
    proposal: assignment.proposal
      ? toProposalResponse(assignment.proposal)
      : null,
  };
}

function buildAgentListingCopy(
  sourceListing: Listing,
  assignment: ListingAgentAssignment,
  agentId: string,
): Partial<Listing> {
  const proposedPrice = assignment.proposal?.proposedPrice;

  return {
    title: sourceListing.publicTitle || sourceListing.title,
    description:
      sourceListing.publicDescription ||
      sourceListing.description ||
      'Opis do uzupełnienia po przejęciu współpracy.',
    propertyType: sourceListing.propertyType,
    transactionType: sourceListing.transactionType,
    price:
      proposedPrice !== null && proposedPrice !== undefined
        ? Number(proposedPrice)
        : Number(sourceListing.price),
    currency: sourceListing.currency,
    commissionType: sourceListing.commissionType ?? null,
    commissionValue: sourceListing.commissionValue ?? null,
    areaM2: sourceListing.areaM2,
    plotAreaM2: sourceListing.plotAreaM2,
    rooms: sourceListing.rooms,
    bathrooms: sourceListing.bathrooms,
    floor: sourceListing.floor,
    totalFloors: sourceListing.totalFloors,
    yearBuilt: sourceListing.yearBuilt,
    isPremium: false,
    status: ListingStatus.DRAFT,
    publicationStatus: ListingPublicationStatus.DRAFT,
    publicSlug: null,
    publicTitle: sourceListing.publicTitle || sourceListing.title,
    publicDescription:
      sourceListing.publicDescription || sourceListing.description || null,
    seoTitle: null,
    seoDescription: null,
    shareImageUrl: sourceListing.shareImageUrl ?? null,
    showPriceOnPublicPage: sourceListing.showPriceOnPublicPage,
    showExactAddressOnPublicPage: false,
    estateflowBrandingEnabled: true,
    showPublicViewCount: false,
    agentCollaborationEnabled: false,
    agentCollaborationMode: null,
    agentCollaborationStatus: null,
    agentCollaborationPreferences: null,
    agentCollaborationOpenedAt: null,
    agentCollaborationClosedAt: null,
    publishedAt: null,
    unpublishedAt: null,
    expiresAt: null,
    agentId,
    ownerUserId: null,
    sourceListingId: sourceListing.id,
    agentAssignmentId: assignment.id,
  };
}

function buildAgentListingAddressCopy(
  sourceListing: Listing,
  listingCopy: Listing,
): Partial<Address> {
  const sourceAddress = sourceListing.address;
  const canCopyExactAddress = sourceListing.showExactAddressOnPublicPage;

  return {
    street: canCopyExactAddress ? sourceAddress?.street : undefined,
    city: sourceAddress?.city || 'Nieznane',
    postalCode: canCopyExactAddress ? sourceAddress?.postalCode : undefined,
    district: sourceAddress?.district,
    voivodeship: sourceAddress?.voivodeship,
    lat: canCopyExactAddress ? sourceAddress?.lat : undefined,
    lng: canCopyExactAddress ? sourceAddress?.lng : undefined,
    listing: listingCopy,
  };
}

function toAssignmentResponse(
  assignment: ListingAgentAssignment,
): ListingAgentAssignmentResponse {
  return {
    id: assignment.id,
    listingId: assignment.listingId,
    proposalId: assignment.proposalId,
    ownerUserId: assignment.ownerUserId,
    agentId: assignment.agentId,
    agencyId: assignment.agencyId ?? null,
    status: assignment.status,
    acceptedTermsSnapshot: assignment.acceptedTermsSnapshot ?? {},
    agentListingId: assignment.agentListingId ?? null,
    createdAt: assignment.createdAt,
    revokedAt: assignment.revokedAt ?? null,
    completedAt: assignment.completedAt ?? null,
  };
}

function toRecruitmentResponse(listing: Listing): ListingAgentRecruitmentResponse {
  return {
    listingId: listing.id,
    agentCollaborationEnabled: listing.agentCollaborationEnabled,
    agentCollaborationMode: listing.agentCollaborationMode ?? null,
    agentCollaborationStatus: listing.agentCollaborationStatus ?? null,
    agentCollaborationOpenedAt: listing.agentCollaborationOpenedAt ?? null,
    agentCollaborationClosedAt: listing.agentCollaborationClosedAt ?? null,
  };
}

function toMessageResponse(
  message: ListingAgentProposalMessage,
  proposal: ListingAgentProposal,
): ListingAgentProposalMessageResponse {
  return {
    id: message.id,
    proposalId: message.proposalId,
    senderUserId: message.senderUserId,
    senderRole: getSenderRole(message.senderUserId, proposal),
    body: message.body,
    readAt: message.readAt ?? null,
    metadata: message.metadata ?? {},
    createdAt: message.createdAt,
  };
}

function getSenderRole(
  senderUserId: string,
  proposal: ListingAgentProposal,
): ListingAgentProposalParticipantRole {
  return proposal.ownerUserId === senderUserId ? 'owner' : 'agent';
}

function buildAcceptedTermsSnapshot(
  proposal: ListingAgentProposal,
): Record<string, unknown> {
  return {
    proposalId: proposal.id,
    commissionType: proposal.commissionType ?? null,
    commissionValue: proposal.commissionValue ?? null,
    minimumContractMonths: proposal.minimumContractMonths ?? null,
    exclusivity: proposal.exclusivity ?? null,
    services: proposal.services ?? [],
    marketingPlan: proposal.marketingPlan ?? null,
    valuationOpinion: proposal.valuationOpinion ?? null,
    proposedPrice: proposal.proposedPrice ?? null,
    availability: proposal.availability ?? null,
    message: proposal.message ?? null,
    validUntil: proposal.validUntil ?? null,
    acceptedAt: proposal.acceptedAt ?? null,
  };
}

function toListingSummary(
  listing: Listing,
): ListingAgentProposalResponse['listing'] {
  return {
    id: listing.id,
    slug: listing.publicSlug as string,
    title: listing.publicTitle || listing.title,
    city: listing.address?.city ?? null,
    district: listing.address?.district ?? null,
    price: listing.showPriceOnPublicPage ? listing.price : null,
    currency: listing.currency,
  };
}

function toAgentSummary(
  agent: ListingAgentProposal['agent'],
): ListingAgentProposalResponse['agent'] {
  return {
    id: agent.id,
    firstName: agent.firstName ?? null,
    lastName: agent.lastName ?? null,
    agency: agent.agency
      ? {
          id: agent.agency.id,
          name: agent.agency.name,
          logoUrl: agent.agency.logoUrl ?? null,
        }
      : null,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    typeof error.driverError === 'object' &&
    error.driverError !== null &&
    'code' in error.driverError &&
    error.driverError.code === UNIQUE_VIOLATION_CODE
  );
}
