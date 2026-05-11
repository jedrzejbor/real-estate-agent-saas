import { NotFoundException } from '@nestjs/common';
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
      usersService as never,
      analyticsService as never,
    ),
    productFeedbackRepo,
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
});
