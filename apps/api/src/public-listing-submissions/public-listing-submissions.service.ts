import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import type { Request } from 'express';
import { DataSource, In, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { ActivityService } from '../activity';
import { EmailService } from '../email';
import { Address } from '../listings/entities/address.entity';
import { Listing } from '../listings/entities/listing.entity';
import { ListingImage } from '../listings/entities/listing-image.entity';
import { UsersService } from '../users';
import {
  ActivityAction,
  ActivityEntityType,
  ListingStatus,
  PropertyType,
  PublicListingSubmissionSource,
  PublicListingSubmissionStatus,
  TransactionType,
} from '../common/enums';
import {
  assertPublicFormHoneypot,
  assertPublicFormTiming,
  assertPublicTextAllowed,
  assertRateLimit,
  getRequestFingerprint,
  normalizeOptional,
} from '../common/abuse-protection';
import {
  evaluatePublicListingModeration,
  getModeratedListingState,
  type PublicListingModerationResult,
} from '../common/public-listing-moderation';
import { PlanLimitReachedException } from '../common/exceptions/plan-limit-reached.exception';
import {
  ClaimPublicListingSubmissionDto,
  CreatePublicListingSubmissionDto,
  VerifyPublicListingSubmissionDto,
} from './dto';
import {
  PublicListingSubmission,
  type PublicListingSubmissionPayload,
} from './entities';

const MIN_FORM_COMPLETION_MS = 5000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_VERIFICATION_EMAILS = 5;
const SUBMISSION_IP_WINDOW_MS = 60 * 60 * 1000;
const SUBMISSION_IP_LIMIT = 5;
const SUBMISSION_CONTACT_WINDOW_MS = 24 * 60 * 60 * 1000;
const SUBMISSION_CONTACT_LIMIT = 3;
const RESEND_IP_WINDOW_MS = 60 * 60 * 1000;
const RESEND_IP_LIMIT = 10;
const MAX_DESCRIPTION_LINKS = 2;

interface TokenPair {
  token: string;
  hash: string;
}

export interface PublicListingSubmissionCreatedResult {
  id: string;
  status: PublicListingSubmissionStatus;
  emailMasked: string;
  expiresAt: Date;
}

export interface PublicListingSubmissionVerificationResult {
  id: string;
  status: PublicListingSubmissionStatus;
  verifiedAt: Date;
  claimToken: string;
}

export interface PublicListingSubmissionResendResult {
  success: true;
  emailMasked: string;
  expiresAt: Date;
}

export interface PublicListingSubmissionClaimResult {
  id: string;
  status: PublicListingSubmissionStatus;
  listingId: string;
  publicSlug: string | null;
  claimedAt: Date;
  reviewRequired: boolean;
  moderationReasons: string[];
}

@Injectable()
export class PublicListingSubmissionsService {
  private readonly logger = new Logger(PublicListingSubmissionsService.name);

  constructor(
    @InjectRepository(PublicListingSubmission)
    private readonly submissionRepo: Repository<PublicListingSubmission>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async create(
    dto: CreatePublicListingSubmissionDto,
    request: Request,
  ): Promise<PublicListingSubmissionCreatedResult> {
    this.assertHumanSubmission(dto);
    this.assertConsents(dto);

    const now = new Date();
    const fingerprint = getRequestFingerprint(request);
    await this.assertCreateRateLimits(dto, fingerprint.ipHash, now);
    const abuseReport = assertPublicTextAllowed(
      {
        title: dto.listing.title,
        description: dto.listing.description,
        imageUrls: dto.images?.map((image) => image.url),
      },
      { maxLinks: MAX_DESCRIPTION_LINKS },
    );
    const verification = createTokenPair();
    const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MS);

    const submission = this.submissionRepo.create({
      status: PublicListingSubmissionStatus.PENDING_EMAIL_VERIFICATION,
      source: dto.source ?? PublicListingSubmissionSource.PUBLIC_WIZARD,
      ownerName: dto.ownerName.trim(),
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone.trim(),
      agencyName: normalizeOptional(dto.agencyName),
      contactConsent: dto.contactConsent,
      termsConsent: dto.termsConsent,
      marketingConsent: dto.marketingConsent ?? false,
      consentText: normalizeOptional(dto.consentText),
      consentedAt: now,
      verificationTokenHash: verification.hash,
      verificationExpiresAt: expiresAt,
      verificationEmailSentAt: now,
      verificationEmailCount: 1,
      ipHash: fingerprint.ipHash,
      userAgent: fingerprint.userAgent,
      payload: buildSubmissionPayload(dto),
      metadata: {
        ...sanitizeMetadata(dto.metadata),
        abuse: {
          riskScore: abuseReport.riskScore,
          signals: abuseReport.signals,
        },
      },
      sourceUrl: normalizeOptional(dto.sourceUrl),
      referrer: normalizeOptional(dto.referrer),
      utmSource: normalizeOptional(dto.utmSource),
      utmMedium: normalizeOptional(dto.utmMedium),
      utmCampaign: normalizeOptional(dto.utmCampaign),
    });

    const saved = await this.submissionRepo.save(submission);
    await this.sendVerificationEmail(saved, verification.token);

    this.logger.log(`Public listing submission created: ${saved.id}`);

    return {
      id: saved.id,
      status: saved.status,
      emailMasked: maskEmail(saved.email),
      expiresAt,
    };
  }

  async resendVerification(
    id: string,
    request: Request,
  ): Promise<PublicListingSubmissionResendResult> {
    const submission = await this.submissionRepo.findOne({ where: { id } });

    if (!submission) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }

    if (
      submission.status !==
      PublicListingSubmissionStatus.PENDING_EMAIL_VERIFICATION
    ) {
      throw new BadRequestException('Zgłoszenie nie oczekuje na weryfikację');
    }

    const now = new Date();
    await this.assertResendRateLimit(
      getRequestFingerprint(request).ipHash,
      now,
    );

    if (
      submission.verificationEmailSentAt &&
      now.getTime() - submission.verificationEmailSentAt.getTime() <
        RESEND_COOLDOWN_MS
    ) {
      throw new BadRequestException(
        'Poczekaj chwilę przed ponowną wysyłką emaila',
      );
    }

    if (submission.verificationEmailCount >= MAX_VERIFICATION_EMAILS) {
      throw new BadRequestException(
        'Osiągnięto limit wysyłek linku weryfikacyjnego',
      );
    }

    const verification = createTokenPair();
    const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MS);

    submission.verificationTokenHash = verification.hash;
    submission.verificationExpiresAt = expiresAt;
    submission.verificationEmailSentAt = now;
    submission.verificationEmailCount += 1;

    const saved = await this.submissionRepo.save(submission);
    await this.sendVerificationEmail(saved, verification.token);

    return {
      success: true,
      emailMasked: maskEmail(saved.email),
      expiresAt,
    };
  }

  async verify(
    dto: VerifyPublicListingSubmissionDto,
  ): Promise<PublicListingSubmissionVerificationResult> {
    const tokenHash = hashToken(dto.token);
    const submission = await this.submissionRepo.findOne({
      where: { verificationTokenHash: tokenHash },
    });

    if (!submission) {
      throw new BadRequestException('Nieprawidłowy link weryfikacyjny');
    }

    if (submission.status === PublicListingSubmissionStatus.VERIFIED) {
      if (!submission.verifiedAt) {
        throw new BadRequestException('Nieprawidłowy stan weryfikacji');
      }

      const claimToken = createTokenPair();
      submission.claimTokenHash = claimToken.hash;
      await this.submissionRepo.save(submission);

      return {
        id: submission.id,
        status: submission.status,
        verifiedAt: submission.verifiedAt,
        claimToken: claimToken.token,
      };
    }

    if (
      submission.status !==
      PublicListingSubmissionStatus.PENDING_EMAIL_VERIFICATION
    ) {
      throw new BadRequestException('Nie można zweryfikować tego zgłoszenia');
    }

    if (
      !submission.verificationExpiresAt ||
      submission.verificationExpiresAt.getTime() < Date.now()
    ) {
      submission.status = PublicListingSubmissionStatus.EXPIRED;
      submission.expiredAt = new Date();
      submission.verificationTokenHash = null;
      await this.submissionRepo.save(submission);
      throw new BadRequestException('Link weryfikacyjny wygasł');
    }

    const now = new Date();
    const claimToken = createTokenPair();
    submission.status = PublicListingSubmissionStatus.VERIFIED;
    submission.verifiedAt = now;
    submission.verificationTokenHash = null;
    submission.claimTokenHash = claimToken.hash;

    const saved = await this.submissionRepo.save(submission);

    return {
      id: saved.id,
      status: saved.status,
      verifiedAt: saved.verifiedAt ?? now,
      claimToken: claimToken.token,
    };
  }

  async claim(
    userId: string,
    dto: ClaimPublicListingSubmissionDto,
  ): Promise<PublicListingSubmissionClaimResult> {
    const claimTokenHash = hashToken(dto.claimToken);
    const submission = await this.submissionRepo.findOne({
      where: { claimTokenHash },
    });

    if (!submission) {
      throw new BadRequestException('Nieprawidłowy token przejęcia oferty');
    }

    if (submission.status !== PublicListingSubmissionStatus.VERIFIED) {
      throw new BadRequestException('To zgłoszenie nie może zostać przejęte');
    }

    const access = await this.usersService.getAgencyAccessContext(userId);
    await this.assertListingCreateWithinPlanLimit(access);

    const now = new Date();
    const moderation = evaluateSubmissionModeration(submission);
    const listingState = getModeratedListingState(moderation);
    const claimed = await this.dataSource.transaction(async (manager) => {
      const listing = manager.create(Listing, {
        ...buildListingDataFromPayload(submission.payload),
        agentId: access.agent.id,
        status: listingState.status,
        publicationStatus: listingState.publicationStatus,
        publicSlug: moderation.reviewRequired
          ? null
          : await this.generateUniquePublicSlug(submission.payload),
        publishedAt: listingState.publishedAt,
        unpublishedAt: null,
      });

      const savedListing = await manager.save(Listing, listing);
      const address = manager.create(Address, {
        ...buildAddressDataFromPayload(submission.payload),
        listing: savedListing,
      });
      await manager.save(Address, address);

      const images = buildImageDataFromPayload(submission.payload).map(
        (image, index) =>
          manager.create(ListingImage, {
            ...image,
            order: image.order ?? index,
            isPrimary: index === 0,
            listing: savedListing,
          }),
      );

      if (images.length > 0) {
        await manager.save(ListingImage, images);
      }

      submission.status = PublicListingSubmissionStatus.CLAIMED;
      submission.claimedAt = now;
      submission.publishedAt = moderation.reviewRequired ? null : now;
      submission.publishedListingId = savedListing.id;
      submission.claimedAgentId = access.agent.id;
      submission.claimedAgencyId = access.agency?.id ?? null;
      submission.claimTokenHash = null;
      submission.metadata = {
        ...submission.metadata,
        claim: {
          listingId: savedListing.id,
          agentId: access.agent.id,
          agencyId: access.agency?.id ?? null,
          claimedAt: now.toISOString(),
        },
        moderation,
      };
      const savedSubmission = await manager.save(
        PublicListingSubmission,
        submission,
      );

      return { listing: savedListing, submission: savedSubmission };
    });

    await this.activityService.log({
      userId,
      entityType: ActivityEntityType.LISTING,
      entityId: claimed.listing.id,
      action: ActivityAction.CLAIMED,
      description: 'Przejęto ofertę z publicznego zgłoszenia',
      changes: [
        {
          field: 'publicListingSubmissionId',
          oldValue: null,
          newValue: claimed.submission.id,
        },
      ],
    });

    this.logger.log(
      `Public listing submission claimed: ${claimed.submission.id} -> listing ${claimed.listing.id}`,
    );

    return {
      id: claimed.submission.id,
      status: claimed.submission.status,
      listingId: claimed.listing.id,
      publicSlug: claimed.listing.publicSlug ?? null,
      claimedAt: claimed.submission.claimedAt ?? now,
      reviewRequired: moderation.reviewRequired,
      moderationReasons: moderation.reasons,
    };
  }

  private async sendVerificationEmail(
    submission: PublicListingSubmission,
    token: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const verificationUrl = `${frontendUrl}/dodaj-oferte/potwierdzono?token=${encodeURIComponent(token)}`;

    await this.emailService.send({
      to: submission.email,
      subject: 'Potwierdź dodanie oferty',
      text: [
        `Cześć ${submission.ownerName},`,
        '',
        'Kliknij link, aby potwierdzić dodanie publicznej oferty:',
        verificationUrl,
        '',
        'Link jest ważny przez 48 godzin.',
      ].join('\n'),
    });
  }

  private assertHumanSubmission(dto: CreatePublicListingSubmissionDto): void {
    assertPublicFormHoneypot(dto.website);
    assertPublicFormTiming(dto.formStartedAt, {
      minCompletionMs: MIN_FORM_COMPLETION_MS,
      maxAgeMs: MAX_FORM_AGE_MS,
    });
  }

  private assertConsents(dto: CreatePublicListingSubmissionDto): void {
    if (!dto.contactConsent) {
      throw new BadRequestException('Zgoda na kontakt jest wymagana');
    }

    if (!dto.termsConsent) {
      throw new BadRequestException('Akceptacja regulaminu jest wymagana');
    }
  }

  private async assertListingCreateWithinPlanLimit(
    access: Awaited<ReturnType<UsersService['getAgencyAccessContext']>>,
  ): Promise<void> {
    const limit = access.entitlements.limits.activeListings;

    if (limit === null) {
      return;
    }

    const currentUsage = await this.listingRepo.count({
      where: {
        agentId: In(access.agencyAgentIds),
        status: Not(ListingStatus.ARCHIVED),
      },
    });

    if (currentUsage >= limit) {
      throw new PlanLimitReachedException({
        resource: 'listings',
        limit,
        currentUsage,
        planCode: access.entitlements.plan.code,
        message:
          'Osiągnięto limit aktywnych ofert w Twoim planie. Przejdź na wyższy plan, aby przejąć kolejną ofertę.',
      });
    }
  }

  private async assertCreateRateLimits(
    dto: CreatePublicListingSubmissionDto,
    ipHash: string | null,
    now: Date,
  ): Promise<void> {
    if (ipHash) {
      const ipWindowStart = new Date(now.getTime() - SUBMISSION_IP_WINDOW_MS);
      const ipUsage = await this.submissionRepo.count({
        where: {
          ipHash,
          createdAt: MoreThanOrEqual(ipWindowStart),
        },
      });
      assertRateLimit(ipUsage, SUBMISSION_IP_LIMIT);
    }

    const contactWindowStart = new Date(
      now.getTime() - SUBMISSION_CONTACT_WINDOW_MS,
    );
    const [emailUsage, phoneUsage] = await Promise.all([
      this.submissionRepo.count({
        where: {
          email: dto.email.toLowerCase().trim(),
          createdAt: MoreThanOrEqual(contactWindowStart),
        },
      }),
      this.submissionRepo.count({
        where: {
          phone: dto.phone.trim(),
          createdAt: MoreThanOrEqual(contactWindowStart),
        },
      }),
    ]);

    assertRateLimit(emailUsage, SUBMISSION_CONTACT_LIMIT);
    assertRateLimit(phoneUsage, SUBMISSION_CONTACT_LIMIT);
  }

  private async assertResendRateLimit(
    ipHash: string | null,
    now: Date,
  ): Promise<void> {
    if (!ipHash) {
      return;
    }

    const windowStart = new Date(now.getTime() - RESEND_IP_WINDOW_MS);
    const currentUsage = await this.submissionRepo.count({
      where: {
        ipHash,
        verificationEmailSentAt: MoreThanOrEqual(windowStart),
      },
    });

    assertRateLimit(
      currentUsage,
      RESEND_IP_LIMIT,
      'Zbyt wiele prób wysyłki emaila. Spróbuj ponownie później.',
    );
  }

  private async generateUniquePublicSlug(
    payload: PublicListingSubmissionPayload,
  ): Promise<string> {
    const listing = payload.listing ?? {};
    const address = payload.address ?? {};
    const title = getString(listing.title, 'oferta');
    const city = getString(address.city, '');
    const baseSlug = slugify([title, city].filter(Boolean).join(' '));
    const fallbackSlug = `oferta-${randomBytes(4).toString('hex')}`;
    const slugBase = (baseSlug || fallbackSlug).slice(0, 140);

    for (let attempt = 0; attempt < 20; attempt++) {
      const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
      const candidate = `${slugBase}${suffix}`.slice(0, 160);
      const existing = await this.listingRepo.findOne({
        where: { publicSlug: candidate },
        select: ['id'],
      });

      if (!existing) {
        return candidate;
      }
    }

    return `${slugBase}-${randomBytes(4).toString('hex')}`.slice(0, 160);
  }
}

function buildListingDataFromPayload(
  payload: PublicListingSubmissionPayload,
): Partial<Listing> {
  const listing = payload.listing ?? {};
  const publicSettings = payload.publicSettings ?? {};
  const title = getString(listing.title, 'Oferta nieruchomości');
  const description = getOptionalString(listing.description);
  const publicTitle = getNullableString(publicSettings.publicTitle) ?? title;
  const publicDescription =
    getNullableString(publicSettings.publicDescription) ?? description;

  return {
    title,
    description,
    propertyType: getEnumValue(
      listing.propertyType,
      Object.values(PropertyType),
      PropertyType.APARTMENT,
    ),
    transactionType: getEnumValue(
      listing.transactionType,
      Object.values(TransactionType),
      TransactionType.SALE,
    ),
    price: getNumber(listing.price, 1),
    currency: getString(listing.currency, 'PLN').slice(0, 3),
    areaM2: getOptionalNumber(listing.areaM2),
    plotAreaM2: getOptionalNumber(listing.plotAreaM2),
    rooms: getOptionalNumber(listing.rooms),
    bathrooms: getOptionalNumber(listing.bathrooms),
    floor: getOptionalNumber(listing.floor),
    totalFloors: getOptionalNumber(listing.totalFloors),
    yearBuilt: getOptionalNumber(listing.yearBuilt),
    isPremium: false,
    publicTitle,
    publicDescription,
    seoTitle: buildSeoTitle(publicTitle, payload.address),
    seoDescription: buildSeoDescription(publicDescription, payload.address),
    shareImageUrl: getFirstImageUrl(payload),
    showPriceOnPublicPage: true,
    showExactAddressOnPublicPage: Boolean(
      publicSettings.showExactAddressOnPublicPage,
    ),
    estateflowBrandingEnabled: true,
  };
}

function evaluateSubmissionModeration(
  submission: PublicListingSubmission,
): PublicListingModerationResult {
  const listing = submission.payload.listing ?? {};
  const images = submission.payload.images ?? [];

  return evaluatePublicListingModeration({
    title: getNullableString(listing.title),
    description: getNullableString(listing.description),
    price: getNullableNumber(listing.price),
    areaM2: getNullableNumber(listing.areaM2),
    transactionType: getNullableString(listing.transactionType),
    imageUrls: images
      .map((image) => getNullableString(image.url))
      .filter((url): url is string => Boolean(url)),
    storedAbuse: getStoredAbuseReport(submission.metadata),
  });
}

function getStoredAbuseReport(
  metadata: Record<string, unknown> | null | undefined,
): { riskScore?: unknown; signals?: unknown } | null {
  const abuse = metadata?.abuse;
  return typeof abuse === 'object' && abuse !== null
    ? (abuse as { riskScore?: unknown; signals?: unknown })
    : null;
}

function buildAddressDataFromPayload(
  payload: PublicListingSubmissionPayload,
): Partial<Address> {
  const address = payload.address ?? {};

  return {
    street: getOptionalString(address.street),
    city: getString(address.city, 'Nieznane miasto'),
    postalCode: getOptionalString(address.postalCode),
    district: getOptionalString(address.district),
    voivodeship: getOptionalString(address.voivodeship),
  };
}

function buildImageDataFromPayload(
  payload: PublicListingSubmissionPayload,
): Array<Partial<ListingImage>> {
  return (payload.images ?? []).slice(0, 15).flatMap((image) => {
    const url = getOptionalString(image.url);

    if (!url) {
      return [];
    }

    return [
      {
        url,
        altText: getOptionalString(image.altText),
        order: getOptionalNumber(image.order) ?? 0,
      },
    ];
  });
}

function getString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getOptionalString(value: unknown): string | undefined {
  return getNullableString(value) ?? undefined;
}

function getNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getOptionalNumber(value: unknown): number | undefined {
  return getNullableNumber(value) ?? undefined;
}

function getEnumValue<T extends string>(
  value: unknown,
  allowedValues: T[],
  fallback: T,
): T {
  return typeof value === 'string' && allowedValues.includes(value as T)
    ? (value as T)
    : fallback;
}

function getFirstImageUrl(
  payload: PublicListingSubmissionPayload,
): string | null {
  const firstImage = payload.images?.find((image) =>
    getNullableString(image.url),
  );
  return firstImage ? getNullableString(firstImage.url) : null;
}

function buildSeoTitle(
  title: string,
  address: Record<string, unknown> | undefined,
): string {
  const city = getNullableString(address?.city);
  return `${title}${city ? `, ${city}` : ''}`.slice(0, 70);
}

function buildSeoDescription(
  description: string | undefined,
  address: Record<string, unknown> | undefined,
): string {
  if (description) {
    return description.replace(/\s+/g, ' ').slice(0, 180);
  }

  const city = getNullableString(address?.city);
  return `Sprawdź szczegóły publicznej oferty nieruchomości${city ? ` w ${city}` : ''} w EstateFlow.`.slice(
    0,
    180,
  );
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildSubmissionPayload(
  dto: CreatePublicListingSubmissionDto,
): PublicListingSubmission['payload'] {
  return {
    listing: {
      ...dto.listing,
      currency: dto.listing.currency ?? 'PLN',
    },
    publicSettings: {
      ...dto.publicSettings,
      publicTitle: dto.publicSettings?.publicTitle ?? dto.listing.title,
      publicDescription:
        dto.publicSettings?.publicDescription ??
        dto.listing.description ??
        null,
      estateflowBrandingEnabled: true,
      showExactAddressOnPublicPage:
        dto.publicSettings?.showExactAddressOnPublicPage ?? false,
    },
    address: { ...dto.address },
    images: dto.images?.map((image) => ({ ...image })) ?? [],
    utm: {
      utmSource: dto.utmSource ?? null,
      utmMedium: dto.utmMedium ?? null,
      utmCampaign: dto.utmCampaign ?? null,
    },
    referrer: dto.referrer ?? null,
  };
}

function createTokenPair(): TokenPair {
  const token = randomBytes(VERIFICATION_TOKEN_BYTES).toString('base64url');
  return {
    token,
    hash: hashToken(token),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return '***';
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${'*'.repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}
