import {
  ListingCondition,
  ListingHeatingType,
  ListingMarketType,
  ListingPlotType,
  ListingLocalPlanStatus,
  PropertyType,
  TransactionType,
} from './listings';
import { buildListingHighlights } from './listing-description-assistant';

describe('listing description assistant highlights', () => {
  it('builds concise apartment highlights from core and details fields', () => {
    const highlights = buildListingHighlights({
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      areaM2: 62,
      rooms: 3,
      floor: 2,
      totalFloors: 5,
      yearBuilt: 2018,
      listingDetails: {
        marketType: ListingMarketType.SECONDARY,
        condition: ListingCondition.VERY_GOOD,
        hasBalcony: true,
        hasElevator: true,
      },
    });

    expect(highlights).toEqual([
      '62 m²',
      '3 pokoje',
      'piętro 2/5',
      'bardzo dobry stan',
      'rynek wtórny',
      'balkon',
      'winda',
    ]);
  });

  it('builds house highlights with plot, heating and parking context', () => {
    const highlights = buildListingHighlights({
      propertyType: PropertyType.HOUSE,
      transactionType: TransactionType.SALE,
      areaM2: 146,
      plotAreaM2: 823,
      rooms: 5,
      listingDetails: {
        heatingType: ListingHeatingType.HEAT_PUMP,
        hasParking: true,
        parkingSpaces: 2,
      },
    });

    expect(highlights).toEqual([
      '146 m²',
      'działka 823 m²',
      '5 pokoi',
      'pompa ciepła',
      '2 miejsca parkingowe',
    ]);
  });

  it('builds land highlights without duplicated area text', () => {
    const highlights = buildListingHighlights({
      propertyType: PropertyType.LAND,
      transactionType: TransactionType.SALE,
      plotAreaM2: 1240,
      listingDetails: {
        plotType: ListingPlotType.BUILDING,
        localPlanStatus: ListingLocalPlanStatus.YES,
      },
    });

    expect(highlights).toEqual(['1240 m²', 'budowlana', 'MPZP']);
  });

  it('limits generated highlights to seven items', () => {
    const highlights = buildListingHighlights({
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      areaM2: 72,
      rooms: 4,
      floor: 3,
      totalFloors: 8,
      yearBuilt: 2020,
      listingDetails: {
        marketType: ListingMarketType.PRIMARY,
        condition: ListingCondition.DEVELOPER_STANDARD,
        heatingType: ListingHeatingType.DISTRICT,
        hasBalcony: true,
        hasElevator: true,
        hasParking: true,
        parkingSpaces: 1,
      },
    });

    expect(highlights).toHaveLength(7);
  });
});
