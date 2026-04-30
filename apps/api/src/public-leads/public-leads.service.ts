import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import {
  ListingPublicationStatus,
  PublicLeadSource,
  PublicLeadStatus,
} from '../common/enums';
import { Listing } from '../listings/entities/listing.entity';
import { Agent } from '../users/entities';
import { CreatePublicLeadDto } from './dto';
import { PublicLead } from './entities';

const MIN_FORM_COMPLETION_MS = 2500;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

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
  ) {}

  async createForPublicListing(
    slug: string,
    dto: CreatePublicLeadDto,
    request: Request,
  ) {
    this.assertHumanSubmission(dto);
    this.assertContactable(dto);

    const listing = await this.listingRepo.findOne({
      where: {
        publicSlug: slug,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
      },
    });

    if (!listing?.publicSlug) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const agent = await this.agentRepo.findOne({
      where: { id: listing.agentId },
      relations: ['agency'],
    });

    if (!agent) {
      throw new NotFoundException('Publiczna oferta nie znaleziona');
    }

    const now = new Date();
    const lead = this.publicLeadRepo.create({
      fullName: dto.fullName.trim(),
      email: normalizeOptional(dto.email),
      phone: normalizeOptional(dto.phone),
      message: normalizeOptional(dto.message),
      source: dto.source ?? PublicLeadSource.PUBLIC_LISTING_PAGE,
      status: PublicLeadStatus.NEW,
      publicSlugSnapshot: listing.publicSlug,
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
      ipHash: hashIp(getClientIp(request)),
      userAgent: normalizeOptional(request.get('user-agent')),
      metadata: sanitizeMetadata(dto.metadata),
      listingId: listing.id,
      agentId: agent.id,
      agencyId: agent.agencyId ?? null,
    });

    const savedLead = await this.publicLeadRepo.save(lead);

    this.logger.log(
      `Public lead captured: ${savedLead.id} for listing ${listing.id}`,
    );

    return {
      id: savedLead.id,
      status: savedLead.status,
      createdAt: savedLead.createdAt,
    };
  }

  private assertHumanSubmission(dto: CreatePublicLeadDto): void {
    if (dto.website?.trim()) {
      throw new BadRequestException('Nie udało się zapisać formularza');
    }

    if (!dto.formStartedAt) {
      return;
    }

    const elapsed = Date.now() - dto.formStartedAt;
    if (elapsed < MIN_FORM_COMPLETION_MS || elapsed > MAX_FORM_AGE_MS) {
      throw new BadRequestException('Spróbuj wysłać formularz ponownie');
    }
  }

  private assertContactable(dto: CreatePublicLeadDto): void {
    if (!dto.contactConsent) {
      throw new BadRequestException('Zgoda na kontakt jest wymagana');
    }

    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException('Podaj email albo numer telefonu');
    }
  }
}

function normalizeOptional(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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

function getClientIp(request: Request): string | null {
  const forwardedFor = request.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.ip || null;
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;

  return createHash('sha256').update(ip).digest('hex');
}
