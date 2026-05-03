import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import {
  Brackets,
  DataSource,
  EntityManager,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ActivityService } from '../activity';
import { AnalyticsService } from '../analytics';
import { Client } from '../clients/entities/client.entity';
import { ClientNote } from '../clients/entities/client-note.entity';
import { MonitoringService } from '../monitoring';
import {
  ActivityAction,
  ActivityEntityType,
  ClientSource,
  ListingPublicationStatus,
  PublicLeadSource,
  PublicLeadStatus,
} from '../common/enums';
import {
  assertPublicFormHoneypot,
  assertPublicFormTiming,
  assertPublicTextAllowed,
  assertRateLimit,
  getRequestFingerprint,
  normalizeContactFingerprint,
  normalizeOptional,
} from '../common/abuse-protection';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities';
import { CreatePublicLeadDto, PublicLeadQueryDto } from './dto';
import { PublicLead } from './entities';

const MIN_FORM_COMPLETION_MS = 2500;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const PHONE_DEDUP_MIN_DIGITS = 6;
const PHONE_DEDUP_MAX_SUFFIX_DIGITS = 9;
const PUBLIC_LEAD_IP_WINDOW_MS = 60 * 60 * 1000;
const PUBLIC_LEAD_IP_LIMIT = 8;
const PUBLIC_LEAD_LISTING_IP_LIMIT = 3;
const PUBLIC_LEAD_CONTACT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PUBLIC_LEAD_CONTACT_LIMIT = 5;
const MAX_LEAD_MESSAGE_LINKS = 1;

export interface PublicLeadSubmitResult {
  id: string;
  status: PublicLeadStatus;
  createdAt: Date;
  convertedClientId: string | null;
  conversion: 'created' | 'matched' | 'skipped';
}

export interface PublicLeadListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: PublicLeadSource;
  status: PublicLeadStatus;
  sourceUrl: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  contactConsent: boolean;
  marketingConsent: boolean;
  handledAt: Date | null;
  convertedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  listing: {
    id: string;
    title: string;
    publicSlug: string | null;
  } | null;
  convertedClient: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface PaginatedPublicLeads {
  data: PublicLeadListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class PublicLeadsService {
  private readonly logger = new Logger(PublicLeadsService.name);

  constructor(
    @InjectRepository(PublicLead)
    private readonly publicLeadRepo: Repository<PublicLead>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Agent)
    private readonly agentRepo: Repository<Agent>,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
    private readonly analyticsService: AnalyticsService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async findAll(
    userId: string,
    query: PublicLeadQueryDto,
  ): Promise<PaginatedPublicLeads> {
    const agent = await this.resolveAgent(userId);
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      source,
      listingId,
      search,
    } = query;

    const qb = this.publicLeadRepo
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.listing', 'listing')
      .leftJoinAndSelect('lead.convertedClient', 'convertedClient')
      .where('lead.agentId = :agentId', { agentId: agent.id });

    if (status) {
      qb.andWhere('lead.status = :status', { status });
    }

    if (source) {
      qb.andWhere('lead.source = :source', { source });
    }

    if (listingId) {
      qb.andWhere('lead.listingId = :listingId', { listingId });
    }

    if (search?.trim()) {
      const searchValue = `%${search.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(lead.fullName) LIKE LOWER(:search)', {
              search: searchValue,
            })
            .orWhere('LOWER(lead.email) LIKE LOWER(:search)', {
              search: searchValue,
            })
            .orWhere('LOWER(lead.phone) LIKE LOWER(:search)', {
              search: searchValue,
            })
            .orWhere('LOWER(listing.title) LIKE LOWER(:search)', {
              search: searchValue,
            })
            .orWhere('LOWER(listing.publicTitle) LIKE LOWER(:search)', {
              search: searchValue,
            });
        }),
      );
    }

    const allowedSortColumns = ['createdAt', 'status'];
    const column = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`lead.${column}`, sortOrder === 'ASC' ? 'ASC' : 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map(mapPublicLeadListItem),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createForPublicListing(
    slug: string,
    dto: CreatePublicLeadDto,
    request: Request,
  ): Promise<PublicLeadSubmitResult> {
    return this.monitoringService.monitor(
      {
        flow: 'public_lead_listing',
        failureEvent: 'lead_capture_failed',
        successEvent: 'lead_captured',
        context: { publicSlug: slug, source: dto.source },
        successContext: (result) => ({
          leadId: result.id,
          status: result.status,
          convertedClientId: result.convertedClientId,
          conversion: result.conversion,
        }),
      },
      () => this.createForPublicListingCore(slug, dto, request),
    );
  }

  private async createForPublicListingCore(
    slug: string,
    dto: CreatePublicLeadDto,
    request: Request,
  ): Promise<PublicLeadSubmitResult> {
    this.assertHumanSubmission(dto);
    this.assertContactable(dto);
    const fingerprint = getRequestFingerprint(request);

    const listing = await this.listingRepo.findOne({
      where: {
        publicSlug: slug,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
    });

    const publicSlug = listing?.publicSlug;
    if (!publicSlug) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const agent = await this.agentRepo.findOne({
      where: { id: listing.agentId },
      relations: ['agency', 'user'],
    });

    if (!agent) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const email = normalizeOptional(dto.email);
    const phone = normalizeOptional(dto.phone);
    await this.assertCreateRateLimits({
      listingId: listing.id,
      agentId: agent.id,
      ipHash: fingerprint.ipHash,
      email,
      phone,
    });
    const abuseReport = assertPublicTextAllowed(
      { message: dto.message, imageUrls: ['lead'] },
      { maxLinks: MAX_LEAD_MESSAGE_LINKS },
    );

    const conversion = await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const lead = manager.create(PublicLead, {
        fullName: dto.fullName.trim(),
        email,
        phone,
        message: normalizeOptional(dto.message),
        source: dto.source ?? PublicLeadSource.PUBLIC_LISTING_PAGE,
        status: PublicLeadStatus.NEW,
        publicSlugSnapshot: publicSlug,
        sourceUrl: normalizeOptional(dto.sourceUrl),
        referrer: normalizeOptional(dto.referrer),
        utmSource: normalizeOptional(dto.utmSource),
        utmMedium: normalizeOptional(dto.utmMedium),
        utmCampaign: normalizeOptional(dto.utmCampaign),
        utmTerm: normalizeOptional(dto.utmTerm),
        utmContent: normalizeOptional(dto.utmContent),
        contactConsent: dto.contactConsent,
        marketingConsent: dto.marketingConsent ?? false,
        consentText: normalizeOptional(dto.consentText),
        consentedAt: dto.contactConsent ? now : null,
        ipHash: fingerprint.ipHash,
        userAgent: fingerprint.userAgent,
        metadata: {
          ...sanitizeMetadata(dto.metadata),
          abuse: {
            riskScore: abuseReport.riskScore,
            signals: abuseReport.signals,
          },
        },
        listingId: listing.id,
        agentId: agent.id,
        agencyId: agent.agencyId ?? null,
      });

      const savedLead = await manager.save(PublicLead, lead);
      const clientMatch = await this.findMatchingClient(manager, {
        agentId: agent.id,
        email,
        phone,
      });

      const { client, conversion } = clientMatch
        ? {
            client: await this.updateMatchedClient(manager, clientMatch, {
              email,
              phone,
            }),
            conversion: 'matched' as const,
          }
        : {
            client: await this.createClientFromLead(manager, savedLead, {
              agentId: agent.id,
            }),
            conversion: 'created' as const,
          };

      await this.addSourceNote(manager, {
        client,
        lead: savedLead,
        agent,
        listing,
      });

      savedLead.status = PublicLeadStatus.CONVERTED_TO_CLIENT;
      savedLead.convertedClientId = client.id;
      savedLead.convertedAt = now;
      savedLead.handledAt = now;
      savedLead.metadata = {
        ...savedLead.metadata,
        crmConversion: {
          type: conversion,
          clientId: client.id,
          convertedAt: now.toISOString(),
        },
      };

      const convertedLead = await manager.save(PublicLead, savedLead);

      return {
        lead: convertedLead,
        client,
        conversion,
      };
    });

    this.logger.log(
      `Public lead captured: ${conversion.lead.id} for listing ${listing.id} and ${conversion.conversion} CRM client ${conversion.client.id}`,
    );

    await this.logClientActivity({
      agent,
      clientId: conversion.client.id,
      conversion: conversion.conversion,
    });

    await this.trackLeadAccepted({
      agent,
      listing,
      lead: conversion.lead,
      clientId: conversion.client.id,
      conversion: conversion.conversion,
    });

    return {
      id: conversion.lead.id,
      status: conversion.lead.status,
      createdAt: conversion.lead.createdAt,
      convertedClientId: conversion.client.id,
      conversion: conversion.conversion,
    };
  }

  async createForPublicAgentProfile(
    agentId: string,
    dto: CreatePublicLeadDto,
    request: Request,
  ): Promise<PublicLeadSubmitResult> {
    return this.monitoringService.monitor(
      {
        flow: 'public_lead_profile',
        failureEvent: 'lead_capture_failed',
        successEvent: 'lead_captured',
        context: { agentId, source: dto.source },
        successContext: (result) => ({
          leadId: result.id,
          status: result.status,
          convertedClientId: result.convertedClientId,
          conversion: result.conversion,
        }),
      },
      () => this.createForPublicAgentProfileCore(agentId, dto, request),
    );
  }

  private async createForPublicAgentProfileCore(
    agentId: string,
    dto: CreatePublicLeadDto,
    request: Request,
  ): Promise<PublicLeadSubmitResult> {
    this.assertHumanSubmission(dto);
    this.assertContactable(dto);
    const fingerprint = getRequestFingerprint(request);

    const agent = await this.agentRepo.findOne({
      where: { id: agentId },
      relations: ['agency', 'user'],
    });

    if (!agent) {
      throw new NotFoundException('Publiczny profil nie znaleziony');
    }

    const publishedListingsCount = await this.listingRepo.count({
      where: {
        agentId: agent.id,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
    });

    if (publishedListingsCount === 0) {
      throw new NotFoundException('Publiczny profil nie znaleziony');
    }

    const email = normalizeOptional(dto.email);
    const phone = normalizeOptional(dto.phone);
    await this.assertCreateRateLimits({
      agentId: agent.id,
      ipHash: fingerprint.ipHash,
      email,
      phone,
    });
    const abuseReport = assertPublicTextAllowed(
      { message: dto.message, imageUrls: ['lead'] },
      { maxLinks: MAX_LEAD_MESSAGE_LINKS },
    );

    const conversion = await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const lead = manager.create(PublicLead, {
        fullName: dto.fullName.trim(),
        email,
        phone,
        message: normalizeOptional(dto.message),
        source: dto.source ?? PublicLeadSource.PUBLIC_PROFILE,
        status: PublicLeadStatus.NEW,
        publicSlugSnapshot: `agent-profile-${agent.id}`,
        sourceUrl: normalizeOptional(dto.sourceUrl),
        referrer: normalizeOptional(dto.referrer),
        utmSource: normalizeOptional(dto.utmSource),
        utmMedium: normalizeOptional(dto.utmMedium),
        utmCampaign: normalizeOptional(dto.utmCampaign),
        utmTerm: normalizeOptional(dto.utmTerm),
        utmContent: normalizeOptional(dto.utmContent),
        contactConsent: dto.contactConsent,
        marketingConsent: dto.marketingConsent ?? false,
        consentText: normalizeOptional(dto.consentText),
        consentedAt: dto.contactConsent ? now : null,
        ipHash: fingerprint.ipHash,
        userAgent: fingerprint.userAgent,
        metadata: {
          ...sanitizeMetadata(dto.metadata),
          abuse: {
            riskScore: abuseReport.riskScore,
            signals: abuseReport.signals,
          },
        },
        listingId: null,
        agentId: agent.id,
        agencyId: agent.agencyId ?? null,
      });

      const savedLead = await manager.save(PublicLead, lead);
      const clientMatch = await this.findMatchingClient(manager, {
        agentId: agent.id,
        email,
        phone,
      });

      const { client, conversion } = clientMatch
        ? {
            client: await this.updateMatchedClient(manager, clientMatch, {
              email,
              phone,
            }),
            conversion: 'matched' as const,
          }
        : {
            client: await this.createClientFromLead(manager, savedLead, {
              agentId: agent.id,
            }),
            conversion: 'created' as const,
          };

      await this.addSourceNote(manager, {
        client,
        lead: savedLead,
        agent,
        listing: null,
      });

      savedLead.status = PublicLeadStatus.CONVERTED_TO_CLIENT;
      savedLead.convertedClientId = client.id;
      savedLead.convertedAt = now;
      savedLead.handledAt = now;
      savedLead.metadata = {
        ...savedLead.metadata,
        crmConversion: {
          type: conversion,
          clientId: client.id,
          convertedAt: now.toISOString(),
        },
      };

      const convertedLead = await manager.save(PublicLead, savedLead);

      return {
        lead: convertedLead,
        client,
        conversion,
      };
    });

    this.logger.log(
      `Public lead captured: ${conversion.lead.id} for agent profile ${agent.id} and ${conversion.conversion} CRM client ${conversion.client.id}`,
    );

    await this.logClientActivity({
      agent,
      clientId: conversion.client.id,
      conversion: conversion.conversion,
    });

    await this.trackLeadAccepted({
      agent,
      listing: null,
      lead: conversion.lead,
      clientId: conversion.client.id,
      conversion: conversion.conversion,
    });

    return {
      id: conversion.lead.id,
      status: conversion.lead.status,
      createdAt: conversion.lead.createdAt,
      convertedClientId: conversion.client.id,
      conversion: conversion.conversion,
    };
  }

  private async findMatchingClient(
    manager: EntityManager,
    input: { agentId: string; email: string | null; phone: string | null },
  ): Promise<Client | null> {
    const qb = manager
      .getRepository(Client)
      .createQueryBuilder('client')
      .where('client.agentId = :agentId', { agentId: input.agentId });

    const matchers: string[] = [];
    const params: Record<string, string | number> = {};

    if (input.email) {
      matchers.push('LOWER(client.email) = LOWER(:email)');
      params.email = input.email;
    }

    const phoneSuffix = normalizeComparablePhoneSuffix(input.phone);
    if (phoneSuffix && phoneSuffix.length >= PHONE_DEDUP_MIN_DIGITS) {
      matchers.push(
        "RIGHT(regexp_replace(client.phone, '\\D', '', 'g'), :phoneLength) = :phone",
      );
      params.phone = phoneSuffix;
      params.phoneLength = phoneSuffix.length;
    }

    if (matchers.length === 0) {
      return null;
    }

    return qb
      .andWhere(`(${matchers.join(' OR ')})`, params)
      .orderBy('client.createdAt', 'ASC')
      .getOne();
  }

  private async updateMatchedClient(
    manager: EntityManager,
    client: Client,
    input: { email: string | null; phone: string | null },
  ): Promise<Client> {
    let shouldSave = false;

    if (!client.email && input.email) {
      client.email = input.email;
      shouldSave = true;
    }

    if (!client.phone && input.phone) {
      client.phone = input.phone;
      shouldSave = true;
    }

    if (!shouldSave) {
      return client;
    }

    return manager.save(Client, client);
  }

  private async createClientFromLead(
    manager: EntityManager,
    lead: PublicLead,
    input: { agentId: string },
  ): Promise<Client> {
    const { firstName, lastName } = splitFullName(lead.fullName);
    const client = manager.create(Client, {
      firstName,
      lastName,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      source: ClientSource.WEBSITE,
      notes: buildClientInitialNotes(lead),
      agentId: input.agentId,
    });

    return manager.save(Client, client);
  }

  private async addSourceNote(
    manager: EntityManager,
    input: {
      client: Client;
      lead: PublicLead;
      agent: Agent;
      listing: Listing | null;
    },
  ): Promise<void> {
    const note = manager.create(ClientNote, {
      content: buildClientSourceNote(input.lead, input.listing),
      client: { id: input.client.id } as Client,
      agent: { id: input.agent.id } as Agent,
    });

    await manager.save(ClientNote, note);
  }

  private async logClientActivity(input: {
    agent: Agent;
    clientId: string;
    conversion: 'created' | 'matched';
  }): Promise<void> {
    if (!input.agent.userId) {
      return;
    }

    await this.activityService.log({
      userId: input.agent.userId,
      entityType: ActivityEntityType.CLIENT,
      entityId: input.clientId,
      action:
        input.conversion === 'created'
          ? ActivityAction.CREATED
          : ActivityAction.UPDATED,
      description:
        input.conversion === 'created'
          ? 'Utworzono klienta z formularza publicznego'
          : 'Powiązano publiczny lead z istniejącym klientem',
    });
  }

  private async trackLeadAccepted(input: {
    agent: Agent;
    listing: Listing | null;
    lead: PublicLead;
    clientId: string;
    conversion: 'created' | 'matched';
  }): Promise<void> {
    if (!input.agent.userId) {
      return;
    }

    try {
      await this.analyticsService.track(input.agent.userId, {
        name: 'public_lead_accepted',
        path:
          input.lead.sourceUrl ?? `/oferty/${input.lead.publicSlugSnapshot}`,
        properties: {
          funnelStage: 'accepted',
          listingId: input.listing?.id ?? null,
          publicSlug: input.lead.publicSlugSnapshot,
          publicLeadId: input.lead.id,
          clientId: input.clientId,
          conversion: input.conversion,
          leadStatus: input.lead.status,
          source: input.lead.source,
          hasEmail: Boolean(input.lead.email),
          hasPhone: Boolean(input.lead.phone),
          hasMessage: Boolean(input.lead.message),
          marketingConsent: input.lead.marketingConsent,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to track public lead accepted event for lead ${input.lead.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private assertHumanSubmission(dto: CreatePublicLeadDto): void {
    assertPublicFormHoneypot(dto.website);
    assertPublicFormTiming(dto.formStartedAt, {
      minCompletionMs: MIN_FORM_COMPLETION_MS,
      maxAgeMs: MAX_FORM_AGE_MS,
    });
  }

  private assertContactable(dto: CreatePublicLeadDto): void {
    if (!dto.contactConsent) {
      throw new BadRequestException('Zgoda na kontakt jest wymagana');
    }

    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException('Podaj email albo numer telefonu');
    }
  }

  private async resolveAgent(userId: string): Promise<Agent> {
    const agent = await this.agentRepo.findOne({ where: { userId } });

    if (!agent) {
      throw new NotFoundException('Profil agenta nie znaleziony');
    }

    return agent;
  }

  private async assertCreateRateLimits(input: {
    listingId?: string | null;
    agentId?: string | null;
    ipHash: string | null;
    email: string | null;
    phone: string | null;
  }): Promise<void> {
    const now = Date.now();

    if (input.ipHash) {
      const windowStart = new Date(now - PUBLIC_LEAD_IP_WINDOW_MS);
      const contextWhere: { listingId: string } | { agentId: string } =
        input.listingId
          ? { listingId: input.listingId }
          : { agentId: input.agentId ?? '' };

      if ('agentId' in contextWhere && !contextWhere.agentId) {
        throw new BadRequestException('Brak kontekstu publicznego leada');
      }

      const [ipUsage, listingIpUsage] = await Promise.all([
        this.publicLeadRepo.count({
          where: {
            ipHash: input.ipHash,
            createdAt: MoreThanOrEqual(windowStart),
          },
        }),
        this.publicLeadRepo.count({
          where: {
            ...contextWhere,
            ipHash: input.ipHash,
            createdAt: MoreThanOrEqual(windowStart),
          },
        }),
      ]);

      assertRateLimit(ipUsage, PUBLIC_LEAD_IP_LIMIT);
      assertRateLimit(listingIpUsage, PUBLIC_LEAD_LISTING_IP_LIMIT);
    }

    const contactFingerprints = [
      normalizeContactFingerprint(input.email),
      normalizeContactFingerprint(input.phone),
    ].filter((value): value is string => Boolean(value));

    if (contactFingerprints.length === 0) {
      return;
    }

    const contactWindowStart = new Date(now - PUBLIC_LEAD_CONTACT_WINDOW_MS);
    const contactUsage = await this.publicLeadRepo
      .createQueryBuilder('lead')
      .where('lead.createdAt >= :contactWindowStart', { contactWindowStart })
      .andWhere(
        new Brackets((qb) => {
          if (input.email) {
            qb.where('LOWER(lead.email) = LOWER(:email)', {
              email: input.email,
            });
          }

          if (input.phone) {
            const method = input.email ? 'orWhere' : 'where';
            qb[method]('lead.phone = :phone', { phone: input.phone });
          }
        }),
      )
      .getCount();

    assertRateLimit(contactUsage, PUBLIC_LEAD_CONTACT_LIMIT);
  }
}

function mapPublicLeadListItem(lead: PublicLead): PublicLeadListItem {
  return {
    id: lead.id,
    fullName: lead.fullName,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    message: lead.message ?? null,
    source: lead.source,
    status: lead.status,
    sourceUrl: lead.sourceUrl ?? null,
    referrer: lead.referrer ?? null,
    utmSource: lead.utmSource ?? null,
    utmMedium: lead.utmMedium ?? null,
    utmCampaign: lead.utmCampaign ?? null,
    contactConsent: lead.contactConsent,
    marketingConsent: lead.marketingConsent,
    handledAt: lead.handledAt ?? null,
    convertedAt: lead.convertedAt ?? null,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    listing: lead.listing
      ? {
          id: lead.listing.id,
          title: lead.listing.publicTitle || lead.listing.title,
          publicSlug: lead.listing.publicSlug ?? null,
        }
      : null,
    convertedClient: lead.convertedClient
      ? {
          id: lead.convertedClient.id,
          firstName: lead.convertedClient.firstName,
          lastName: lead.convertedClient.lastName,
        }
      : null,
  };
}

function normalizeComparablePhoneSuffix(
  value: string | undefined | null,
): string | null {
  const digits = value?.replace(/\D/g, '');
  return digits ? digits.slice(-PHONE_DEDUP_MAX_SUFFIX_DIGITS) : null;
}

function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: 'Nieznane', lastName: 'zapytanie' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'z formularza' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function buildClientInitialNotes(lead: PublicLead): string {
  const lines = [
    lead.listingId
      ? 'Klient utworzony automatycznie z publicznego formularza oferty.'
      : 'Klient utworzony automatycznie z publicznego formularza profilu.',
  ];

  if (lead.message) {
    lines.push('', 'Wiadomość:', lead.message);
  }

  return lines.join('\n');
}

function buildClientSourceNote(
  lead: PublicLead,
  listing: Listing | null,
): string {
  const title = listing?.publicTitle || listing?.title;
  const lines = [
    title
      ? `Źródło: publiczna oferta "${title}"`
      : 'Źródło: publiczny profil agenta / biura',
    `Publiczny lead: ${lead.id}`,
  ];

  if (lead.sourceUrl) {
    lines.push(`URL: ${lead.sourceUrl}`);
  }

  if (lead.message) {
    lines.push('', 'Wiadomość z formularza:', lead.message);
  }

  return lines.join('\n');
}

function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) =>
      ['string', 'number', 'boolean'].includes(typeof value),
    ),
  );
}
