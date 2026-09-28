import 'reflect-metadata';
import { SelectQueryBuilder } from 'typeorm';
import { PublicListingCatalogSort } from './dto';
import { ListingsService } from './listings.service';

describe('ListingsService public catalog featured sorting', () => {
  it('prioritizes active featured entitlements before newest fallback', () => {
    const qb = new FakePublicCatalogQueryBuilder();
    const service = buildService();

    service.applyPublicCatalogSort(
      qb as unknown as SelectQueryBuilder<never>,
      PublicListingCatalogSort.NEWEST,
    );

    expect(qb.parameters).toMatchObject({
      publicFeaturedEntitlementType: 'featured',
      publicFeaturedEntitlementStatus: 'active',
    });
    expect(qb.selects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alias: 'public_featured_priority_weight',
          expression: expect.stringContaining('listing_entitlements'),
        }),
        expect.objectContaining({
          alias: 'public_featured_rotation_key',
          expression: "md5(listing.id::text || CURRENT_DATE::text)",
        }),
      ]),
    );
    expect(qb.orders).toEqual([
      ['public_featured_priority_weight', 'DESC'],
      ['public_featured_rotation_key', 'ASC'],
      ['listing.publishedAt', 'DESC'],
      ['listing.id', 'DESC'],
    ]);
  });

  it('keeps featured prioritization ahead of explicit price sorting', () => {
    const qb = new FakePublicCatalogQueryBuilder();
    const service = buildService();

    service.applyPublicCatalogSort(
      qb as unknown as SelectQueryBuilder<never>,
      PublicListingCatalogSort.PRICE_ASC,
    );

    expect(qb.orders).toEqual([
      ['public_featured_priority_weight', 'DESC'],
      ['public_featured_rotation_key', 'ASC'],
      ['public_price_sort_missing', 'ASC'],
      ['public_price_sort_value', 'ASC'],
      ['listing.publishedAt', 'DESC'],
      ['listing.id', 'DESC'],
    ]);
  });
});

function buildService(): {
  applyPublicCatalogSort: (
    qb: SelectQueryBuilder<never>,
    sort: PublicListingCatalogSort,
  ) => void;
} {
  return new ListingsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as {
    applyPublicCatalogSort: (
      qb: SelectQueryBuilder<never>,
      sort: PublicListingCatalogSort,
    ) => void;
  };
}

class FakePublicCatalogQueryBuilder {
  readonly parameters: Record<string, unknown> = {};
  readonly selects: Array<{ expression: string; alias: string }> = [];
  readonly orders: Array<[string, 'ASC' | 'DESC']> = [];

  setParameter(key: string, value: unknown): this {
    this.parameters[key] = value;
    return this;
  }

  addSelect(expression: string, alias: string): this {
    this.selects.push({ expression, alias });
    return this;
  }

  orderBy(expression: string, direction: 'ASC' | 'DESC'): this {
    this.orders.length = 0;
    this.orders.push([expression, direction]);
    return this;
  }

  addOrderBy(expression: string, direction: 'ASC' | 'DESC'): this {
    this.orders.push([expression, direction]);
    return this;
  }
}
