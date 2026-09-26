import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import {
  ListingPublicationStatus,
  ListingStatus,
  PublicListingSubmissionStatus,
} from '../common/enums';
import { Listing } from '../listings/entities';
import { PublicListingSubmission } from '../public-listing-submissions/entities';
import { ReleaseFlagsService } from '../release-flags';
import { ListingProductCatalog } from './entities';
import { ListingProductType } from './listing-commerce.types';
import type { ListingQuoteDiscountInput } from './listing-quote.calculator';
import { ListingManualAdjustmentsService } from './listing-manual-adjustments.service';
import { ListingPromotionsService } from './listing-promotions.service';
import { ListingQuotesService } from './listing-quotes.service';

function buildListing(overrides: Partial<Listing> = {}): Listing {
  return Object.assign(new Listing(), {
    id: '11111111-1111-4111-8111-111111111111',
    ownerUserId: 'owner-1',
    status: ListingStatus.DRAFT,
    publicationStatus: ListingPublicationStatus.DRAFT,
    publishedAt: null,
    expiresAt: null,
    ...overrides,
  });
}

function buildSubmission(
  overrides: Partial<PublicListingSubmission> = {},
): PublicListingSubmission {
  return Object.assign(new PublicListingSubmission(), {
    id: 'submission-1',
    ownerUserId: 'owner-1',
    publishedListingId: '11111111-1111-4111-8111-111111111111',
    status: PublicListingSubmissionStatus.APPROVED,
    metadata: {},
    ...overrides,
  });
}

function buildProduct(
  overrides: Partial<ListingProductCatalog> = {},
): ListingProductCatalog {
  return Object.assign(new ListingProductCatalog(), {
    id: 'product-1',
    code: 'publication_60_days',
    name: 'Publikacja ogłoszenia',
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 4_900,
    currency: 'PLN',
    vatRateBasisPoints: 2_300,
    durationDays: 60,
    featuredTier: null,
    priorityWeight: 0,
    fulfillmentParameters: { durationDays: 60 },
    isPublic: true,
    isActive: true,
    archivedAt: null,
    ...overrides,
  });
}

function buildService(options?: {
  listing?: Listing | null;
  submission?: PublicListingSubmission | null;
  products?: ListingProductCatalog[];
  checkoutEnabled?: boolean;
  featuredEnabled?: boolean;
  promotionsEnabled?: boolean;
  discounts?: ListingQuoteDiscountInput[];
  manualAdjustmentDiscounts?: ListingQuoteDiscountInput[];
}) {
  const listing =
    options && 'listing' in options ? options.listing : buildListing();
  const submission =
    options && 'submission' in options
      ? options.submission
      : buildSubmission();
  const listingRepo = {
    findOne: jest.fn().mockResolvedValue(listing),
  };
  const submissionRepo = {
    findOne: jest.fn().mockResolvedValue(submission),
  };
  const productRepo = {
    find: jest
      .fn()
      .mockResolvedValue(options?.products ?? [buildProduct()]),
  };
  const releaseFlagsService = {
    getFlags: jest.fn().mockReturnValue({
      privateListingCheckoutEnabled: options?.checkoutEnabled ?? true,
      privateListingFeaturedEnabled: options?.featuredEnabled ?? false,
      privateListingPromotionsEnabled: options?.promotionsEnabled ?? false,
    }),
  };
  const promotionsService = {
    resolveDiscounts: jest.fn().mockResolvedValue(options?.discounts ?? []),
  };
  const manualAdjustmentsService = {
    resolveDiscounts: jest
      .fn()
      .mockResolvedValue(options?.manualAdjustmentDiscounts ?? []),
  };
  const service = new ListingQuotesService(
    listingRepo as unknown as Repository<Listing>,
    submissionRepo as unknown as Repository<PublicListingSubmission>,
    productRepo as unknown as Repository<ListingProductCatalog>,
    releaseFlagsService as unknown as ReleaseFlagsService,
    promotionsService as unknown as ListingPromotionsService,
    manualAdjustmentsService as unknown as ListingManualAdjustmentsService,
  );

  return {
    service,
    listingRepo,
    submissionRepo,
    productRepo,
    promotionsService,
    manualAdjustmentsService,
  };
}

const quoteDto = {
  listingId: '11111111-1111-4111-8111-111111111111',
  items: [{ productCode: 'publication_60_days', quantity: 1 }],
};

describe('ListingQuotesService', () => {
  afterEach(() => jest.useRealTimers());

  it('returns the authoritative current catalog price for the owner', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const { service, listingRepo, productRepo } = buildService();

    const quote = await service.createQuote('owner-1', quoteDto);

    expect(listingRepo.findOne).toHaveBeenCalledWith({
      where: { id: quoteDto.listingId, ownerUserId: 'owner-1' },
    });
    expect(productRepo.find).toHaveBeenCalled();
    expect(quote).toMatchObject({
      totalGrossAmount: 4_900,
      vatGrossAmount: 916,
      expiresAt: '2026-09-07T10:30:00.000Z',
      discounts: [],
    });
  });

  it('does not reveal a listing that is not owned by the caller', async () => {
    const { service, submissionRepo, productRepo } = buildService({
      listing: null,
    });

    await expect(service.createQuote('intruder', quoteDto)).rejects.toThrow(
      NotFoundException,
    );
    expect(submissionRepo.findOne).not.toHaveBeenCalled();
    expect(productRepo.find).not.toHaveBeenCalled();
  });

  it('rejects listings outside the private seller submission flow', async () => {
    const { service } = buildService({ submission: null });

    await expect(service.createQuote('owner-1', quoteDto)).rejects.toThrow(
      'wyłącznie dla ogłoszeń klientów indywidualnych',
    );
  });

  it('rejects a quote before moderation approval', async () => {
    const { service } = buildService({
      submission: buildSubmission({
        status: PublicListingSubmissionStatus.IN_REVIEW,
      }),
    });

    await expect(service.createQuote('owner-1', quoteDto)).rejects.toThrow(
      'nie zostało jeszcze zatwierdzone',
    );
  });

  it('rejects inactive, private, archived or unknown catalog products', async () => {
    const { service } = buildService({ products: [] });

    await expect(service.createQuote('owner-1', quoteDto)).rejects.toThrow(
      'wybrany produkt jest niedostępny',
    );
  });

  it('rejects duplicated product codes', async () => {
    const { service, productRepo } = buildService();

    await expect(
      service.createQuote('owner-1', {
        ...quoteDto,
        items: [...quoteDto.items, ...quoteDto.items],
      }),
    ).rejects.toThrow('tylko raz');
    expect(productRepo.find).not.toHaveBeenCalled();
  });

  it('keeps promotion codes disabled until the promotion engine exists', async () => {
    const { service, listingRepo } = buildService();

    await expect(
      service.createQuote('owner-1', {
        ...quoteDto,
        promotionCode: 'START10',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(listingRepo.findOne).not.toHaveBeenCalled();
  });

  it('applies resolved promotion discounts to the quote snapshot', async () => {
    const { service, promotionsService } = buildService({
      promotionsEnabled: true,
      discounts: [
        {
          sourceType: 'promotion_code',
          sourceReference: 'promotion-code-id',
          label: 'Kod promocyjny',
          grossAmount: 1_000,
          productCodes: ['publication_60_days'],
        },
      ],
    });

    const quote = await service.createQuote('owner-1', {
      ...quoteDto,
      promotionCode: 'START10',
    });

    expect(promotionsService.resolveDiscounts).toHaveBeenCalledWith({
      products: [expect.objectContaining({ code: 'publication_60_days' })],
      promotionCode: 'START10',
      now: expect.any(Date),
    });
    expect(quote).toMatchObject({
      subtotalGrossAmount: 4_900,
      discountGrossAmount: 1_000,
      totalGrossAmount: 3_900,
      discounts: [
        {
          sourceType: 'promotion_code',
          sourceReference: 'promotion-code-id',
          label: 'Kod promocyjny',
          grossAmount: 1_000,
        },
      ],
    });
  });

  it('applies automatic promotion discounts when no code is provided', async () => {
    const { service, promotionsService } = buildService({
      promotionsEnabled: true,
      discounts: [
        {
          sourceType: 'campaign',
          sourceReference: 'campaign-id',
          label: 'Promocja startowa',
          grossAmount: 900,
          productCodes: ['publication_60_days'],
        },
      ],
    });

    const quote = await service.createQuote('owner-1', quoteDto);

    expect(promotionsService.resolveDiscounts).toHaveBeenCalledWith({
      products: [expect.objectContaining({ code: 'publication_60_days' })],
      promotionCode: undefined,
      now: expect.any(Date),
    });
    expect(quote.discountGrossAmount).toBe(900);
    expect(quote.totalGrossAmount).toBe(4_000);
  });

  it('applies active admin adjustments as separate quote discounts', async () => {
    const { service, manualAdjustmentsService } = buildService({
      manualAdjustmentDiscounts: [
        {
          sourceType: 'admin_adjustment',
          sourceReference: 'adjustment-1',
          label: 'Ręczna korekta ceny',
          grossAmount: 1_000,
          productCodes: ['publication_60_days'],
        },
      ],
    });

    const quote = await service.createQuote('owner-1', quoteDto);

    expect(manualAdjustmentsService.resolveDiscounts).toHaveBeenCalledWith({
      listingId: quoteDto.listingId,
      products: [expect.objectContaining({ code: 'publication_60_days' })],
      now: expect.any(Date),
    });
    expect(quote).toMatchObject({
      subtotalGrossAmount: 4_900,
      discountGrossAmount: 1_000,
      totalGrossAmount: 3_900,
      discounts: [
        {
          sourceType: 'admin_adjustment',
          sourceReference: 'adjustment-1',
          label: 'Ręczna korekta ceny',
          grossAmount: 1_000,
        },
      ],
    });
  });

  it('gates quote creation independently from public pricing', async () => {
    const { service, listingRepo } = buildService({ checkoutEnabled: false });

    await expect(service.createQuote('owner-1', quoteDto)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(listingRepo.findOne).not.toHaveBeenCalled();
  });

  it('gates featured products and validates active publication when enabled', async () => {
    const featured = buildProduct({
      code: 'featured_7_days',
      type: ListingProductType.FEATURED,
      priceGrossAmount: 1_900,
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
    });
    const featuredDto = {
      ...quoteDto,
      items: [{ productCode: featured.code, quantity: 1 }],
    };
    const gated = buildService({ products: [featured] });
    await expect(
      gated.service.createQuote('owner-1', featuredDto),
    ).rejects.toThrow('Wyróżnienia nie są jeszcze dostępne');

    const enabled = buildService({
      products: [featured],
      featuredEnabled: true,
      listing: buildListing({
        status: ListingStatus.ACTIVE,
        publicationStatus: ListingPublicationStatus.PUBLISHED,
        publishedAt: new Date('2026-08-01T10:00:00.000Z'),
        expiresAt: new Date('2099-10-01T10:00:00.000Z'),
      }),
    });
    await expect(
      enabled.service.createQuote('owner-1', featuredDto),
    ).resolves.toMatchObject({ totalGrossAmount: 1_900 });
  });

  it('allows featured for an expired listing only when renewal is bought together', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-07T10:00:00.000Z'));
    const featured = buildProduct({
      code: 'featured_7_days',
      type: ListingProductType.FEATURED,
      priceGrossAmount: 1_900,
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
    });
    const renewal = buildProduct({
      id: 'product-renewal',
      code: 'renewal_30_days',
      type: ListingProductType.RENEWAL,
      priceGrossAmount: 3_900,
      durationDays: 30,
      fulfillmentParameters: { durationDays: 30 },
    });
    const expiredListing = buildListing({
      status: ListingStatus.ACTIVE,
      publicationStatus: ListingPublicationStatus.PUBLISHED,
      publishedAt: new Date('2026-08-01T10:00:00.000Z'),
      expiresAt: new Date('2026-09-01T10:00:00.000Z'),
    });
    const featuredOnlyDto = {
      ...quoteDto,
      items: [{ productCode: featured.code, quantity: 1 }],
    };
    const featuredOnly = buildService({
      products: [featured],
      featuredEnabled: true,
      listing: expiredListing,
    });

    await expect(
      featuredOnly.service.createQuote('owner-1', featuredOnlyDto),
    ).rejects.toThrow('odnowić je razem z wyróżnieniem');

    const renewalWithFeatured = buildService({
      products: [featured, renewal],
      featuredEnabled: true,
      listing: expiredListing,
    });

    await expect(
      renewalWithFeatured.service.createQuote('owner-1', {
        ...quoteDto,
        items: [
          { productCode: renewal.code, quantity: 1 },
          { productCode: featured.code, quantity: 1 },
        ],
      }),
    ).resolves.toMatchObject({ totalGrossAmount: 5_800 });
  });

  it('locks the listing and catalog products when quoting inside an order transaction', async () => {
    const { service, listingRepo } = buildService();
    const listing = buildListing();
    const submission = buildSubmission();
    const product = buildProduct();
    const manager = {
      findOne: jest.fn(async (entity: unknown) =>
        entity === Listing ? listing : submission,
      ),
      find: jest.fn().mockResolvedValue([product]),
    } as unknown as EntityManager;

    await expect(
      service.createQuoteInTransaction(
        manager,
        'owner-1',
        quoteDto,
        new Date('2026-09-07T10:00:00.000Z'),
      ),
    ).resolves.toMatchObject({ quote: { totalGrossAmount: 4_900 } });
    expect(manager.findOne).toHaveBeenCalledWith(
      Listing,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(manager.find).toHaveBeenCalledWith(
      ListingProductCatalog,
      expect.objectContaining({ lock: { mode: 'pessimistic_read' } }),
    );
    expect(listingRepo.findOne).not.toHaveBeenCalled();
  });
});
