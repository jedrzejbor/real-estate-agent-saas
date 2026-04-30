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
import { Repository } from 'typeorm';
import { EmailService } from '../email';
import {
  PublicListingSubmissionSource,
  PublicListingSubmissionStatus,
} from '../common/enums';
import {
  CreatePublicListingSubmissionDto,
  VerifyPublicListingSubmissionDto,
} from './dto';
import { PublicListingSubmission } from './entities';

const MIN_FORM_COMPLETION_MS = 5000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TTL_MS = 48 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_VERIFICATION_EMAILS = 5;

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
}

export interface PublicListingSubmissionResendResult {
  success: true;
  emailMasked: string;
  expiresAt: Date;
}

@Injectable()
export class PublicListingSubmissionsService {
  private readonly logger = new Logger(PublicListingSubmissionsService.name);

  constructor(
    @InjectRepository(PublicListingSubmission)
    private readonly submissionRepo: Repository<PublicListingSubmission>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async create(
    dto: CreatePublicListingSubmissionDto,
    request: Request,
  ): Promise<PublicListingSubmissionCreatedResult> {
    this.assertHumanSubmission(dto);
    this.assertConsents(dto);

    const now = new Date();
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
      ipHash: hashIp(getClientIp(request)),
      userAgent: normalizeOptional(request.get('user-agent')),
      payload: buildSubmissionPayload(dto),
      metadata: sanitizeMetadata(dto.metadata),
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

      return {
        id: submission.id,
        status: submission.status,
        verifiedAt: submission.verifiedAt,
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
    submission.status = PublicListingSubmissionStatus.VERIFIED;
    submission.verifiedAt = now;
    submission.verificationTokenHash = null;

    const saved = await this.submissionRepo.save(submission);

    return {
      id: saved.id,
      status: saved.status,
      verifiedAt: saved.verifiedAt ?? now,
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

  private assertConsents(dto: CreatePublicListingSubmissionDto): void {
    if (!dto.contactConsent) {
      throw new BadRequestException('Zgoda na kontakt jest wymagana');
    }

    if (!dto.termsConsent) {
      throw new BadRequestException('Akceptacja regulaminu jest wymagana');
    }
  }
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

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return '***';
  }

  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${'*'.repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}
