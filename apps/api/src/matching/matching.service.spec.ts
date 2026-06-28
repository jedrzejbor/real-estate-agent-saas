import { ListingStatus, PropertyType, TransactionType } from '../common/enums';
import { MatchingService } from './matching.service';
import type {
  MatchingClientInput,
  MatchingListingInput,
} from './matching.types';

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService();
  });

  it('returns a high score for an ideal client-listing match', () => {
    const result = service.scoreClientListingMatch(
      buildClient(),
      buildListing(),
    );

    expect(result.isExcluded).toBe(false);
    expect(result.score).toBe(100);
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'price_within_budget',
        'property_type_match',
        'transaction_type_match',
        'city_match',
        'district_match',
        'area_match',
        'rooms_match',
      ]),
    );
  });

  it('keeps a partial match when non-critical preferences differ', () => {
    const result = service.scoreClientListingMatch(
      buildClient({
        preference: {
          propertyType: PropertyType.APARTMENT,
          transactionType: TransactionType.SALE,
          preferredCity: 'Kraków',
          preferredDistrict: 'Kazimierz',
          minArea: 70,
          maxPrice: 900000,
          minRooms: 3,
        },
      }),
      buildListing({
        areaM2: 62,
        rooms: 2,
        address: { city: 'Warszawa', district: 'Mokotów' },
      }),
    );

    expect(result.isExcluded).toBe(false);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'city_mismatch',
        'district_mismatch',
        'area_too_small',
        'rooms_too_low',
      ]),
    );
  });

  it('excludes listing when price is above the client budget ceiling', () => {
    const result = service.scoreClientListingMatch(
      buildClient({ budgetMax: 700000 }),
      buildListing({ price: 850000 }),
    );

    expect(result).toMatchObject({
      isExcluded: true,
      score: 0,
    });
    expect(result.reasons[0]).toMatchObject({
      code: 'price_above_budget',
      type: 'negative',
    });
  });

  it('does not break when client has no preferences', () => {
    const result = service.scoreClientListingMatch(
      buildClient({
        budgetMin: null,
        budgetMax: null,
        preference: null,
      }),
      buildListing(),
    );

    expect(result.isExcluded).toBe(false);
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons.map((reason) => reason.type)).toContain('neutral');
  });

  it('excludes inactive listings', () => {
    const result = service.scoreClientListingMatch(
      buildClient(),
      buildListing({ status: ListingStatus.DRAFT }),
    );

    expect(result).toMatchObject({
      isExcluded: true,
      score: 0,
    });
    expect(result.reasons[0]).toMatchObject({
      code: 'listing_not_active',
      type: 'negative',
    });
  });
});

function buildClient(
  overrides: Partial<MatchingClientInput> = {},
): MatchingClientInput {
  return {
    id: 'client-1',
    budgetMin: 600000,
    budgetMax: 900000,
    preference: {
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      preferredCity: 'Warszawa',
      preferredDistrict: 'Mokotów',
      minArea: 55,
      maxPrice: 900000,
      minRooms: 2,
    },
    ...overrides,
  };
}

function buildListing(
  overrides: Partial<MatchingListingInput> = {},
): MatchingListingInput {
  return {
    id: 'listing-1',
    status: ListingStatus.ACTIVE,
    propertyType: PropertyType.APARTMENT,
    transactionType: TransactionType.SALE,
    price: 820000,
    areaM2: 62,
    rooms: 3,
    address: {
      city: 'Warszawa',
      district: 'Mokotów',
    },
    ...overrides,
  };
}
