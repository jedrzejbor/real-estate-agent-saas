import type { ListingQuoteContract } from './contracts';
import { ListingCommerceTelemetryService } from './listing-commerce-telemetry.service';
import { ListingProductType } from './listing-commerce.types';

function buildQuote(): ListingQuoteContract {
  return {
    listingId: 'listing-1',
    currency: 'PLN',
    quotedAt: '2026-09-13T10:00:00.000Z',
    expiresAt: '2026-09-13T10:30:00.000Z',
    subtotalGrossAmount: 4_900,
    discountGrossAmount: 1_000,
    totalGrossAmount: 3_900,
    vatGrossAmount: 729,
    items: [
      {
        productCode: 'publication_60_days',
        productName: 'Publikacja ogłoszenia',
        productType: ListingProductType.PUBLICATION,
        quantity: 1,
        unitGrossAmount: 4_900,
        subtotalGrossAmount: 4_900,
        discountGrossAmount: 1_000,
        totalGrossAmount: 3_900,
        vatRateBasisPoints: 2_300,
        vatGrossAmount: 729,
        durationDays: 60,
        fulfillmentParameters: { durationDays: 60 },
      },
    ],
    discounts: [
      {
        sourceType: 'promotion_code',
        sourceReference: 'promotion-code-id',
        label: 'Kod promocyjny',
        grossAmount: 1_000,
      },
    ],
  };
}

describe('ListingCommerceTelemetryService', () => {
  it('tracks quote telemetry without storing plaintext promotion codes', async () => {
    const analyticsService = {
      trackSystemEvent: jest.fn().mockResolvedValue({ id: 'event-1' }),
    };
    const service = new ListingCommerceTelemetryService(
      analyticsService as never,
    );

    await service.trackQuoteCreated({
      buyerUserId: 'owner-1',
      quote: buildQuote(),
      promotionCodeProvided: true,
    });

    expect(analyticsService.trackSystemEvent).toHaveBeenCalledWith({
      name: 'listing_quote_created',
      userId: 'owner-1',
      properties: expect.objectContaining({
        listingId: 'listing-1',
        totalGrossAmount: 3_900,
        discountSourceTypes: ['promotion_code'],
        promotionCodeProvided: true,
      }),
    });
    expect(
      JSON.stringify(analyticsService.trackSystemEvent.mock.calls[0][0]),
    ).not.toContain('START10');
  });

  it('does not fail commerce flows when analytics tracking fails', async () => {
    const analyticsService = {
      trackSystemEvent: jest.fn().mockRejectedValue(new Error('offline')),
    };
    const service = new ListingCommerceTelemetryService(
      analyticsService as never,
    );

    await expect(
      service.trackQuoteCreated({
        buyerUserId: 'owner-1',
        quote: buildQuote(),
        promotionCodeProvided: false,
      }),
    ).resolves.toBeUndefined();
  });
});

