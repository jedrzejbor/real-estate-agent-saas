import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import type { Request } from 'express';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { DataSource, In, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { ActivityService } from '../activity';
import { AnalyticsEvent } from '../analytics/entities/analytics-event.entity';
import { EmailService } from '../email';
import { Address } from '../listings/entities/address.entity';
import { Listing } from '../listings/entities/listing.entity';
import { ListingImage } from '../listings/entities/listing-image.entity';
import { MonitoringService } from '../monitoring';
import { PublicLead } from '../public-leads/entities';
import { UsersService } from '../users';
import {
  ActivityAction,
  ActivityEntityType,
  ListingStatus,
  ListingPublicationStatus,
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
import { assertSafeImageUpload } from '../common/image-upload-security';
import {
  ClaimPublicListingSubmissionDto,
  CreatePublicListingSubmissionDto,
  RejectPublicListingSubmissionDto,
  UpdateSellerPublicListingSubmissionDto,
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
const SELLER_LISTING_PUBLICATION_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const EXPIRING_SOON_REMINDER_DAYS = 7;
const EXPIRING_SOON_REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

interface TokenPair {
  token: string;
  hash: string;
}

interface UploadedSubmissionImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

export interface PublicListingSubmissionUploadedImage {
  url: string;
  altText: string | null;
  order: number;
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

export interface SellerPublicListingSubmissionListItem {
  id: string;
  status: PublicListingSubmissionStatus;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price: number | null;
  currency: string;
  city: string | null;
  primaryImageUrl: string | null;
  publishedListingId: string | null;
  publishedListingSlug: string | null;
  publicationStatus: ListingPublicationStatus | null;
  viewCount: number | null;
  inquiryCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
  expiresAt: Date | null;
  claimedAt: Date | null;
  rejectedAt: Date | null;
  expiredAt: Date | null;
}

export interface SellerPublicListingSubmissionDetail extends SellerPublicListingSubmissionListItem {
  listing: PublicListingSubmissionPayload['listing'];
  address: PublicListingSubmissionPayload['address'];
  publicSettings: PublicListingSubmissionPayload['publicSettings'];
  images: NonNullable<PublicListingSubmissionPayload['images']>;
  ownerName: string;
  email: string;
  phone: string;
  agencyName: string | null;
}

export interface AdminPublicListingSubmissionListItem {
  id: string;
  status: PublicListingSubmissionStatus;
  ownerName: string;
  email: string;
  phone: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price: number | null;
  currency: string;
  city: string | null;
  createdAt: Date;
  verifiedAt: Date | null;
  claimedAt: Date | null;
  publishedListingId: string;
  publishedListingSlug: string | null;
  publicationStatus: ListingPublicationStatus;
}

export interface ExpiringListingReminderResult {
  processed: number;
  sent: number;
  skipped: number;
}

@Injectable()
export class PublicListingSubmissionsService {
  private readonly logger = new Logger(PublicListingSubmissionsService.name);

  constructor(
    @InjectRepository(PublicListingSubmission)
    private readonly submissionRepo: Repository<PublicListingSubmission>,
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsEventRepo: Repository<AnalyticsEvent>,
    @InjectRepository(PublicLead)
    private readonly publicLeadRepo: Repository<PublicLead>,
    private readonly dataSource: DataSource,
    private readonly activityService: ActivityService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly monitoringService: MonitoringService,
  ) {}

  async create(
    dto: CreatePublicListingSubmissionDto,
    request: Request,
    ownerUserId?: string | null,
  ): Promise<PublicListingSubmissionCreatedResult> {
    return this.monitoringService.monitor(
      {
        flow: 'public_submission_create',
        failureEvent: 'submission_create_failed',
        successEvent: 'submission_created',
        context: { source: dto.source },
        successContext: (result) => ({
          submissionId: result.id,
          status: result.status,
        }),
      },
      () => this.createCore(dto, request, ownerUserId),
    );
  }

  private async createCore(
    dto: CreatePublicListingSubmissionDto,
    request: Request,
    ownerUserId?: string | null,
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
      ownerUserId: ownerUserId ?? null,
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

  async findForOwner(
    ownerUserId: string,
  ): Promise<SellerPublicListingSubmissionListItem[]> {
    const submissions = await this.submissionRepo.find({
      where: { ownerUserId },
      relations: ['publishedListing'],
      order: { createdAt: 'DESC' },
      take: 100,
    });

    await this.attachSellerSubmissionStats(submissions);

    return submissions.map((submission) => toSellerListItem(submission));
  }

  async findPendingAdminReview(): Promise<
    AdminPublicListingSubmissionListItem[]
  > {
    const submissions = await this.submissionRepo
      .createQueryBuilder('submission')
      .innerJoinAndSelect('submission.publishedListing', 'listing')
      .where('submission.status = :status', {
        status: PublicListingSubmissionStatus.CLAIMED,
      })
      .andWhere('listing.publicationStatus = :publicationStatus', {
        publicationStatus: ListingPublicationStatus.DRAFT,
      })
      .orderBy('submission.claimedAt', 'ASC', 'NULLS LAST')
      .addOrderBy('submission.createdAt', 'ASC')
      .take(100)
      .getMany();

    return submissions.map(toAdminListItem);
  }

  async findOneForOwner(
    ownerUserId: string,
    id: string,
  ): Promise<SellerPublicListingSubmissionDetail> {
    const submission = await this.findOwnedSubmissionOrFail(ownerUserId, id);

    return toSellerDetail(submission);
  }

  async updateForOwner(
    ownerUserId: string,
    id: string,
    dto: UpdateSellerPublicListingSubmissionDto,
  ): Promise<SellerPublicListingSubmissionDetail> {
    const submission = await this.findOwnedSubmissionOrFail(ownerUserId, id);
    this.assertSellerSubmissionEditable(submission);

    if (dto.listing) {
      submission.payload = {
        ...submission.payload,
        listing: sanitizePayloadObject(dto.listing),
      };
    }

    if (dto.address) {
      submission.payload = {
        ...submission.payload,
        address: sanitizePayloadObject(dto.address),
      };
    }

    if (dto.publicSettings) {
      submission.payload = {
        ...submission.payload,
        publicSettings: sanitizePayloadObject(dto.publicSettings),
      };
    }

    if (dto.images) {
      submission.payload = {
        ...submission.payload,
        images: dto.images.slice(0, 15).map((image, index) => ({
          url: image.url,
          altText: normalizeOptional(image.altText),
          order: image.order ?? index,
        })),
      };
    }

    if (dto.ownerName !== undefined) {
      submission.ownerName = dto.ownerName.trim();
    }

    if (dto.email !== undefined) {
      submission.email = dto.email.toLowerCase().trim();
    }

    if (dto.phone !== undefined) {
      submission.phone = dto.phone.trim();
    }

    if (dto.agencyName !== undefined) {
      submission.agencyName = normalizeOptional(dto.agencyName);
    }

    if (dto.metadata) {
      submission.metadata = {
        ...submission.metadata,
        sellerEdit: {
          ...sanitizeMetadata(dto.metadata),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    const saved = await this.submissionRepo.save(submission);

    return toSellerDetail(saved);
  }

  async renewForOwner(
    ownerUserId: string,
    id: string,
  ): Promise<SellerPublicListingSubmissionDetail> {
    const submission = await this.findOwnedSubmissionOrFail(ownerUserId, id);
    const listing = submission.publishedListing;

    if (!listing) {
      throw new BadRequestException('Ogłoszenie nie jest jeszcze opublikowane');
    }

    if (!listing.publicSlug) {
      throw new BadRequestException('Ogłoszenie wymaga jeszcze weryfikacji');
    }

    const now = new Date();
    const expiresAt = buildSellerListingExpiresAt(now);

    listing.expiresAt = expiresAt;
    listing.unpublishedAt = null;
    listing.status = ListingStatus.ACTIVE;
    listing.publicationStatus = ListingPublicationStatus.PUBLISHED;
    listing.publishedAt = listing.publishedAt ?? now;

    submission.expiresAt = expiresAt;
    submission.expiredAt = null;
    submission.metadata = {
      ...submission.metadata,
      sellerRenewal: {
        renewedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    };

    const savedSubmission = await this.dataSource.transaction(
      async (manager) => {
        await manager.save(Listing, listing);
        return manager.save(PublicListingSubmission, submission);
      },
    );

    return toSellerDetail({
      ...savedSubmission,
      publishedListing: listing,
    });
  }

  async unpublishForOwner(
    ownerUserId: string,
    id: string,
  ): Promise<SellerPublicListingSubmissionDetail> {
    const submission = await this.findOwnedSubmissionOrFail(ownerUserId, id);
    const listing = submission.publishedListing;

    if (!listing) {
      throw new BadRequestException('Ogłoszenie nie jest jeszcze opublikowane');
    }

    if (listing.publicationStatus !== ListingPublicationStatus.PUBLISHED) {
      throw new BadRequestException('Ogłoszenie nie jest obecnie opublikowane');
    }

    const now = new Date();
    listing.publicationStatus = ListingPublicationStatus.UNPUBLISHED;
    listing.unpublishedAt = now;
    submission.metadata = {
      ...submission.metadata,
      sellerUnpublish: {
        unpublishedAt: now.toISOString(),
      },
    };

    const savedSubmission = await this.dataSource.transaction(
      async (manager) => {
        await manager.save(Listing, listing);
        return manager.save(PublicListingSubmission, submission);
      },
    );

    return toSellerDetail({
      ...savedSubmission,
      publishedListing: listing,
    });
  }

  async resubmitForOwner(
    ownerUserId: string,
    id: string,
  ): Promise<SellerPublicListingSubmissionDetail> {
    const submission = await this.findOwnedSubmissionOrFail(ownerUserId, id);

    if (submission.status !== PublicListingSubmissionStatus.REJECTED) {
      throw new BadRequestException(
        'Tylko odrzucone zgłoszenie można wysłać ponownie do weryfikacji',
      );
    }

    const listing = submission.publishedListing;

    if (!listing) {
      throw new BadRequestException('Zgłoszenie nie ma powiązanego ogłoszenia');
    }

    const now = new Date();
    const previousStatus = submission.status;

    Object.assign(listing, buildListingDataFromPayload(submission.payload));
    listing.status = ListingStatus.DRAFT;
    listing.publicationStatus = ListingPublicationStatus.DRAFT;
    listing.publishedAt = null;
    listing.unpublishedAt = now;
    listing.expiresAt = null;

    submission.status = PublicListingSubmissionStatus.CLAIMED;
    submission.publishedAt = null;
    submission.expiresAt = null;
    submission.rejectedAt = null;
    submission.metadata = {
      ...submission.metadata,
      sellerResubmission: {
        resubmittedAt: now.toISOString(),
      },
    };

    const savedSubmission = await this.dataSource.transaction(
      async (manager) => {
        await manager.save(Listing, listing);

        const existingAddress = await manager.findOne(Address, {
          where: { listing: { id: listing.id } },
        });
        await manager.save(
          Address,
          manager.create(Address, {
            ...(existingAddress ? { id: existingAddress.id } : {}),
            ...buildAddressDataFromPayload(submission.payload),
            listing,
          }),
        );

        await manager
          .createQueryBuilder()
          .delete()
          .from(ListingImage)
          .where('listing_id = :listingId', { listingId: listing.id })
          .execute();
        const imageData = sortImageDataByPrimary(
          buildImageDataFromPayload(submission.payload),
        );
        const primaryImageIndex = getPrimaryImageIndex(imageData);
        const images = imageData.map((image, index) =>
          manager.create(ListingImage, {
            ...image,
            order: index,
            isPrimary: index === primaryImageIndex,
            listing,
          }),
        );

        if (images.length > 0) {
          await manager.save(ListingImage, images);
        }

        return manager.save(PublicListingSubmission, submission);
      },
    );

    await this.activityService.log({
      userId: ownerUserId,
      entityType: ActivityEntityType.LISTING,
      entityId: listing.id,
      action: ActivityAction.STATUS_CHANGED,
      description:
        'Wysłano poprawione publiczne zgłoszenie do ponownej weryfikacji',
      changes: [
        {
          field: 'publicListingSubmissionStatus',
          oldValue: previousStatus,
          newValue: PublicListingSubmissionStatus.CLAIMED,
        },
      ],
    });

    return toSellerDetail({
      ...savedSubmission,
      publishedListing: listing,
    });
  }

  async sendExpiringSoonReminders(
    now = new Date(),
  ): Promise<ExpiringListingReminderResult> {
    const windowStart = new Date(
      now.getTime() +
        EXPIRING_SOON_REMINDER_DAYS * EXPIRING_SOON_REMINDER_WINDOW_MS,
    );
    const windowEnd = new Date(
      windowStart.getTime() + EXPIRING_SOON_REMINDER_WINDOW_MS,
    );
    const submissions = await this.submissionRepo
      .createQueryBuilder('submission')
      .innerJoinAndSelect('submission.publishedListing', 'listing')
      .where('submission.status = :status', {
        status: PublicListingSubmissionStatus.CLAIMED,
      })
      .andWhere('submission.ownerUserId IS NOT NULL')
      .andWhere('submission.expiresAt >= :windowStart')
      .andWhere('submission.expiresAt < :windowEnd')
      .orderBy('submission.expiresAt', 'ASC')
      .take(250)
      .setParameters({ windowStart, windowEnd })
      .getMany();
    const candidates = submissions.filter((submission) => {
      const listing = submission.publishedListing;
      const expiresAt = listing?.expiresAt ?? submission.expiresAt;

      return Boolean(
        listing &&
        listing.publicationStatus === ListingPublicationStatus.PUBLISHED &&
        expiresAt &&
        expiresAt >= windowStart &&
        expiresAt < windowEnd,
      );
    });

    let sent = 0;
    let skipped = 0;

    for (const submission of candidates) {
      const listing = submission.publishedListing;
      const expiresAt = listing?.expiresAt ?? submission.expiresAt;

      if (!listing || !expiresAt) {
        skipped += 1;
        continue;
      }

      if (hasSentExpiryReminder(submission.metadata, expiresAt)) {
        skipped += 1;
        continue;
      }

      await this.sendExpiryReminderEmail(submission, listing, expiresAt);
      submission.metadata = {
        ...submission.metadata,
        expiryReminder7Days: {
          sentAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      };
      await this.submissionRepo.save(submission);
      sent += 1;
    }

    return {
      processed: candidates.length,
      sent,
      skipped,
    };
  }

  async uploadImages(
    files: UploadedSubmissionImageFile[],
  ): Promise<{ images: PublicListingSubmissionUploadedImage[] }> {
    return this.monitoringService.monitor(
      {
        flow: 'public_submission_upload',
        failureEvent: 'image_upload_failed',
        successEvent: 'images_uploaded',
        context: {
          fileCount: files.length,
          totalBytes: files.reduce(
            (sum, file) => sum + (file.buffer?.length ?? 0),
            0,
          ),
        },
        successContext: (result) => ({
          imageCount: result.images.length,
        }),
      },
      () => this.uploadImagesCore(files),
    );
  }

  private async uploadImagesCore(
    files: UploadedSubmissionImageFile[],
  ): Promise<{ images: PublicListingSubmissionUploadedImage[] }> {
    if (!files.length) {
      throw new BadRequestException('Wybierz co najmniej jedno zdjęcie');
    }

    const uploadDir = join(process.cwd(), 'uploads', 'public-submissions');
    await mkdir(uploadDir, { recursive: true });

    const images: PublicListingSubmissionUploadedImage[] = [];

    for (const [index, file] of files.entries()) {
      assertSafeImageUpload(file);

      const filename = `${randomBytes(16).toString('hex')}${normalizeImageExtension(
        file.originalname,
        file.mimetype,
      )}`;
      const filePath = join(uploadDir, filename);

      await writeFile(filePath, file.buffer);
      images.push({
        url: this.buildUploadPublicUrl(filename),
        altText: null,
        order: index,
      });
    }

    return { images };
  }

  private buildUploadPublicUrl(filename: string): string {
    const configuredBaseUrl =
      this.configService.get<string>('API_PUBLIC_URL') ||
      this.configService.get<string>('PUBLIC_API_URL') ||
      `http://localhost:${this.configService.get('PORT', 4000)}`;
    const baseUrl = configuredBaseUrl.replace(/\/+$/, '');

    return `${baseUrl}/uploads/public-submissions/${filename}`;
  }

  async resendVerification(
    id: string,
    request: Request,
  ): Promise<PublicListingSubmissionResendResult> {
    return this.monitoringService.monitor(
      {
        flow: 'public_submission_resend',
        failureEvent: 'verification_resend_failed',
        successEvent: 'verification_resent',
        context: { submissionId: id },
      },
      () => this.resendVerificationCore(id, request),
    );
  }

  private async resendVerificationCore(
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
    return this.monitoringService.monitor(
      {
        flow: 'public_submission_verify',
        failureEvent: 'verification_failed',
        successEvent: 'submission_verified',
        successContext: (result) => ({
          submissionId: result.id,
          status: result.status,
        }),
      },
      () => this.verifyCore(dto),
    );
  }

  private async verifyCore(
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
      this.monitoringService.recordWarning(
        'public_submission_verify',
        'verification_expired',
        { submissionId: submission.id },
      );
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
    return this.monitoringService.monitor(
      {
        flow: 'public_submission_claim',
        failureEvent: 'claim_failed',
        successEvent: 'submission_claimed',
        context: { userId },
        successContext: (result) => ({
          submissionId: result.id,
          listingId: result.listingId,
          publicSlug: result.publicSlug,
          status: result.status,
          reviewRequired: result.reviewRequired,
          moderationReasons: result.moderationReasons,
        }),
      },
      () => this.claimCore(userId, dto),
    );
  }

  private async claimCore(
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
    const ownerUserId = submission.ownerUserId ?? userId;
    const publicationExpiresAt =
      ownerUserId && !moderation.reviewRequired
        ? buildSellerListingExpiresAt(now)
        : null;
    const claimed = await this.dataSource.transaction(async (manager) => {
      const listing = manager.create(Listing, {
        ...buildListingDataFromPayload(submission.payload),
        agentId: access.agent.id,
        ownerUserId,
        status: listingState.status,
        publicationStatus: listingState.publicationStatus,
        publicSlug: moderation.reviewRequired
          ? null
          : await this.generateUniquePublicSlug(submission.payload),
        publishedAt: listingState.publishedAt,
        unpublishedAt: null,
        expiresAt: publicationExpiresAt,
      });

      const savedListing = await manager.save(Listing, listing);
      const address = manager.create(Address, {
        ...buildAddressDataFromPayload(submission.payload),
        listing: savedListing,
      });
      await manager.save(Address, address);

      const imageData = sortImageDataByPrimary(
        buildImageDataFromPayload(submission.payload),
      );
      const primaryImageIndex = getPrimaryImageIndex(imageData);
      const images = imageData.map((image, index) =>
        manager.create(ListingImage, {
          ...image,
          order: index,
          isPrimary: index === primaryImageIndex,
          listing: savedListing,
        }),
      );

      if (images.length > 0) {
        await manager.save(ListingImage, images);
      }

      submission.status = PublicListingSubmissionStatus.CLAIMED;
      submission.claimedAt = now;
      submission.publishedAt = moderation.reviewRequired ? null : now;
      submission.expiresAt = publicationExpiresAt;
      submission.publishedListingId = savedListing.id;
      submission.ownerUserId = ownerUserId;
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

  async approveByAdmin(
    adminUserId: string,
    id: string,
  ): Promise<SellerPublicListingSubmissionDetail> {
    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['publishedListing'],
    });

    if (!submission) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }

    if (submission.status !== PublicListingSubmissionStatus.CLAIMED) {
      throw new BadRequestException(
        'Tylko przejęte zgłoszenie może zostać zatwierdzone',
      );
    }

    const listing = submission.publishedListing;

    if (!listing) {
      throw new BadRequestException('Zgłoszenie nie ma powiązanego ogłoszenia');
    }

    if (!submission.ownerUserId || !listing.ownerUserId) {
      throw new BadRequestException(
        'Nie można zatwierdzić ogłoszenia bez przypisanego właściciela',
      );
    }

    const now = new Date();
    const expiresAt = listing.expiresAt ?? buildSellerListingExpiresAt(now);

    listing.status = ListingStatus.ACTIVE;
    listing.publicationStatus = ListingPublicationStatus.PUBLISHED;
    listing.publicSlug =
      listing.publicSlug ??
      (await this.generateUniquePublicSlug(submission.payload));
    listing.publishedAt = listing.publishedAt ?? now;
    listing.unpublishedAt = null;
    listing.expiresAt = expiresAt;

    submission.publishedAt = submission.publishedAt ?? now;
    submission.expiresAt = expiresAt;
    submission.rejectedAt = null;
    submission.metadata = {
      ...submission.metadata,
      adminApproval: {
        approvedByUserId: adminUserId,
        approvedAt: now.toISOString(),
      },
    };

    const savedSubmission = await this.dataSource.transaction(
      async (manager) => {
        await manager.save(Listing, listing);
        return manager.save(PublicListingSubmission, submission);
      },
    );

    await this.activityService.log({
      userId: adminUserId,
      entityType: ActivityEntityType.LISTING,
      entityId: listing.id,
      action: ActivityAction.PUBLISHED,
      description: 'Zatwierdzono publiczne zgłoszenie ogłoszenia',
      changes: [
        {
          field: 'publicListingSubmissionId',
          oldValue: null,
          newValue: submission.id,
        },
      ],
    });

    await this.sendApprovalEmail(savedSubmission, listing);

    return toSellerDetail({
      ...savedSubmission,
      publishedListing: listing,
    });
  }

  async rejectByAdmin(
    adminUserId: string,
    id: string,
    dto: RejectPublicListingSubmissionDto,
  ): Promise<SellerPublicListingSubmissionDetail> {
    const reason = dto.reason.trim();

    if (!reason) {
      throw new BadRequestException('Powód odrzucenia jest wymagany');
    }

    const submission = await this.submissionRepo.findOne({
      where: { id },
      relations: ['publishedListing'],
    });

    if (!submission) {
      throw new NotFoundException('Zgłoszenie nie znalezione');
    }

    if (submission.status !== PublicListingSubmissionStatus.CLAIMED) {
      throw new BadRequestException(
        'Tylko przejęte zgłoszenie może zostać odrzucone',
      );
    }

    const listing = submission.publishedListing;

    if (!listing) {
      throw new BadRequestException('Zgłoszenie nie ma powiązanego ogłoszenia');
    }

    const now = new Date();
    const previousPublicationStatus = listing.publicationStatus;

    listing.status = ListingStatus.DRAFT;
    listing.publicationStatus = ListingPublicationStatus.DRAFT;
    listing.publishedAt = null;
    listing.unpublishedAt = now;
    listing.expiresAt = null;

    submission.status = PublicListingSubmissionStatus.REJECTED;
    submission.publishedAt = null;
    submission.expiresAt = null;
    submission.rejectedAt = now;
    submission.metadata = {
      ...submission.metadata,
      adminRejection: {
        rejectedByUserId: adminUserId,
        rejectedAt: now.toISOString(),
        reason,
      },
    };

    const savedSubmission = await this.dataSource.transaction(
      async (manager) => {
        await manager.save(Listing, listing);
        return manager.save(PublicListingSubmission, submission);
      },
    );

    await this.activityService.log({
      userId: adminUserId,
      entityType: ActivityEntityType.LISTING,
      entityId: listing.id,
      action: ActivityAction.STATUS_CHANGED,
      description: 'Odrzucono publiczne zgłoszenie ogłoszenia',
      changes: [
        {
          field: 'publicListingSubmissionStatus',
          oldValue: PublicListingSubmissionStatus.CLAIMED,
          newValue: PublicListingSubmissionStatus.REJECTED,
        },
        {
          field: 'publicationStatus',
          oldValue: previousPublicationStatus,
          newValue: ListingPublicationStatus.DRAFT,
        },
      ],
    });

    await this.sendRejectionEmail(savedSubmission, reason);

    return toSellerDetail({
      ...savedSubmission,
      publishedListing: listing,
    });
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

  private async sendApprovalEmail(
    submission: PublicListingSubmission,
    listing: Listing,
  ): Promise<void> {
    if (!listing.publicSlug) {
      this.logger.warn(
        `Skipping approval email for submission ${submission.id}: listing has no public slug`,
      );
      return;
    }

    const publicListingUrl = this.buildPublicListingUrl(listing.publicSlug);

    await this.emailService.send({
      to: submission.email,
      subject: 'Twoje ogłoszenie zostało opublikowane',
      text: [
        `Cześć ${submission.ownerName},`,
        '',
        'Twoje ogłoszenie zostało zatwierdzone i opublikowane w katalogu.',
        '',
        `Możesz je zobaczyć tutaj: ${publicListingUrl}`,
        '',
        'W panelu właściciela możesz śledzić wyświetlenia, zapytania oraz zarządzać publikacją.',
      ].join('\n'),
    });
  }

  private async sendRejectionEmail(
    submission: PublicListingSubmission,
    reason: string,
  ): Promise<void> {
    const sellerDashboardUrl = this.buildFrontendUrl('/seller');

    await this.emailService.send({
      to: submission.email,
      subject: 'Twoje ogłoszenie zostało odrzucone',
      text: [
        `Cześć ${submission.ownerName},`,
        '',
        'Twoje ogłoszenie zostało odrzucone po weryfikacji.',
        '',
        `Powód: ${reason}`,
        '',
        `Możesz je poprawić w panelu właściciela i wysłać ponownie do weryfikacji: ${sellerDashboardUrl}`,
      ].join('\n'),
    });
  }

  private async sendExpiryReminderEmail(
    submission: PublicListingSubmission,
    listing: Listing,
    expiresAt: Date,
  ): Promise<void> {
    const renewalUrl = this.buildFrontendUrl(
      `/seller/listings/${encodeURIComponent(submission.id)}`,
    );
    const publicListingUrl = listing.publicSlug
      ? this.buildPublicListingUrl(listing.publicSlug)
      : null;

    await this.emailService.send({
      to: submission.email,
      subject: 'Twoje ogłoszenie wygaśnie za 7 dni',
      text: [
        `Cześć ${submission.ownerName},`,
        '',
        `Twoje ogłoszenie "${listing.publicTitle || listing.title}" wygaśnie za 7 dni, ${formatDateForEmail(expiresAt)}.`,
        '',
        `Odnów je tutaj: ${renewalUrl}`,
        publicListingUrl
          ? `Publiczny link do ogłoszenia: ${publicListingUrl}`
          : null,
      ]
        .filter((line): line is string => line !== null)
        .join('\n'),
    });
  }

  private buildPublicListingUrl(publicSlug: string): string {
    return this.buildFrontendUrl(`/oferty/${encodeURIComponent(publicSlug)}`);
  }

  private buildFrontendUrl(path: string): string {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const normalizedFrontendUrl = String(frontendUrl).replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${normalizedFrontendUrl}${normalizedPath}`;
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
        attemptedUsage: currentUsage + 1,
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

  private async findOwnedSubmissionOrFail(
    ownerUserId: string,
    id: string,
  ): Promise<PublicListingSubmission> {
    const submission = await this.submissionRepo.findOne({
      where: { id, ownerUserId },
      relations: ['publishedListing'],
    });

    if (!submission) {
      throw new NotFoundException('Ogłoszenie nie znalezione');
    }

    return submission;
  }

  private async attachSellerSubmissionStats(
    submissions: PublicListingSubmission[],
  ): Promise<void> {
    const listings = submissions
      .map((submission) => submission.publishedListing)
      .filter((listing): listing is Listing => Boolean(listing));

    if (listings.length === 0) return;

    const listingIds = listings.map((listing) => listing.id);
    const [viewRows, inquiryRows] = await Promise.all([
      this.analyticsEventRepo
        .createQueryBuilder('event')
        .select("event.properties ->> 'listingId'", 'listingId')
        .addSelect('COUNT(*)::int', 'viewCount')
        .where('event.name = :eventName', {
          eventName: 'public_listing_viewed',
        })
        .andWhere("event.properties ->> 'listingId' IN (:...listingIds)", {
          listingIds,
        })
        .groupBy("event.properties ->> 'listingId'")
        .getRawMany<{ listingId: string; viewCount: string }>(),
      this.publicLeadRepo
        .createQueryBuilder('lead')
        .select('lead.listingId', 'listingId')
        .addSelect('COUNT(*)::int', 'inquiryCount')
        .where('lead.listingId IN (:...listingIds)', { listingIds })
        .groupBy('lead.listingId')
        .getRawMany<{ listingId: string; inquiryCount: string }>(),
    ]);
    const viewCounts = new Map(
      viewRows.map((row) => [row.listingId, Number(row.viewCount)]),
    );
    const inquiryCounts = new Map(
      inquiryRows.map((row) => [row.listingId, Number(row.inquiryCount)]),
    );

    for (const listing of listings) {
      listing.publicViewCount = viewCounts.get(listing.id) ?? 0;
      listing.publicInquiryCount = inquiryCounts.get(listing.id) ?? 0;
    }
  }

  private assertSellerSubmissionEditable(
    submission: PublicListingSubmission,
  ): void {
    const isWaitingForModeration =
      submission.status === PublicListingSubmissionStatus.CLAIMED &&
      submission.publishedListing?.publicationStatus ===
        ListingPublicationStatus.DRAFT;

    if (isWaitingForModeration) {
      throw new ForbiddenException(
        'Oferta oczekuje na weryfikację i nie może być teraz edytowana',
      );
    }
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

function hasSentExpiryReminder(
  metadata: Record<string, unknown> | null | undefined,
  expiresAt: Date,
): boolean {
  const reminder = metadata?.expiryReminder7Days;

  if (typeof reminder !== 'object' || reminder === null) {
    return false;
  }

  return (
    (reminder as { expiresAt?: unknown }).expiresAt === expiresAt.toISOString()
  );
}

function formatDateForEmail(value: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
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
    lat: getNullableNumber(address.lat) ?? undefined,
    lng: getNullableNumber(address.lng) ?? undefined,
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
        isPrimary: Boolean(image.isPrimary),
      },
    ];
  });
}

function getPrimaryImageIndex(images: Array<Partial<ListingImage>>): number {
  if (images.length === 0) {
    return -1;
  }

  const selectedIndex = images.findIndex((image) => image.isPrimary);
  return selectedIndex >= 0 ? selectedIndex : 0;
}

function sortImageDataByPrimary(
  images: Array<Partial<ListingImage>>,
): Array<Partial<ListingImage>> {
  return images.slice().sort((a, b) => {
    if (Boolean(a.isPrimary) !== Boolean(b.isPrimary)) {
      return Boolean(a.isPrimary) ? -1 : 1;
    }

    return (a.order ?? 0) - (b.order ?? 0);
  });
}

function toSellerListItem(
  submission: PublicListingSubmission,
): SellerPublicListingSubmissionListItem {
  const listing = submission.payload.listing ?? {};
  const address = submission.payload.address ?? {};
  const publishedListing = submission.publishedListing;

  return {
    id: submission.id,
    status: submission.status,
    title: getString(listing.title, 'Ogłoszenie nieruchomości'),
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
    price: getNullableNumber(listing.price),
    currency: getString(listing.currency, 'PLN').slice(0, 3),
    city: getNullableString(address.city),
    primaryImageUrl: getFirstImageUrl(submission.payload),
    publishedListingId: submission.publishedListingId ?? null,
    publishedListingSlug: publishedListing?.publicSlug ?? null,
    publicationStatus: publishedListing?.publicationStatus ?? null,
    viewCount: publishedListing
      ? (publishedListing.publicViewCount ?? 0)
      : null,
    inquiryCount: publishedListing
      ? (publishedListing.publicInquiryCount ?? 0)
      : null,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    verifiedAt: submission.verifiedAt ?? null,
    publishedAt: submission.publishedAt ?? null,
    unpublishedAt: publishedListing?.unpublishedAt ?? null,
    expiresAt: publishedListing?.expiresAt ?? submission.expiresAt ?? null,
    claimedAt: submission.claimedAt ?? null,
    rejectedAt: submission.rejectedAt ?? null,
    expiredAt: submission.expiredAt ?? null,
  };
}

function toSellerDetail(
  submission: PublicListingSubmission,
): SellerPublicListingSubmissionDetail {
  return {
    ...toSellerListItem(submission),
    listing: submission.payload.listing ?? {},
    address: submission.payload.address ?? {},
    publicSettings: submission.payload.publicSettings ?? {},
    images: submission.payload.images ?? [],
    ownerName: submission.ownerName,
    email: submission.email,
    phone: submission.phone,
    agencyName: submission.agencyName ?? null,
  };
}

function toAdminListItem(
  submission: PublicListingSubmission,
): AdminPublicListingSubmissionListItem {
  const listing = submission.payload.listing ?? {};
  const address = submission.payload.address ?? {};
  const publishedListing = submission.publishedListing;

  if (!publishedListing) {
    throw new Error('Admin moderation item requires a published listing');
  }

  return {
    id: submission.id,
    status: submission.status,
    ownerName: submission.ownerName,
    email: submission.email,
    phone: submission.phone,
    title: getString(listing.title, 'Ogłoszenie nieruchomości'),
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
    price: getNullableNumber(listing.price),
    currency: getString(listing.currency, 'PLN').slice(0, 3),
    city: getNullableString(address.city),
    createdAt: submission.createdAt,
    verifiedAt: submission.verifiedAt ?? null,
    claimedAt: submission.claimedAt ?? null,
    publishedListingId: publishedListing.id,
    publishedListingSlug: publishedListing.publicSlug ?? null,
    publicationStatus: publishedListing.publicationStatus,
  };
}

function sanitizePayloadObject<T extends object>(
  value: T,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function buildSellerListingExpiresAt(now: Date): Date {
  return new Date(now.getTime() + SELLER_LISTING_PUBLICATION_TTL_MS);
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
  const firstImage = (payload.images ?? [])
    .filter((image) => getNullableString(image.url))
    .sort((a, b) => {
      if (Boolean(a.isPrimary) !== Boolean(b.isPrimary)) {
        return Boolean(a.isPrimary) ? -1 : 1;
      }

      return (
        (getOptionalNumber(a.order) ?? 0) - (getOptionalNumber(b.order) ?? 0)
      );
    })[0];

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

function normalizeImageExtension(
  originalName: string,
  mimetype: string,
): string {
  const extension = extname(originalName).toLowerCase();

  if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return extension;
  }

  switch (mimetype) {
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/jpeg':
    default:
      return '.jpg';
  }
}
