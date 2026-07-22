import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ActivityAction,
  ListingPublicationStatus,
  ListingStatus,
  PropertyType,
  PublicListingSubmissionSource,
  PublicListingSubmissionStatus,
  TransactionType,
} from '../common/enums';
import { Listing } from '../listings/entities/listing.entity';
import { PublicListingSubmission } from './entities';
import { PublicListingSubmissionsService } from './public-listing-submissions.service';

function buildListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    title: 'Mieszkanie testowe',
    description: 'Opis testowy',
    propertyType: PropertyType.APARTMENT,
    status: ListingStatus.DRAFT,
    transactionType: TransactionType.SALE,
    price: 500000,
    currency: 'PLN',
    areaM2: 50,
    plotAreaM2: null,
    rooms: 2,
    bathrooms: null,
    floor: null,
    totalFloors: null,
    yearBuilt: null,
    isPremium: false,
    publicSlug: null,
    publicationStatus: ListingPublicationStatus.DRAFT,
    publicTitle: null,
    publicDescription: null,
    seoTitle: null,
    seoDescription: null,
    shareImageUrl: null,
    showPriceOnPublicPage: true,
    showExactAddressOnPublicPage: false,
    estateflowBrandingEnabled: true,
    showPublicViewCount: false,
    agentCollaborationEnabled: false,
    agentCollaborationMode: null,
    agentCollaborationStatus: null,
    agentCollaborationPreferences: null,
    agentCollaborationOpenedAt: null,
    agentCollaborationClosedAt: null,
    publishedAt: null,
    unpublishedAt: null,
    expiresAt: null,
    agentId: 'agent-1',
    ownerUserId: 'owner-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as Listing;
}

function buildSubmission(
  overrides: Partial<PublicListingSubmission> = {},
): PublicListingSubmission {
  const listing = buildListing();

  return {
    id: 'submission-1',
    status: PublicListingSubmissionStatus.CLAIMED,
    source: PublicListingSubmissionSource.PUBLIC_WIZARD,
    ownerName: 'Jan Kowalski',
    email: 'jan@example.com',
    phone: '600100200',
    agencyName: null,
    contactConsent: true,
    termsConsent: true,
    marketingConsent: false,
    consentText: null,
    consentedAt: new Date('2026-01-01T00:00:00.000Z'),
    verificationTokenHash: null,
    claimTokenHash: null,
    verificationExpiresAt: null,
    verificationEmailSentAt: null,
    verificationEmailCount: 1,
    verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    publishedAt: null,
    claimedAt: new Date('2026-01-01T00:05:00.000Z'),
    rejectedAt: null,
    expiredAt: null,
    expiresAt: null,
    ipHash: null,
    userAgent: null,
    payload: {
      listing: {
        title: 'Mieszkanie testowe',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.SALE,
        price: 500000,
        currency: 'PLN',
        areaM2: 50,
      },
      address: {
        city: 'Warszawa',
      },
      images: [],
      agentCollaboration: {
        enabled: false,
        mode: null,
        status: null,
        preferences: null,
        openedAt: null,
        closedAt: null,
      },
    },
    agentCollaborationEnabled: false,
    agentCollaborationMode: null,
    agentCollaborationStatus: null,
    agentCollaborationPreferences: null,
    agentCollaborationOpenedAt: null,
    agentCollaborationClosedAt: null,
    metadata: {},
    sourceUrl: null,
    referrer: null,
    ownerUserId: 'owner-1',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    publishedListing: listing,
    publishedListingId: listing.id,
    claimedAgentId: 'agent-1',
    claimedAgencyId: 'agency-1',
    ...overrides,
  } as PublicListingSubmission;
}

function buildService(submission: PublicListingSubmission) {
  const submissionRepo = {
    find: jest.fn().mockResolvedValue([submission]),
    findOne: jest.fn().mockResolvedValue(submission),
    save: jest.fn(async (value: PublicListingSubmission) => value),
    createQueryBuilder: jest.fn(),
  };
  const listingRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };
  const analyticsEventRepo = {
    createQueryBuilder: jest.fn(),
  };
  const publicLeadRepo = {
    createQueryBuilder: jest.fn(),
  };
  const activityService = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  const emailService = {
    send: jest.fn().mockResolvedValue(undefined),
  };
  const configService = {
    get: jest.fn().mockReturnValue('https://podadresem.test'),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (manager: unknown) => unknown) =>
      callback({
        create: jest.fn((_entity: unknown, value: unknown) => value),
        createQueryBuilder: jest.fn().mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        }),
        delete: jest.fn().mockResolvedValue(undefined),
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(async (_entity: unknown, value: unknown) => value),
      }),
    ),
  };

  return {
    service: new PublicListingSubmissionsService(
      submissionRepo as never,
      listingRepo as never,
      analyticsEventRepo as never,
      publicLeadRepo as never,
      dataSource as never,
      activityService as never,
      emailService as never,
      configService as never,
      {} as never,
      {} as never,
    ),
    submissionRepo,
    analyticsEventRepo,
    publicLeadRepo,
    activityService,
    emailService,
    configService,
    listing: submission.publishedListing as Listing,
  };
}

function mockSubmissionQueryBuilder(
  submissionRepo: { createQueryBuilder: jest.Mock },
  submissions: PublicListingSubmission[],
) {
  submissionRepo.createQueryBuilder.mockReturnValue({
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(submissions),
  });
}

describe('PublicListingSubmissionsService admin moderation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('approves a claimed submission without changing ownership', async () => {
    const submission = buildSubmission();
    const { service, activityService, emailService, listing } =
      buildService(submission);

    const result = await service.approveByAdmin('admin-1', submission.id);

    expect(listing.ownerUserId).toBe('owner-1');
    expect(submission.ownerUserId).toBe('owner-1');
    expect(listing.status).toBe(ListingStatus.ACTIVE);
    expect(listing.publicationStatus).toBe(
      ListingPublicationStatus.PUBLISHED,
    );
    expect(listing.publicSlug).toBe('mieszkanie-testowe-warszawa');
    expect(submission.metadata.adminApproval).toMatchObject({
      approvedByUserId: 'admin-1',
    });
    expect(activityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        entityId: listing.id,
        action: ActivityAction.PUBLISHED,
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: submission.email,
        subject: 'Twoje ogłoszenie zostało opublikowane',
        text: expect.stringContaining(
          'https://podadresem.test/oferty/mieszkanie-testowe-warszawa',
        ),
      }),
    );
    expect(result.publishedListingId).toBe(listing.id);
  });

  it('rejects approval when the claimed listing has no owner', async () => {
    const listing = buildListing({ ownerUserId: null });
    const submission = buildSubmission({
      ownerUserId: null,
      publishedListing: listing,
    });
    const { service, activityService } = buildService(submission);

    await expect(
      service.approveByAdmin('admin-1', submission.id),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(activityService.log).not.toHaveBeenCalled();
  });

  it('rejects a claimed submission, unpublishes listing, and notifies the owner', async () => {
    const submission = buildSubmission();
    const { service, activityService, emailService, listing } =
      buildService(submission);

    const result = await service.rejectByAdmin('admin-1', submission.id, {
      reason: 'Brakuje zdjęć dokumentujących stan nieruchomości.',
    });

    expect(listing.ownerUserId).toBe('owner-1');
    expect(submission.ownerUserId).toBe('owner-1');
    expect(listing.status).toBe(ListingStatus.DRAFT);
    expect(listing.publicationStatus).toBe(ListingPublicationStatus.DRAFT);
    expect(listing.publishedAt).toBeNull();
    expect(listing.expiresAt).toBeNull();
    expect(submission.status).toBe(PublicListingSubmissionStatus.REJECTED);
    expect(submission.metadata.adminRejection).toMatchObject({
      rejectedByUserId: 'admin-1',
      reason: 'Brakuje zdjęć dokumentujących stan nieruchomości.',
    });
    expect(activityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'admin-1',
        entityId: listing.id,
        action: ActivityAction.STATUS_CHANGED,
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: submission.email,
        subject: 'Twoje ogłoszenie zostało odrzucone',
        text: expect.stringContaining('Twoje ogłoszenie zostało odrzucone'),
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          'Powód: Brakuje zdjęć dokumentujących stan nieruchomości.',
        ),
      }),
    );
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining(
          'Możesz je poprawić w panelu właściciela i wysłać ponownie do weryfikacji: https://podadresem.test/seller',
        ),
      }),
    );
    expect(result.status).toBe(PublicListingSubmissionStatus.REJECTED);
  });

  it('rejects empty rejection reasons before writing changes', async () => {
    const submission = buildSubmission();
    const { service, activityService, emailService } = buildService(submission);

    await expect(
      service.rejectByAdmin('admin-1', submission.id, { reason: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(activityService.log).not.toHaveBeenCalled();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('adds public stats to seller submission list items', async () => {
    const submission = buildSubmission();
    const { service, analyticsEventRepo, publicLeadRepo, listing } =
      buildService(submission);
    analyticsEventRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          listingId: listing.id,
          viewCount: '12',
        },
      ]),
    });
    publicLeadRepo.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          listingId: listing.id,
          inquiryCount: '3',
        },
      ]),
    });

    const result = await service.findForOwner('owner-1');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: submission.id,
      viewCount: 12,
      inquiryCount: 3,
    });
  });

  it('lists claimed draft submissions for admin moderation', async () => {
    const submission = buildSubmission();
    const { service, submissionRepo, listing } = buildService(submission);
    submissionRepo.createQueryBuilder.mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([submission]),
    });

    const result = await service.findPendingAdminReview();

    expect(result).toEqual([
      expect.objectContaining({
        id: submission.id,
        email: submission.email,
        title: 'Mieszkanie testowe',
        city: 'Warszawa',
        publishedListingId: listing.id,
        publicationStatus: ListingPublicationStatus.DRAFT,
      }),
    ]);
  });

  it('resubmits a rejected owner submission to admin moderation', async () => {
    const listing = buildListing({
      publicationStatus: ListingPublicationStatus.DRAFT,
      status: ListingStatus.DRAFT,
      publishedAt: null,
      unpublishedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    const submission = buildSubmission({
      status: PublicListingSubmissionStatus.REJECTED,
      rejectedAt: new Date('2026-01-02T00:00:00.000Z'),
      publishedListing: listing,
      metadata: {
        adminRejection: {
          reason: 'Brakuje zdjęć.',
        },
      },
      payload: {
        listing: {
          title: 'Poprawione mieszkanie testowe',
          propertyType: PropertyType.APARTMENT,
          transactionType: TransactionType.SALE,
          price: 520000,
          currency: 'PLN',
          areaM2: 52,
        },
        address: {
          city: 'Kraków',
        },
        images: [
          {
            url: 'https://podadresem.test/uploads/photo.webp',
            altText: 'Salon',
            order: 0,
          },
        ],
      },
    });
    const { service, activityService } = buildService(submission);

    const result = await service.resubmitForOwner('owner-1', submission.id);

    expect(submission.status).toBe(PublicListingSubmissionStatus.CLAIMED);
    expect(submission.rejectedAt).toBeNull();
    expect(listing.title).toBe('Poprawione mieszkanie testowe');
    expect(listing.price).toBe(520000);
    expect(listing.publicationStatus).toBe(ListingPublicationStatus.DRAFT);
    expect(submission.metadata.sellerResubmission).toEqual(
      expect.objectContaining({
        resubmittedAt: expect.any(String),
      }),
    );
    expect(activityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        entityId: listing.id,
        action: ActivityAction.STATUS_CHANGED,
      }),
    );
    expect(result.status).toBe(PublicListingSubmissionStatus.CLAIMED);
  });

  it('allows the owner to edit a published claimed submission', async () => {
    const listing = buildListing({
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publicSlug: 'mieszkanie-testowe-warszawa',
    });
    const submission = buildSubmission({
      publishedListing: listing,
    });
    const { service, submissionRepo } = buildService(submission);

    const result = await service.updateForOwner('owner-1', submission.id, {
      listing: {
        title: 'Zaktualizowane mieszkanie testowe',
        propertyType: PropertyType.APARTMENT,
        transactionType: TransactionType.SALE,
        price: 525000,
        currency: 'PLN',
        areaM2: 50,
      },
    });

    expect(submissionRepo.save).toHaveBeenCalledWith(submission);
    expect(submission.payload.listing.title).toBe(
      'Zaktualizowane mieszkanie testowe',
    );
    expect(result.title).toBe('Zaktualizowane mieszkanie testowe');
  });

  it('blocks owner edits while a claimed submission is waiting for moderation', async () => {
    const listing = buildListing({
      publicationStatus: ListingPublicationStatus.DRAFT,
    });
    const submission = buildSubmission({
      publishedListing: listing,
    });
    const { service, submissionRepo } = buildService(submission);

    await expect(
      service.updateForOwner('owner-1', submission.id, {
        listing: {
          title: 'Próba edycji w moderacji',
          propertyType: PropertyType.APARTMENT,
          transactionType: TransactionType.SALE,
          price: 525000,
          currency: 'PLN',
          areaM2: 50,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(submissionRepo.save).not.toHaveBeenCalled();
  });

  it('sends 7-day expiry reminders once per expiration date', async () => {
    const expiresAt = new Date('2026-02-08T12:00:00.000Z');
    const listing = buildListing({
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publicSlug: 'mieszkanie-testowe-warszawa',
      expiresAt,
    });
    const submission = buildSubmission({
      publishedListing: listing,
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt,
    });
    const { service, emailService, submissionRepo } = buildService(submission);
    mockSubmissionQueryBuilder(submissionRepo, [submission]);

    const result = await service.sendExpiringSoonReminders(
      new Date('2026-02-01T12:00:00.000Z'),
    );

    expect(result).toEqual({
      processed: 1,
      sent: 1,
      skipped: 0,
    });
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: submission.email,
        subject: 'Twoje ogłoszenie wygaśnie za 7 dni',
        text: expect.stringContaining(
          'Odnów je tutaj: https://podadresem.test/seller/listings/submission-1',
        ),
      }),
    );
    expect(submission.metadata.expiryReminder7Days).toMatchObject({
      expiresAt: expiresAt.toISOString(),
    });
    expect(submissionRepo.save).toHaveBeenCalledWith(submission);
  });

  it('skips an expiry reminder already sent for the same expiration date', async () => {
    const expiresAt = new Date('2026-02-08T12:00:00.000Z');
    const listing = buildListing({
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      expiresAt,
    });
    const submission = buildSubmission({
      publishedListing: listing,
      expiresAt,
      metadata: {
        expiryReminder7Days: {
          sentAt: '2026-02-01T08:00:00.000Z',
          expiresAt: expiresAt.toISOString(),
        },
      },
    });
    const { service, emailService, submissionRepo } = buildService(submission);
    mockSubmissionQueryBuilder(submissionRepo, [submission]);

    const result = await service.sendExpiringSoonReminders(
      new Date('2026-02-01T12:00:00.000Z'),
    );

    expect(result).toEqual({
      processed: 1,
      sent: 0,
      skipped: 1,
    });
    expect(emailService.send).not.toHaveBeenCalled();
    expect(submissionRepo.save).not.toHaveBeenCalled();
  });
});
