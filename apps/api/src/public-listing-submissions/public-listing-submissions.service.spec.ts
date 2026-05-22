import { BadRequestException } from '@nestjs/common';
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
    },
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
    findOne: jest.fn().mockResolvedValue(submission),
  };
  const listingRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };
  const activityService = {
    log: jest.fn().mockResolvedValue(undefined),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (manager: unknown) => unknown) =>
      callback({
        save: jest.fn(async (_entity: unknown, value: unknown) => value),
      }),
    ),
  };

  return {
    service: new PublicListingSubmissionsService(
      submissionRepo as never,
      listingRepo as never,
      dataSource as never,
      activityService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ),
    activityService,
    listing: submission.publishedListing as Listing,
  };
}

describe('PublicListingSubmissionsService admin moderation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('approves a claimed submission without changing ownership', async () => {
    const submission = buildSubmission();
    const { service, activityService, listing } = buildService(submission);

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
});
