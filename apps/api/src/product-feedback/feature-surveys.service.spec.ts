import { BadRequestException } from '@nestjs/common';
import { FeatureSurveysService } from './feature-surveys.service';
import {
  FeatureSurvey,
  FeatureSurveyAudience,
  FeatureSurveyQuestionType,
  FeatureSurveyStatus,
  type FeatureSurveyResponse,
} from './entities';

function buildSurvey(overrides: Partial<FeatureSurvey> = {}): FeatureSurvey {
  return {
    id: 'survey-1',
    title: 'Priorytety produktu',
    description: null,
    status: FeatureSurveyStatus.ACTIVE,
    audience: FeatureSurveyAudience.ALL_USERS,
    startsAt: null,
    endsAt: null,
    questions: [
      {
        id: 'feature',
        type: FeatureSurveyQuestionType.SINGLE_CHOICE,
        label: 'Która funkcja jest najważniejsza?',
        required: true,
        options: [
          { value: 'reports', label: 'Raporty' },
          { value: 'integrations', label: 'Integracje' },
        ],
      },
    ],
    audienceRules: {},
    metadata: {},
    responses: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function buildService(
  overrides: {
    surveys?: FeatureSurvey[];
    survey?: FeatureSurvey | null;
    responses?: FeatureSurveyResponse[];
    existingResponse?: FeatureSurveyResponse | null;
  } = {},
) {
  const surveyRepo = {
    find: jest.fn().mockResolvedValue(overrides.surveys ?? []),
    findOne: jest.fn().mockResolvedValue(overrides.survey ?? buildSurvey()),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: value.id ?? 'survey-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...value,
    })),
  };
  const responseRepo = {
    findOne: jest.fn().mockResolvedValue(overrides.existingResponse ?? null),
    find: jest.fn().mockResolvedValue(overrides.responses ?? []),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: 'response-1',
      createdAt: new Date(),
      ...value,
    })),
  };
  const productFeedbackRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: 'feedback-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...value,
    })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const usersService = {
    getAgencyAccessContext: jest.fn().mockResolvedValue({
      user: { email: 'agent@example.com' },
      agent: { id: 'agent-1' },
      agency: { id: 'workspace-1' },
      entitlements: { plan: { code: 'free' } },
    }),
  };
  const analyticsService = {
    track: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new FeatureSurveysService(
      surveyRepo as never,
      responseRepo as never,
      productFeedbackRepo as never,
      usersService as never,
      analyticsService as never,
    ),
    surveyRepo,
    responseRepo,
    productFeedbackRepo,
  };
}

describe('FeatureSurveysService', () => {
  it('lists surveys for admin in admin view shape', async () => {
    const survey = buildSurvey({
      id: 'survey-admin',
      status: FeatureSurveyStatus.DRAFT,
      metadata: { owner: 'product' },
    });
    const { service, surveyRepo } = buildService({ surveys: [survey] });

    const result = await service.findAllForAdmin();

    expect(surveyRepo.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
    expect(result[0]).toMatchObject({
      id: 'survey-admin',
      status: FeatureSurveyStatus.DRAFT,
      metadata: { owner: 'product' },
    });
  });

  it('returns only surveys matching authenticated user audience', async () => {
    const matchingPlanSurvey = buildSurvey({
      id: 'survey-free',
      audience: FeatureSurveyAudience.PLAN_SEGMENT,
      audienceRules: { planCodes: ['free'] },
    });
    const otherPlanSurvey = buildSurvey({
      id: 'survey-starter',
      audience: FeatureSurveyAudience.PLAN_SEGMENT,
      audienceRules: { planCodes: ['starter'] },
    });
    const publicSurvey = buildSurvey({
      id: 'survey-public',
      audience: FeatureSurveyAudience.PUBLIC_VISITORS,
    });
    const { service } = buildService({
      surveys: [matchingPlanSurvey, otherPlanSurvey, publicSurvey],
    });

    const result = await service.findActiveForUser('user-1');

    expect(result.map((survey) => survey.id)).toEqual(['survey-free']);
  });

  it('includes viewer response and option percentages for answered surveys', async () => {
    const survey = buildSurvey();
    const responses = [
      {
        id: 'response-user',
        surveyId: survey.id,
        survey,
        userId: 'user-1',
        answers: { feature: 'reports' },
        metadata: {},
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        id: 'response-other',
        surveyId: survey.id,
        survey,
        userId: 'user-2',
        answers: { feature: 'integrations' },
        metadata: {},
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    ] as FeatureSurveyResponse[];
    const { service } = buildService({
      surveys: [survey],
      responses,
    });

    const result = await service.findActiveForUser('user-1');

    expect(result[0]).toMatchObject({
      viewerResponse: {
        id: 'response-user',
        answers: { feature: 'reports' },
      },
      results: {
        responseCount: 2,
        questions: {
          feature: {
            responseCount: 2,
            options: [
              {
                value: 'reports',
                count: 1,
                percentage: 50,
              },
              {
                value: 'integrations',
                count: 1,
                percentage: 50,
              },
            ],
          },
        },
      },
    });
  });

  it('updates an existing user response and linked feedback', async () => {
    const survey = buildSurvey();
    const existingResponse = {
      id: 'response-user',
      surveyId: survey.id,
      survey,
      feedbackId: 'feedback-1',
      userId: 'user-1',
      answers: { feature: 'reports' },
      metadata: { original: true },
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    } as FeatureSurveyResponse;
    const { service, responseRepo, productFeedbackRepo } = buildService({
      survey,
      existingResponse,
    });

    const result = await service.updateForUser('user-1', survey.id, {
      answers: { feature: 'integrations' },
      sourceUrl: '/dashboard/feedback/surveys',
    });

    expect(responseRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'response-user',
        answers: { feature: 'integrations' },
        sourceUrl: '/dashboard/feedback/surveys',
      }),
    );
    expect(productFeedbackRepo.update).toHaveBeenCalledWith(
      'feedback-1',
      expect.objectContaining({
        description: expect.stringContaining('integrations'),
        metadata: expect.objectContaining({
          surveyId: survey.id,
          answers: { feature: 'integrations' },
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 'response-user',
      surveyId: survey.id,
    });
  });

  it('rejects missing required answers before writing response', async () => {
    const { service, responseRepo, productFeedbackRepo } = buildService({
      survey: buildSurvey(),
    });

    await expect(
      service.submitForUser('user-1', 'survey-1', { answers: {} }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productFeedbackRepo.save).not.toHaveBeenCalled();
    expect(responseRepo.save).not.toHaveBeenCalled();
  });
});
