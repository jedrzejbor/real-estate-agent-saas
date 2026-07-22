import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { EmailService } from '../email';
import {
  ListingAgentCollaborationStatus,
  ListingAgentProposalCommissionType,
  ListingAgentProposalStatus,
  ListingPublicationStatus,
  ListingStatus,
} from '../common/enums';
import { FeatureAccessDeniedException } from '../common/exceptions/feature-access-denied.exception';
import { Listing } from '../listings/entities';
import { UsersService } from '../users';
import {
  ListingAgentProposalInputDto,
  ListingAgentProposalQueryDto,
  UpdateListingAgentProposalDto,
} from './dto';
import { ListingAgentProposal } from './entities';
import {
  canEditListingAgentProposal,
  canTransitionListingAgentProposal,
} from './listing-agent-proposal-status';
import type {
  ListingAgentProposalPage,
  ListingAgentProposalResponse,
} from './listing-agent-proposals.types';

const UNIQUE_VIOLATION_CODE = '23505';
const ACTIVE_PROPOSAL_STATUSES = [
  ListingAgentProposalStatus.DRAFT,
  ListingAgentProposalStatus.SENT,
  ListingAgentProposalStatus.UPDATED,
] as const;

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
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

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
