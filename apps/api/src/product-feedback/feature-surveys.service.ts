import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import {
  In,
  IsNull,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
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
  CreateFeatureSurveyDto,
  SubmitFeatureSurveyResponseDto,
  SubmitPublicFeatureSurveyResponseDto,
  UpdateFeatureSurveyDto,
} from './dto';
import {
  FeatureSurvey,
  FeatureSurveyAudience,
  FeatureSurveyQuestion,
  FeatureSurveyQuestionType,
  FeatureSurveyResponse,
  FeatureSurveyStatus,
  ProductFeedback,
  ProductFeedbackCategory,
  ProductFeedbackSource,
  ProductFeedbackStatus,
  ProductFeedbackType,
} from './entities';

const PUBLIC_SURVEY_MIN_COMPLETION_MS = 1_000;
const PUBLIC_SURVEY_IP_HOURLY_LIMIT = 12;
const PUBLIC_SURVEY_EMAIL_HOURLY_LIMIT = 6;
const ONE_HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class FeatureSurveysService {
  constructor(
    @InjectRepository(FeatureSurvey)
    private readonly surveyRepo: Repository<FeatureSurvey>,
    @InjectRepository(FeatureSurveyResponse)
    private readonly responseRepo: Repository<FeatureSurveyResponse>,
    @InjectRepository(ProductFeedback)
    private readonly productFeedbackRepo: Repository<ProductFeedback>,
    private readonly usersService: UsersService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async findActiveForUser(userId: string) {
    const access = await this.usersService.getAgencyAccessContext(userId);
    const surveys = await this.findActiveSurveys([
      FeatureSurveyAudience.ALL_USERS,
      FeatureSurveyAudience.REGISTERED_USERS,
      FeatureSurveyAudience.PLAN_SEGMENT,
      FeatureSurveyAudience.BETA_USERS,
    ]);

    return surveys
      .filter((survey) =>
        this.matchesUserAudience(survey, {
          userId,
          workspaceId: access.agency.id,
          planCode: access.entitlements.plan.code,
        }),
      )
      .map((survey) => this.toPublicSurveyView(survey));
  }

  async findActivePublic() {
    const surveys = await this.findActiveSurveys([
      FeatureSurveyAudience.ALL_USERS,
      FeatureSurveyAudience.PUBLIC_VISITORS,
    ]);

    return surveys.map((survey) => this.toPublicSurveyView(survey));
  }

  async submitForUser(
    userId: string,
    surveyId: string,
    dto: SubmitFeatureSurveyResponseDto,
  ) {
    const access = await this.usersService.getAgencyAccessContext(userId);
    const survey = await this.getActiveSurveyForResponse(surveyId);

    if (
      !this.matchesUserAudience(survey, {
        userId,
        workspaceId: access.agency.id,
        planCode: access.entitlements.plan.code,
      })
    ) {
      throw new ForbiddenException(
        'Ta ankieta nie jest dostępna dla użytkownika',
      );
    }

    const existing = await this.responseRepo.findOne({
      where: { surveyId, userId },
      select: ['id'],
    });

    if (existing) {
      throw new BadRequestException(
        'Odpowiedź na tę ankietę została już zapisana',
      );
    }

    const answers = this.normalizeAnswers(survey.questions, dto.answers);
    const feedback = this.productFeedbackRepo.create({
      type: ProductFeedbackType.SURVEY_RESPONSE,
      status: ProductFeedbackStatus.NEW,
      category: ProductFeedbackCategory.OTHER,
      source: ProductFeedbackSource.DASHBOARD,
      title: `Odpowiedź na ankietę: ${survey.title}`.slice(0, 160),
      description: this.buildFeedbackDescription(survey, answers),
      userId,
      agentId: access.agent.id,
      workspaceId: access.agency.id,
      email: access.user.email,
      sourceUrl: normalizeOptional(dto.sourceUrl),
      metadata: {
        ...(dto.metadata ?? {}),
        surveyId: survey.id,
        surveyTitle: survey.title,
        answers,
      },
    });
    const savedFeedback = await this.productFeedbackRepo.save(feedback);

    const response = this.responseRepo.create({
      surveyId,
      feedbackId: savedFeedback.id,
      userId,
      agentId: access.agent.id,
      workspaceId: access.agency.id,
      email: access.user.email,
      sourceUrl: normalizeOptional(dto.sourceUrl),
      answers,
      metadata: dto.metadata ?? {},
    });
    const savedResponse = await this.responseRepo.save(response);

    await this.analyticsService.track(userId, {
      name: 'product_feedback_submitted',
      path: dto.sourceUrl ?? undefined,
      properties: {
        feedbackId: savedFeedback.id,
        surveyId: survey.id,
        type: ProductFeedbackType.SURVEY_RESPONSE,
        category: ProductFeedbackCategory.OTHER,
        source: ProductFeedbackSource.DASHBOARD,
      },
    });

    return this.toResponseView(savedResponse);
  }

  async submitPublic(
    surveyId: string,
    dto: SubmitPublicFeatureSurveyResponseDto,
    request: Request,
  ) {
    assertPublicFormHoneypot(dto.website);
    assertPublicFormTiming(dto.formStartedAt, {
      minCompletionMs: PUBLIC_SURVEY_MIN_COMPLETION_MS,
    });

    const survey = await this.getActiveSurveyForResponse(surveyId);
    if (
      ![
        FeatureSurveyAudience.ALL_USERS,
        FeatureSurveyAudience.PUBLIC_VISITORS,
      ].includes(survey.audience)
    ) {
      throw new ForbiddenException('Ta ankieta nie jest publicznie dostępna');
    }

    const fingerprint = getRequestFingerprint(request);
    const email = dto.email?.trim().toLowerCase() || null;
    const emailFingerprint = normalizeContactFingerprint(email);
    const since = new Date(Date.now() - ONE_HOUR_MS);

    if (fingerprint.ipHash) {
      const ipUsage = await this.responseRepo.count({
        where: {
          ipHash: fingerprint.ipHash,
          createdAt: MoreThan(since),
        },
      });
      assertRateLimit(ipUsage, PUBLIC_SURVEY_IP_HOURLY_LIMIT);
    }

    if (email) {
      const emailUsage = await this.responseRepo.count({
        where: {
          email,
          createdAt: MoreThan(since),
        },
      });
      assertRateLimit(emailUsage, PUBLIC_SURVEY_EMAIL_HOURLY_LIMIT);
    }

    const answers = this.normalizeAnswers(survey.questions, dto.answers);
    const abuseReport = assertPublicTextAllowed(
      {
        title: survey.title,
        description: Object.values(answers).join(' '),
      },
      { maxLinks: 2 },
    );

    const feedback = this.productFeedbackRepo.create({
      type: ProductFeedbackType.SURVEY_RESPONSE,
      status: ProductFeedbackStatus.NEW,
      category: ProductFeedbackCategory.OTHER,
      source: ProductFeedbackSource.PUBLIC_FORM,
      title: `Odpowiedź na ankietę: ${survey.title}`.slice(0, 160),
      description: this.buildFeedbackDescription(survey, answers),
      email,
      sourceUrl: normalizeOptional(dto.sourceUrl),
      ipHash: fingerprint.ipHash,
      userAgent: fingerprint.userAgent,
      metadata: {
        ...(dto.metadata ?? {}),
        surveyId: survey.id,
        surveyTitle: survey.title,
        answers,
        abuse: {
          riskScore: abuseReport.riskScore,
          signals: abuseReport.signals,
        },
        emailFingerprint,
      },
    });
    const savedFeedback = await this.productFeedbackRepo.save(feedback);

    const response = this.responseRepo.create({
      surveyId,
      feedbackId: savedFeedback.id,
      email,
      sourceUrl: normalizeOptional(dto.sourceUrl),
      ipHash: fingerprint.ipHash,
      userAgent: fingerprint.userAgent,
      answers,
      metadata: {
        ...(dto.metadata ?? {}),
        abuse: {
          riskScore: abuseReport.riskScore,
          signals: abuseReport.signals,
        },
        emailFingerprint,
      },
    });

    return this.toResponseView(await this.responseRepo.save(response));
  }

  async createForAdmin(dto: CreateFeatureSurveyDto) {
    this.assertQuestionsAreValid(dto.questions);
    const survey = this.surveyRepo.create({
      title: dto.title.trim(),
      description: normalizeOptional(dto.description),
      status: dto.status ?? FeatureSurveyStatus.DRAFT,
      audience: dto.audience,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      questions: dto.questions,
      audienceRules: dto.audienceRules ?? {},
      metadata: dto.metadata ?? {},
    });

    return this.toAdminSurveyView(await this.surveyRepo.save(survey));
  }

  async updateForAdmin(id: string, dto: UpdateFeatureSurveyDto) {
    const survey = await this.surveyRepo.findOne({ where: { id } });
    if (!survey) {
      throw new NotFoundException('Ankieta nie znaleziona');
    }

    if (dto.questions) {
      this.assertQuestionsAreValid(dto.questions);
      survey.questions = dto.questions;
    }

    if (dto.title !== undefined) survey.title = dto.title.trim();
    if (dto.description !== undefined) {
      survey.description = normalizeOptional(dto.description);
    }
    if (dto.status !== undefined) survey.status = dto.status;
    if (dto.audience !== undefined) survey.audience = dto.audience;
    if (dto.startsAt !== undefined) {
      survey.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.endsAt !== undefined) {
      survey.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    }
    if (dto.audienceRules !== undefined)
      survey.audienceRules = dto.audienceRules;
    if (dto.metadata !== undefined) {
      survey.metadata = { ...(survey.metadata ?? {}), ...dto.metadata };
    }

    return this.toAdminSurveyView(await this.surveyRepo.save(survey));
  }

  async findResponsesForAdmin(surveyId: string) {
    const survey = await this.surveyRepo.findOne({ where: { id: surveyId } });
    if (!survey) {
      throw new NotFoundException('Ankieta nie znaleziona');
    }

    const responses = await this.responseRepo.find({
      where: { surveyId },
      order: { createdAt: 'DESC' },
    });

    return {
      survey: this.toAdminSurveyView(survey),
      responses: responses.map((response) =>
        this.toAdminResponseView(response),
      ),
    };
  }

  private async findActiveSurveys(audiences: FeatureSurveyAudience[]) {
    const now = new Date();
    return this.surveyRepo.find({
      where: [
        {
          status: FeatureSurveyStatus.ACTIVE,
          audience: In(audiences),
          startsAt: IsNull(),
          endsAt: IsNull(),
        },
        {
          status: FeatureSurveyStatus.ACTIVE,
          audience: In(audiences),
          startsAt: LessThanOrEqual(now),
          endsAt: IsNull(),
        },
        {
          status: FeatureSurveyStatus.ACTIVE,
          audience: In(audiences),
          startsAt: IsNull(),
          endsAt: MoreThanOrEqual(now),
        },
        {
          status: FeatureSurveyStatus.ACTIVE,
          audience: In(audiences),
          startsAt: LessThanOrEqual(now),
          endsAt: MoreThanOrEqual(now),
        },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  private async getActiveSurveyForResponse(id: string) {
    const survey = await this.surveyRepo.findOne({ where: { id } });
    if (!survey) {
      throw new NotFoundException('Ankieta nie znaleziona');
    }

    if (!this.isActiveNow(survey)) {
      throw new BadRequestException('Ankieta nie jest aktywna');
    }

    return survey;
  }

  private matchesUserAudience(
    survey: FeatureSurvey,
    context: { userId: string; workspaceId: string; planCode: string },
  ): boolean {
    const rules = survey.audienceRules ?? {};

    switch (survey.audience) {
      case FeatureSurveyAudience.ALL_USERS:
      case FeatureSurveyAudience.REGISTERED_USERS:
        return true;
      case FeatureSurveyAudience.PLAN_SEGMENT:
        return (
          Array.isArray(rules.planCodes) &&
          rules.planCodes.includes(context.planCode)
        );
      case FeatureSurveyAudience.BETA_USERS:
        return (
          (Array.isArray(rules.userIds) &&
            rules.userIds.includes(context.userId)) ||
          (Array.isArray(rules.workspaceIds) &&
            rules.workspaceIds.includes(context.workspaceId))
        );
      case FeatureSurveyAudience.PUBLIC_VISITORS:
      default:
        return false;
    }
  }

  private isActiveNow(survey: FeatureSurvey): boolean {
    const now = Date.now();
    return (
      survey.status === FeatureSurveyStatus.ACTIVE &&
      (!survey.startsAt || survey.startsAt.getTime() <= now) &&
      (!survey.endsAt || survey.endsAt.getTime() >= now)
    );
  }

  private normalizeAnswers(
    questions: FeatureSurveyQuestion[],
    answers: Record<string, unknown>,
  ): Record<string, unknown> {
    const normalized: Record<string, unknown> = {};

    for (const question of questions) {
      const value = answers[question.id];
      const hasValue =
        value !== undefined &&
        value !== null &&
        !(typeof value === 'string' && value.trim() === '') &&
        !(Array.isArray(value) && value.length === 0);

      if (question.required && !hasValue) {
        throw new BadRequestException(`Uzupełnij pytanie: ${question.label}`);
      }

      if (!hasValue) {
        continue;
      }

      normalized[question.id] = this.normalizeQuestionAnswer(question, value);
    }

    return normalized;
  }

  private normalizeQuestionAnswer(
    question: FeatureSurveyQuestion,
    value: unknown,
  ): unknown {
    switch (question.type) {
      case FeatureSurveyQuestionType.SINGLE_CHOICE:
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Nieprawidłowa odpowiedź: ${question.label}`,
          );
        }
        this.assertOptionAllowed(question, value);
        return value;
      case FeatureSurveyQuestionType.MULTIPLE_CHOICE:
        if (
          !Array.isArray(value) ||
          !value.every((item) => typeof item === 'string')
        ) {
          throw new BadRequestException(
            `Nieprawidłowa odpowiedź: ${question.label}`,
          );
        }
        value.forEach((item) => this.assertOptionAllowed(question, item));
        return [...new Set(value)];
      case FeatureSurveyQuestionType.RATING:
      case FeatureSurveyQuestionType.NPS:
        return this.normalizeNumericAnswer(question, value);
      case FeatureSurveyQuestionType.TEXT:
        if (typeof value !== 'string') {
          throw new BadRequestException(
            `Nieprawidłowa odpowiedź: ${question.label}`,
          );
        }
        return value.trim().slice(0, 2000);
      default:
        throw new BadRequestException(
          `Nieobsługiwany typ pytania: ${question.label}`,
        );
    }
  }

  private normalizeNumericAnswer(
    question: FeatureSurveyQuestion,
    value: unknown,
  ): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    const min =
      question.type === FeatureSurveyQuestionType.NPS ? 0 : (question.min ?? 1);
    const max =
      question.type === FeatureSurveyQuestionType.NPS
        ? 10
        : (question.max ?? 5);

    if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
      throw new BadRequestException(`Wybierz wartość od ${min} do ${max}`);
    }

    return numeric;
  }

  private assertOptionAllowed(
    question: FeatureSurveyQuestion,
    value: string,
  ): void {
    if (!question.options?.some((option) => option.value === value)) {
      throw new BadRequestException(`Nieprawidłowa opcja: ${question.label}`);
    }
  }

  private assertQuestionsAreValid(questions: FeatureSurveyQuestion[]): void {
    const ids = new Set<string>();
    for (const question of questions) {
      if (ids.has(question.id)) {
        throw new BadRequestException(`Duplikat pytania: ${question.id}`);
      }
      ids.add(question.id);

      if (
        [
          FeatureSurveyQuestionType.SINGLE_CHOICE,
          FeatureSurveyQuestionType.MULTIPLE_CHOICE,
        ].includes(question.type) &&
        (!question.options || question.options.length < 2)
      ) {
        throw new BadRequestException(`Pytanie wymaga co najmniej 2 opcji`);
      }
    }
  }

  private buildFeedbackDescription(
    survey: FeatureSurvey,
    answers: Record<string, unknown>,
  ): string {
    return survey.questions
      .filter((question) => answers[question.id] !== undefined)
      .map((question) => {
        const value = answers[question.id];
        const rendered = Array.isArray(value)
          ? value.join(', ')
          : String(value);
        return `${question.label}\n${rendered}`;
      })
      .join('\n\n')
      .slice(0, 5000);
  }

  private toPublicSurveyView(survey: FeatureSurvey) {
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      audience: survey.audience,
      startsAt: survey.startsAt,
      endsAt: survey.endsAt,
      questions: survey.questions,
    };
  }

  private toAdminSurveyView(survey: FeatureSurvey) {
    return {
      ...this.toPublicSurveyView(survey),
      status: survey.status,
      audienceRules: survey.audienceRules ?? {},
      metadata: survey.metadata ?? {},
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    };
  }

  private toResponseView(response: FeatureSurveyResponse) {
    return {
      id: response.id,
      surveyId: response.surveyId,
      feedbackId: response.feedbackId,
      createdAt: response.createdAt,
    };
  }

  private toAdminResponseView(response: FeatureSurveyResponse) {
    return {
      ...this.toResponseView(response),
      userId: response.userId,
      agentId: response.agentId,
      workspaceId: response.workspaceId,
      email: response.email,
      sourceUrl: response.sourceUrl,
      answers: response.answers,
      metadata: response.metadata ?? {},
    };
  }
}
