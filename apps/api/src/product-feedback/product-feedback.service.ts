import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Brackets, MoreThan, Repository } from 'typeorm';
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
  ProductFeedbackAdminQueryDto,
  ProductFeedbackMyQueryDto,
  UpdateProductFeedbackDto,
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

  async findMy(userId: string, query: ProductFeedbackMyQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const qb = this.productFeedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.userId = :userId', { userId })
      .orderBy('feedback.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('feedback.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('feedback.type = :type', { type: query.type });
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((feedback) => this.toUserView(feedback)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findAllForAdmin(query: ProductFeedbackAdminQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.productFeedbackRepo
      .createQueryBuilder('feedback')
      .orderBy('feedback.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('feedback.status = :status', { status: query.status });
    }

    if (query.type) {
      qb.andWhere('feedback.type = :type', { type: query.type });
    }

    if (query.category) {
      qb.andWhere('feedback.category = :category', {
        category: query.category,
      });
    }

    if (query.source) {
      qb.andWhere('feedback.source = :source', { source: query.source });
    }

    if (query.userPriority) {
      qb.andWhere('feedback.userPriority = :userPriority', {
        userPriority: query.userPriority,
      });
    }

    if (query.internalPriority) {
      qb.andWhere('feedback.internalPriority = :internalPriority', {
        internalPriority: query.internalPriority,
      });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('LOWER(feedback.title) LIKE LOWER(:search)', {
              search: `%${search}%`,
            })
            .orWhere('LOWER(feedback.description) LIKE LOWER(:search)', {
              search: `%${search}%`,
            })
            .orWhere('LOWER(feedback.email) LIKE LOWER(:search)', {
              search: `%${search}%`,
            });
        }),
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((feedback) => this.toAdminView(feedback)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOneForAdmin(id: string) {
    const feedback = await this.productFeedbackRepo.findOne({ where: { id } });

    if (!feedback) {
      return null;
    }

    return this.toAdminView(feedback);
  }

  async updateForAdmin(id: string, dto: UpdateProductFeedbackDto) {
    const feedback = await this.productFeedbackRepo.findOne({ where: { id } });

    if (!feedback) {
      throw new NotFoundException('Feedback nie znaleziony');
    }

    const nextMetadata = {
      ...(feedback.metadata ?? {}),
      ...(dto.metadata ?? {}),
    };

    if (dto.internalNote !== undefined) {
      const internalNote = dto.internalNote.trim();

      if (internalNote) {
        nextMetadata.internalNote = internalNote;
        nextMetadata.internalNoteUpdatedAt = new Date().toISOString();
      } else {
        delete nextMetadata.internalNote;
        delete nextMetadata.internalNoteUpdatedAt;
      }
    }

    if (dto.teamResponse !== undefined) {
      const teamResponse = dto.teamResponse.trim();

      if (teamResponse) {
        nextMetadata.teamResponse = teamResponse;
        nextMetadata.teamResponseUpdatedAt = new Date().toISOString();
      } else {
        delete nextMetadata.teamResponse;
        delete nextMetadata.teamResponseUpdatedAt;
      }
    }

    if (dto.status !== undefined) {
      feedback.status = dto.status;
    }

    if (dto.internalPriority !== undefined) {
      feedback.internalPriority = dto.internalPriority;
    }

    if (dto.duplicateOfId !== undefined) {
      feedback.duplicateOfId = dto.duplicateOfId || null;
    }

    feedback.metadata = nextMetadata;

    const savedFeedback = await this.productFeedbackRepo.save(feedback);
    return this.toAdminView(savedFeedback);
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

  private toUserView(feedback: ProductFeedback) {
    return {
      id: feedback.id,
      type: feedback.type,
      status: feedback.status,
      category: feedback.category,
      source: feedback.source,
      title: feedback.title,
      description: feedback.description,
      userPriority: feedback.userPriority,
      sourceUrl: feedback.sourceUrl,
      module: feedback.module,
      teamResponse: this.getStringMetadata(feedback, 'teamResponse'),
      teamResponseUpdatedAt: this.getStringMetadata(
        feedback,
        'teamResponseUpdatedAt',
      ),
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  }

  private toAdminView(feedback: ProductFeedback) {
    return {
      id: feedback.id,
      type: feedback.type,
      status: feedback.status,
      category: feedback.category,
      source: feedback.source,
      title: feedback.title,
      description: feedback.description,
      userPriority: feedback.userPriority,
      internalPriority: feedback.internalPriority,
      userId: feedback.userId,
      agentId: feedback.agentId,
      workspaceId: feedback.workspaceId,
      email: feedback.email,
      sourceUrl: feedback.sourceUrl,
      module: feedback.module,
      browser: feedback.browser,
      os: feedback.os,
      viewport: feedback.viewport,
      appVersion: feedback.appVersion,
      screenshotUrl: feedback.screenshotUrl,
      duplicateOfId: feedback.duplicateOfId,
      metadata: feedback.metadata ?? {},
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  }

  private getStringMetadata(
    feedback: ProductFeedback,
    key: string,
  ): string | null {
    const value = feedback.metadata?.[key];
    return typeof value === 'string' && value.trim() ? value : null;
  }
}
