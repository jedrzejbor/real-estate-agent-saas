import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { MoreThan, Repository } from 'typeorm';
import { AnalyticsService } from '../analytics';
import {
  assertPublicFormHoneypot,
  assertPublicFormTiming,
  assertPublicTextAllowed,
  assertRateLimit,
  getRequestFingerprint,
  normalizeContactFingerprint,
  normalizeOptional,
} from '../common/abuse-protection';
import { UsersService } from '../users';
import {
  CreateProductFeedbackDto,
  CreatePublicProductFeedbackDto,
} from './dto';
import {
  ProductFeedback,
  ProductFeedbackCategory,
  ProductFeedbackSource,
  ProductFeedbackStatus,
} from './entities';

const PUBLIC_FEEDBACK_MIN_COMPLETION_MS = 1_500;
const PUBLIC_FEEDBACK_IP_HOURLY_LIMIT = 10;
const PUBLIC_FEEDBACK_EMAIL_HOURLY_LIMIT = 6;
const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class ProductFeedbackService {
  constructor(
    @InjectRepository(ProductFeedback)
    private readonly productFeedbackRepo: Repository<ProductFeedback>,
    private readonly usersService: UsersService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async createForUser(userId: string, dto: CreateProductFeedbackDto) {
    const access = await this.usersService.getAgencyAccessContext(userId);
    const feedback = this.productFeedbackRepo.create({
      type: dto.type,
      status: ProductFeedbackStatus.NEW,
      category: dto.category ?? ProductFeedbackCategory.OTHER,
      source: dto.source ?? ProductFeedbackSource.DASHBOARD,
      title: dto.title.trim(),
      description: dto.description.trim(),
      userPriority: dto.userPriority ?? null,
      userId,
      agentId: access.agent?.id ?? null,
      workspaceId: access.agency?.id ?? null,
      email: access.user.email,
      sourceUrl: normalizeOptional(dto.sourceUrl),
      module: normalizeOptional(dto.module),
      browser: normalizeOptional(dto.browser),
      os: normalizeOptional(dto.os),
      viewport: normalizeOptional(dto.viewport),
      appVersion: normalizeOptional(dto.appVersion),
      screenshotUrl: normalizeOptional(dto.screenshotUrl),
      metadata: dto.metadata ?? {},
    });

    const savedFeedback = await this.productFeedbackRepo.save(feedback);
    await this.trackFeedbackSubmitted(userId, savedFeedback);

    return this.toSubmissionResponse(savedFeedback);
  }

  async createPublic(dto: CreatePublicProductFeedbackDto, request: Request) {
    assertPublicFormHoneypot(dto.website);
    assertPublicFormTiming(dto.formStartedAt, {
      minCompletionMs: PUBLIC_FEEDBACK_MIN_COMPLETION_MS,
    });

    const fingerprint = getRequestFingerprint(request);
    const emailFingerprint = normalizeContactFingerprint(dto.email);
    const since = new Date(Date.now() - ONE_HOUR_MS);

    if (fingerprint.ipHash) {
      const ipUsage = await this.productFeedbackRepo.count({
        where: {
          ipHash: fingerprint.ipHash,
          createdAt: MoreThan(since),
        },
      });
      assertRateLimit(ipUsage, PUBLIC_FEEDBACK_IP_HOURLY_LIMIT);
    }

    if (dto.email && emailFingerprint) {
      const emailUsage = await this.productFeedbackRepo.count({
        where: {
          email: dto.email.trim().toLowerCase(),
          createdAt: MoreThan(since),
        },
      });
      assertRateLimit(emailUsage, PUBLIC_FEEDBACK_EMAIL_HOURLY_LIMIT);
    }

    const abuseReport = assertPublicTextAllowed(
      {
        title: dto.title,
        description: dto.description,
      },
      { maxLinks: 2 },
    );

    const feedback = this.productFeedbackRepo.create({
      type: dto.type,
      status: ProductFeedbackStatus.NEW,
      category: dto.category ?? ProductFeedbackCategory.OTHER,
      source: this.normalizePublicSource(dto.source),
      title: dto.title.trim(),
      description: dto.description.trim(),
      userPriority: dto.userPriority ?? null,
      email: dto.email?.trim().toLowerCase() || null,
      sourceUrl: normalizeOptional(dto.sourceUrl),
      module: normalizeOptional(dto.module),
      browser: normalizeOptional(dto.browser),
      os: normalizeOptional(dto.os),
      viewport: normalizeOptional(dto.viewport),
      appVersion: normalizeOptional(dto.appVersion),
      screenshotUrl: normalizeOptional(dto.screenshotUrl),
      ipHash: fingerprint.ipHash,
      userAgent: fingerprint.userAgent,
      metadata: {
        ...(dto.metadata ?? {}),
        abuse: {
          riskScore: abuseReport.riskScore,
          signals: abuseReport.signals,
        },
        emailFingerprint,
      },
    });

    const savedFeedback = await this.productFeedbackRepo.save(feedback);
    return this.toSubmissionResponse(savedFeedback);
  }

  private normalizePublicSource(
    source: ProductFeedbackSource | undefined,
  ): ProductFeedbackSource {
    if (!source || source === ProductFeedbackSource.DASHBOARD) {
      return ProductFeedbackSource.PUBLIC_FORM;
    }

    return source;
  }

  private async trackFeedbackSubmitted(
    userId: string,
    feedback: ProductFeedback,
  ): Promise<void> {
    await this.analyticsService.track(userId, {
      name: 'product_feedback_submitted',
      path: feedback.sourceUrl ?? undefined,
      properties: {
        feedbackId: feedback.id,
        type: feedback.type,
        category: feedback.category,
        source: feedback.source,
        userPriority: feedback.userPriority,
      },
    });
  }

  private toSubmissionResponse(feedback: ProductFeedback) {
    return {
      id: feedback.id,
      type: feedback.type,
      status: feedback.status,
      createdAt: feedback.createdAt,
    };
  }
}
