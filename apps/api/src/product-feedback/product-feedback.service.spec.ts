import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductFeedbackService } from './product-feedback.service';
import {
  ProductFeedback,
  ProductFeedbackCategory,
  ProductFeedbackSource,
  ProductFeedbackStatus,
  ProductFeedbackType,
} from './entities';

function buildFeedback(
  overrides: Partial<ProductFeedback> = {},
): ProductFeedback {
  return {
    id: 'feedback-1',
    type: ProductFeedbackType.GENERAL_FEEDBACK,
    status: ProductFeedbackStatus.NEW,
    category: ProductFeedbackCategory.OTHER,
    source: ProductFeedbackSource.DASHBOARD,
    title: 'Test feedback',
    description: 'Opis zgłoszenia',
    userPriority: null,
    internalPriority: null,
    userId: 'user-1',
    agentId: 'agent-1',
    workspaceId: 'workspace-1',
    email: 'agent@example.com',
    sourceUrl: null,
    module: null,
    browser: null,
    os: null,
    viewport: null,
    appVersion: null,
    screenshotUrl: null,
    ipHash: null,
    userAgent: null,
    duplicateOfId: null,
    metadata: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function buildQueryBuilder(result: ProductFeedback[], total = result.length) {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([result, total]),
  };
}

function buildVoteQueryBuilder(
  rows: Array<{ feedbackId: string; voteCount: string }> = [],
) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

function buildService(overrides: { feedback?: ProductFeedback | null } = {}) {
  const productFeedbackRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      createdAt: new Date(),
      updatedAt: new Date(),
      ...value,
    })),
    findOne: jest
      .fn()
      .mockResolvedValue(
        overrides.feedback === undefined ? buildFeedback() : overrides.feedback,
      ),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(),
  };
  const productFeedbackVoteRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({
      id: 'vote-1',
      createdAt: new Date(),
      ...value,
    })),
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    createQueryBuilder: jest.fn(),
  };
  const usersService = {
    getAgencyAccessContext: jest.fn().mockResolvedValue({
      user: { email: 'agent@example.com' },
      agent: { id: 'agent-1' },
      agency: { id: 'workspace-1' },
    }),
  };
  const analyticsService = {
    track: jest.fn().mockResolvedValue(undefined),
  };

  return {
    service: new ProductFeedbackService(
      productFeedbackRepo as never,
      productFeedbackVoteRepo as never,
      usersService as never,
      analyticsService as never,
    ),
    productFeedbackRepo,
    productFeedbackVoteRepo,
  };
}

describe('ProductFeedbackService', () => {
  it('lists current user feedback without internal fields', async () => {
    const feedback = buildFeedback({
      metadata: {
        internalNote: 'Notatka tylko dla zespołu',
        teamResponse: 'Dziękujemy, sprawdzamy temat.',
        teamResponseUpdatedAt: '2026-01-03T00:00:00.000Z',
      },
    });
    const queryBuilder = buildQueryBuilder([feedback]);
    const { service, productFeedbackRepo } = buildService();
    productFeedbackRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findMy('user-1', { page: 1, limit: 10 });

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'feedback.userId = :userId',
      {
        userId: 'user-1',
      },
    );
    expect(result.data[0]).toMatchObject({
      id: 'feedback-1',
      title: 'Test feedback',
      teamResponse: 'Dziękujemy, sprawdzamy temat.',
      teamResponseUpdatedAt: '2026-01-03T00:00:00.000Z',
    });
    expect(result.data[0]).not.toHaveProperty('metadata');
    expect(result.data[0]).not.toHaveProperty('internalPriority');
  });

  it('updates team response separately from internal note', async () => {
    const feedback = buildFeedback({
      metadata: { internalNote: 'Wewnętrzny kontekst' },
    });
    const { service, productFeedbackRepo } = buildService({ feedback });

    const result = await service.updateForAdmin('feedback-1', {
      teamResponse: 'Status dla użytkownika',
    });

    expect(productFeedbackRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          internalNote: 'Wewnętrzny kontekst',
          teamResponse: 'Status dla użytkownika',
          teamResponseUpdatedAt: expect.any(String),
        }),
      }),
    );
    expect(result.metadata.teamResponse).toBe('Status dla użytkownika');
  });

  it('throws when updating missing feedback', async () => {
    const { service } = buildService({ feedback: null });

    await expect(
      service.updateForAdmin('missing-feedback', { teamResponse: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a manual feature idea enabled for voting', async () => {
    const { service, productFeedbackRepo } = buildService();

    const result = await service.createIdeaForAdmin({
      title: 'Integracja z portalami',
      description: 'Dodajmy eksport ofert do portali.',
      category: ProductFeedbackCategory.INTEGRATIONS,
      status: ProductFeedbackStatus.PLANNED,
      teamResponse: 'Rozważamy ten kierunek.',
    });

    expect(productFeedbackRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ProductFeedbackType.FEATURE_REQUEST,
        status: ProductFeedbackStatus.PLANNED,
        category: ProductFeedbackCategory.INTEGRATIONS,
        title: 'Integracja z portalami',
        metadata: expect.objectContaining({
          votingEnabled: true,
          createdManuallyByAdmin: true,
          teamResponse: 'Rozważamy ten kierunek.',
        }),
      }),
    );
    expect(result.votingEnabled).toBe(true);
  });

  it('lists only voting-enabled ideas with current user vote state', async () => {
    const feedback = buildFeedback({
      type: ProductFeedbackType.FEATURE_REQUEST,
      metadata: { votingEnabled: true },
    });
    const queryBuilder = buildQueryBuilder([feedback]);
    const voteQueryBuilder = buildVoteQueryBuilder([
      { feedbackId: 'feedback-1', voteCount: '3' },
    ]);
    const { service, productFeedbackRepo, productFeedbackVoteRepo } =
      buildService();
    productFeedbackRepo.createQueryBuilder.mockReturnValue(queryBuilder);
    productFeedbackVoteRepo.createQueryBuilder.mockReturnValue(
      voteQueryBuilder,
    );
    productFeedbackVoteRepo.find.mockResolvedValue([
      { feedbackId: 'feedback-1' },
    ]);

    const result = await service.findVotableForUser('user-1', {
      page: 1,
      limit: 10,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "feedback.metadata ->> 'votingEnabled' = :enabled",
      { enabled: 'true' },
    );
    expect(result.data[0]).toMatchObject({
      id: 'feedback-1',
      voteCount: 3,
      viewerHasVoted: true,
    });
  });

  it('creates a vote once for a selected idea', async () => {
    const feedback = buildFeedback({
      type: ProductFeedbackType.FEATURE_REQUEST,
      metadata: { votingEnabled: true },
    });
    const { service, productFeedbackVoteRepo } = buildService({ feedback });
    productFeedbackVoteRepo.count.mockResolvedValue(1);

    const result = await service.voteForIdea('user-1', 'feedback-1');

    expect(productFeedbackVoteRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackId: 'feedback-1',
        userId: 'user-1',
        workspaceId: 'workspace-1',
      }),
    );
    expect(result).toEqual({
      feedbackId: 'feedback-1',
      voteCount: 1,
      viewerHasVoted: true,
    });
  });

  it('rejects voting for feedback that is not selected for voting', async () => {
    const feedback = buildFeedback({
      type: ProductFeedbackType.FEATURE_REQUEST,
      metadata: {},
    });
    const { service, productFeedbackVoteRepo } = buildService({ feedback });

    await expect(
      service.voteForIdea('user-1', 'feedback-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(productFeedbackVoteRepo.save).not.toHaveBeenCalled();
  });
});
