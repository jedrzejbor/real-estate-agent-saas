import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { MonitoringService } from '../monitoring';
import {
  ListingPublicationStatus,
  ListingStatus,
} from '../common/enums';
import { Listing } from '../listings/entities/listing.entity';
import { Agency, Agent } from './entities';
import { AgencyLimitEnforcementService } from './agency-limit-enforcement.service';
import { AgencyPlanService } from './agency-plan.service';

export interface PlanLimitDowngradeEnforcementResult {
  agencyId: string;
  status:
    | 'skipped_no_limit'
    | 'skipped_no_agents'
    | 'skipped_within_limit'
    | 'skipped_grace_active'
    | 'enforced';
  limit: number | null;
  activeListingsUsage: number;
  keptListingIds: string[];
  excessListingIds: string[];
  archivedListingIds: string[];
  unpublishedListingIds: string[];
}

interface EnforceAgencyOptions {
  now?: Date;
  force?: boolean;
}

@Injectable()
export class AgencyLimitDowngradeEnforcementService {
  private readonly logger = new Logger(
    AgencyLimitDowngradeEnforcementService.name,
  );

  constructor(
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly agencyPlanService: AgencyPlanService,
    private readonly agencyLimitEnforcementService: AgencyLimitEnforcementService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async enforceExpiredListingGracePeriods(
    now = new Date(),
  ): Promise<PlanLimitDowngradeEnforcementResult[]> {
    const agencies = await this.agencyRepo
      .createQueryBuilder('agency')
      .where('agency.limitGraceEndsAt IS NOT NULL')
      .andWhere('agency.limitGraceEndsAt <= :now', { now })
      .andWhere(
        '(agency.limitGraceEnforcedAt IS NULL OR agency.limitGraceEnforcedAt < agency.limitGraceEndsAt)',
      )
      .getMany();

    const results: PlanLimitDowngradeEnforcementResult[] = [];

    for (const agency of agencies) {
      results.push(await this.enforceAgencyListingLimit(agency.id, { now }));
    }

    return results;
  }

  async enforceAgencyListingLimit(
    agencyId: string,
    options: EnforceAgencyOptions = {},
  ): Promise<PlanLimitDowngradeEnforcementResult> {
    const now = options.now ?? new Date();
    const agency = await this.agencyRepo.findOne({ where: { id: agencyId } });

    if (!agency) {
      throw new Error(`Agency ${agencyId} not found`);
    }

    const entitlements = this.agencyPlanService.getEntitlements(agency);
    const limit = entitlements.limits.activeListings;
    const baseResult = {
      agencyId,
      limit,
      activeListingsUsage: 0,
      keptListingIds: [],
      excessListingIds: [],
      archivedListingIds: [],
      unpublishedListingIds: [],
    };

    if (limit === null) {
      return { ...baseResult, status: 'skipped_no_limit' };
    }

    if (
      !options.force &&
      agency.limitGraceEndsAt &&
      agency.limitGraceEndsAt.getTime() > now.getTime()
    ) {
      return { ...baseResult, status: 'skipped_grace_active' };
    }

    const agents = await this.agentRepo.find({
      where: { agencyId },
      select: ['id'],
    });
    const agentIds = agents.map((agent) => agent.id);

    if (agentIds.length === 0) {
      return { ...baseResult, status: 'skipped_no_agents' };
    }

    const activeListings = await this.listingRepo.find({
      where: {
        agentId: In(agentIds),
        status: Not(ListingStatus.ARCHIVED),
      },
      order: {
        isPremium: 'DESC',
        publicationStatus: 'ASC',
        createdAt: 'DESC',
        id: 'ASC',
      },
    });
    const limitState =
      this.agencyLimitEnforcementService.evaluateResourceLimit(
        entitlements,
        'activeListings',
        activeListings.length,
        {
          gracePeriod: {
            startedAt: agency.limitGraceStartedAt,
            endsAt: agency.limitGraceEndsAt,
          },
          now,
        },
      );

    if (!limitState.isOverLimit) {
      return {
        ...baseResult,
        status: 'skipped_within_limit',
        activeListingsUsage: activeListings.length,
        keptListingIds: activeListings.map((listing) => listing.id),
      };
    }

    const orderedListings = this.sortListingsForLimitRetention(activeListings);
    const keptListings = orderedListings.slice(0, limit);
    const excessListings = orderedListings.slice(limit);
    const archivedListingIds = excessListings.map((listing) => listing.id);
    const publishedExcessListings = excessListings.filter(
      (listing) =>
        listing.publicationStatus === ListingPublicationStatus.PUBLISHED,
    );
    const unpublishedListingIds = publishedExcessListings.map(
      (listing) => listing.id,
    );

    if (excessListings.length > 0) {
      await this.listingRepo.update(
        { id: In(archivedListingIds) },
        {
          status: ListingStatus.ARCHIVED,
          publicationStatus: ListingPublicationStatus.UNPUBLISHED,
          unpublishedAt: now,
        },
      );
    }

    agency.limitGraceEnforcedAt = now;
    await this.agencyRepo.save(agency);

    const result: PlanLimitDowngradeEnforcementResult = {
      agencyId,
      status: 'enforced',
      limit,
      activeListingsUsage: activeListings.length,
      keptListingIds: keptListings.map((listing) => listing.id),
      excessListingIds: excessListings.map((listing) => listing.id),
      archivedListingIds,
      unpublishedListingIds,
    };

    this.monitoringService.recordWarning(
      'plan_limit_enforcement',
      'plan_limit_enforced',
      {
        agencyId,
        resource: 'activeListings',
        limit,
        usage: activeListings.length,
        excessCount: excessListings.length,
        archivedCount: archivedListingIds.length,
        unpublishedCount: unpublishedListingIds.length,
      },
    );
    this.logger.warn(
      `Plan limit enforcement completed for agency ${agencyId}: ` +
        `${archivedListingIds.length}/${excessListings.length} excess listings archived`,
    );

    return result;
  }

  private sortListingsForLimitRetention(listings: Listing[]): Listing[] {
    return [...listings].sort((left, right) => {
      const premiumDiff = Number(right.isPremium) - Number(left.isPremium);
      if (premiumDiff !== 0) return premiumDiff;

      const publishedDiff =
        Number(
          right.publicationStatus === ListingPublicationStatus.PUBLISHED,
        ) -
        Number(left.publicationStatus === ListingPublicationStatus.PUBLISHED);
      if (publishedDiff !== 0) return publishedDiff;

      const createdDiff =
        right.createdAt.getTime() - left.createdAt.getTime();
      if (createdDiff !== 0) return createdDiff;

      return left.id.localeCompare(right.id);
    });
  }
}
