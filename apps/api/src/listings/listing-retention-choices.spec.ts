import { BadRequestException } from '@nestjs/common';
import {
  AgencyPlan,
  ListingPublicationStatus,
  ListingStatus,
  PropertyType,
  SubscriptionStatus,
  TransactionType,
} from '../common/enums';
import { AgencyLimitEnforcementService } from '../users';
import { ListingsService } from './listings.service';

const access = {
  agency: {
    id: 'agency-1',
    limitGraceEndsAt: new Date('2026-06-29T00:00:00.000Z'),
  },
  agent: { id: 'agent-1' },
  agencyAgentIds: ['agent-1', 'agent-2'],
  entitlements: {
    plan: {
      code: AgencyPlan.STARTER,
      label: 'Starter',
      status: SubscriptionStatus.ACTIVE,
    },
    limits: {
      activeListings: 2,
      clients: 25,
      monthlyAppointments: 20,
      users: 1,
      imagesPerListing: 15,
    },
    features: {
      reportsOverview: true,
      reportsListingsBasic: true,
      reportsClientsBasic: true,
      reportsAppointmentsBasic: false,
      publicListings: true,
      publicLeadForms: true,
      customBranding: false,
      multiUser: false,
      customDomain: false,
      apiAccess: false,
      dedicatedSupport: false,
    },
  },
};

function buildListing(id: string, input: Record<string, unknown> = {}) {
  return {
    id,
    title: id,
    status: ListingStatus.ACTIVE,
    publicationStatus: ListingPublicationStatus.PUBLISHED,
    price: 500000,
    currency: 'PLN',
    propertyType: PropertyType.APARTMENT,
    transactionType: TransactionType.SALE,
    areaM2: 55,
    rooms: 3,
    isPremium: false,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    address: {
      city: 'Bydgoszcz',
      district: 'Fordon',
    },
    ...input,
  };
}

function buildService(input?: {
  activeListings?: ReturnType<typeof buildListing>[];
  retainedListingIds?: string[];
}) {
  const listingRepo = {
    find: jest.fn().mockResolvedValue(input?.activeListings ?? []),
  };
  const transaction = jest.fn(async (callback) =>
    callback({
      delete: jest.fn(),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(),
    }),
  );
  const retainedListingChoiceRepo = {
    find: jest.fn().mockResolvedValue(
      (input?.retainedListingIds ?? []).map((listingId) => ({ listingId })),
    ),
    manager: { transaction },
  };
  const usersService = {
    getAgencyAccessContext: jest.fn().mockResolvedValue(access),
  };
  const service = new ListingsService(
    listingRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    retainedListingChoiceRepo as never,
    usersService as never,
    new AgencyLimitEnforcementService(),
    {} as never,
    {} as never,
    {} as never,
  );

  return {
    service,
    listingRepo,
    retainedListingChoiceRepo,
    transaction,
  };
}

describe('ListingsService retention choices', () => {
  it('returns active listings, current limit and only active retained choices', async () => {
    const { service } = buildService({
      activeListings: [
        buildListing('listing-1'),
        buildListing('listing-2'),
        buildListing('listing-3'),
      ],
      retainedListingIds: ['listing-1', 'archived-listing'],
    });

    const response = await service.findRetentionChoices('user-1');

    expect(response).toMatchObject({
      agencyId: 'agency-1',
      limit: 2,
      usage: 3,
      isOverLimit: true,
      graceEndsAt: new Date('2026-06-29T00:00:00.000Z'),
      selectedListingIds: ['listing-1'],
    });
    expect(response.listings).toHaveLength(3);
    expect(response.listings[0]).toMatchObject({
      id: 'listing-1',
      city: 'Bydgoszcz',
      district: 'Fordon',
    });
  });

  it('rejects saving more retained choices than the plan limit', async () => {
    const { service, transaction } = buildService({
      activeListings: [
        buildListing('listing-1'),
        buildListing('listing-2'),
        buildListing('listing-3'),
      ],
    });

    await expect(
      service.saveRetentionChoices('user-1', [
        'listing-1',
        'listing-2',
        'listing-3',
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('saves valid choices transactionally and returns refreshed choices', async () => {
    const { service, retainedListingChoiceRepo, transaction } = buildService({
      activeListings: [
        buildListing('listing-1'),
        buildListing('listing-2'),
        buildListing('listing-3'),
      ],
      retainedListingIds: ['listing-2'],
    });

    const response = await service.saveRetentionChoices('user-1', [
      'listing-2',
      'listing-2',
    ]);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(retainedListingChoiceRepo.find).toHaveBeenCalledWith({
      where: { agencyId: 'agency-1' },
      select: ['listingId'],
    });
    expect(response.selectedListingIds).toEqual(['listing-2']);
  });
});
