import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UsersService } from '../users';
import { ListingPublicationStatus } from '../common/enums';
import { Listing } from '../listings/entities/listing.entity';
import { MonitoringService } from '../monitoring';
import { Agent } from '../users/entities/agent.entity';
import { BlogPost, BlogPostStatus } from '../blog/entities/blog-post.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { AdminAnalyticsUsageQueryDto } from './dto/admin-analytics-usage-query.dto';
import {
  CreateAnalyticsEventDto,
  CreatePublicBlogAnalyticsEventDto,
  CreatePublicListingAnalyticsEventDto,
} from './dto/create-analytics-event.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    @InjectRepository(BlogPost)
    private readonly blogPostRepo: Repository<BlogPost>,
    private readonly usersService: UsersService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async track(userId: string, dto: CreateAnalyticsEventDto) {
    const access = await this.usersService.getAgencyAccessContext(userId);

    const event = this.analyticsEventRepo.create({
      name: dto.name,
      userId,
      agentId: access.agent?.id ?? null,
      agencyId: access.agency?.id ?? null,
      planCode: access.entitlements.plan.code,
      path: dto.path ?? null,
      properties: dto.properties ?? {},
    });

    const savedEvent = await this.analyticsEventRepo.save(event);

    this.logger.debug(
      `Analytics event tracked: ${savedEvent.name} (${savedEvent.id})`,
    );

    return {
      id: savedEvent.id,
      name: savedEvent.name,
      createdAt: savedEvent.createdAt,
    };
  }

  async getAdminUsageSummary(query: AdminAnalyticsUsageQueryDto) {
    const days = query.days ?? 30;
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [summary, topEvents, dailyEvents, recentEvents] = await Promise.all([
      this.getAnalyticsUsageTotals(from),
      this.getTopAnalyticsEvents(from),
      this.getDailyAnalyticsEvents(from),
      this.getRecentAnalyticsEvents(from),
    ]);

    return {
      period: {
        from: from.toISOString(),
        to: now.toISOString(),
        days,
      },
      summary,
      topEvents,
      dailyEvents,
      recentEvents,
    };
  }

  async trackPublicListing(
    slug: string,
    dto: CreatePublicListingAnalyticsEventDto,
  ) {
    return this.monitoringService.monitor(
      {
        flow: 'public_analytics_event',
        failureEvent: 'event_track_failed',
        context: { publicSlug: slug, eventName: dto.name },
      },
      () => this.trackPublicListingCore(slug, dto),
    );
  }

  async trackPublicBlog(slug: string, dto: CreatePublicBlogAnalyticsEventDto) {
    return this.monitoringService.monitor(
      {
        flow: 'public_blog_analytics_event',
        failureEvent: 'event_track_failed',
        context: { blogSlug: slug, eventName: dto.name },
      },
      () => this.trackPublicBlogCore(slug, dto),
    );
  }

  private async trackPublicListingCore(
    slug: string,
    dto: CreatePublicListingAnalyticsEventDto,
  ) {
    const listing = await this.listingRepo.findOne({
      where: {
        publicSlug: slug,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
    });

    if (!listing?.publicSlug || isListingExpired(listing)) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const agent = await this.agentRepo.findOne({
      where: { id: listing.agentId },
      relations: ['agency'],
    });

    if (!agent?.userId) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const event = this.analyticsEventRepo.create({
      name: dto.name,
      userId: agent.userId,
      agentId: agent.id,
      agencyId: agent.agencyId ?? null,
      planCode: agent.agency?.plan ?? null,
      path: dto.path ?? `/oferty/${listing.publicSlug}`,
      properties: {
        ...dto.properties,
        listingId: listing.id,
        publicSlug: listing.publicSlug,
      },
    });

    const savedEvent = await this.analyticsEventRepo.save(event);

    this.logger.debug(
      `Public listing analytics event tracked: ${savedEvent.name} (${savedEvent.id})`,
    );

    if (savedEvent.name === 'public_listing_abuse_reported') {
      this.monitoringService.recordWarning(
        'public_analytics_event',
        'abuse_reported',
        {
          analyticsEventId: savedEvent.id,
          listingId: listing.id,
          publicSlug: listing.publicSlug,
        },
      );
    }

    return {
      id: savedEvent.id,
      name: savedEvent.name,
      createdAt: savedEvent.createdAt,
    };
  }

  private async getAnalyticsUsageTotals(from: Date) {
    const row = await this.analyticsEventRepo
      .createQueryBuilder('event')
      .select('COUNT(*)', 'totalEvents')
      .addSelect('COUNT(DISTINCT event.user_id)', 'activeUsers')
      .addSelect('COUNT(DISTINCT event.agent_id)', 'activeAgents')
      .addSelect('COUNT(DISTINCT event.agency_id)', 'activeAgencies')
      .where('event.createdAt >= :from', { from })
      .getRawOne<{
        totalEvents: string | null;
        activeUsers: string | null;
        activeAgents: string | null;
        activeAgencies: string | null;
      }>();

    return {
      totalEvents: parseCount(row?.totalEvents),
      activeUsers: parseCount(row?.activeUsers),
      activeAgents: parseCount(row?.activeAgents),
      activeAgencies: parseCount(row?.activeAgencies),
    };
  }

  private async getTopAnalyticsEvents(from: Date) {
    const rows = await this.analyticsEventRepo
      .createQueryBuilder('event')
      .select('event.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :from', { from })
      .groupBy('event.name')
      .orderBy('COUNT(*)', 'DESC')
      .addOrderBy('event.name', 'ASC')
      .limit(12)
      .getRawMany<{ name: string; count: string }>();

    return rows.map((row) => ({
      name: row.name,
      count: parseCount(row.count),
    }));
  }

  private async getDailyAnalyticsEvents(from: Date) {
    const rows = await this.analyticsEventRepo
      .createQueryBuilder('event')
      .select(
        `to_char(date_trunc('day', event."createdAt"), 'YYYY-MM-DD')`,
        'date',
      )
      .addSelect('COUNT(*)', 'count')
      .where('event.createdAt >= :from', { from })
      .groupBy(`date_trunc('day', event."createdAt")`)
      .orderBy(`date_trunc('day', event."createdAt")`, 'ASC')
      .getRawMany<{ date: string; count: string }>();

    return rows.map((row) => ({
      date: row.date,
      count: parseCount(row.count),
    }));
  }

  private async getRecentAnalyticsEvents(from: Date) {
    const events = await this.analyticsEventRepo.find({
      where: { createdAt: MoreThanOrEqual(from) },
      order: { createdAt: 'DESC' },
      take: 12,
      select: {
        id: true,
        name: true,
        path: true,
        planCode: true,
        createdAt: true,
      },
    });

    return events.map((event) => ({
      id: event.id,
      name: event.name,
      path: event.path,
      planCode: event.planCode,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  private async trackPublicBlogCore(
    slug: string,
    dto: CreatePublicBlogAnalyticsEventDto,
  ) {
    const post = await this.blogPostRepo.findOne({
      where: {
        slug,
        status: BlogPostStatus.PUBLISHED,
      },
    });

    if (!post?.publishedAt || post.publishedAt.getTime() > Date.now()) {
      throw new NotFoundException('Wpis blogowy nie znaleziony');
    }

    const event = this.analyticsEventRepo.create({
      name: dto.name,
      userId: null,
      agentId: null,
      agencyId: null,
      planCode: null,
      path: dto.path ?? `/blog/${post.slug}`,
      properties: {
        ...dto.properties,
        postId: post.id,
        postSlug: post.slug,
        postTitle: post.title,
      },
    });

    const savedEvent = await this.analyticsEventRepo.save(event);

    this.logger.debug(
      `Public blog analytics event tracked: ${savedEvent.name} (${savedEvent.id})`,
    );

    return {
      id: savedEvent.id,
      name: savedEvent.name,
      createdAt: savedEvent.createdAt,
    };
  }
}

function parseCount(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isListingExpired(listing: { expiresAt?: Date | null }): boolean {
  return Boolean(
    listing.expiresAt && listing.expiresAt.getTime() <= Date.now(),
  );
}
