import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ListingProductCatalog, ListingProductChange } from './entities';
import { AdminListingProductsService } from './admin-listing-products.service';
import {
  ListingProductChangeAction,
  ListingProductType,
} from './listing-commerce.types';

function buildProduct(
  overrides: Partial<ListingProductCatalog> = {},
): ListingProductCatalog {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'publication_60_days',
    name: 'Publikacja ogłoszenia',
    description: 'Publikacja na 60 dni',
    type: ListingProductType.PUBLICATION,
    priceGrossAmount: 4900,
    currency: 'PLN',
    vatRateBasisPoints: null,
    durationDays: 60,
    featuredTier: null,
    priorityWeight: 0,
    fulfillmentParameters: { durationDays: 60 },
    isPublic: true,
    isActive: true,
    sortOrder: 10,
    providerPriceReference: null,
    archivedAt: null,
    createdAt: new Date('2026-09-07T10:00:00.000Z'),
    updatedAt: new Date('2026-09-07T10:00:00.000Z'),
    ...overrides,
  };
}

function buildService(initialProducts: ListingProductCatalog[] = [buildProduct()]) {
  const products = [...initialProducts];
  const changes: ListingProductChange[] = [];

  const manager = {
    findOne: jest.fn(async (entity, options) => {
      if (entity !== ListingProductCatalog) return null;
      return (
        products.find((product) => product.code === options.where.code) ?? null
      );
    }),
    create: jest.fn((entity, value) => {
      if (entity === ListingProductCatalog) {
        return {
          id: `product-${products.length + 1}`,
          createdAt: new Date('2026-09-07T11:00:00.000Z'),
          updatedAt: new Date('2026-09-07T11:00:00.000Z'),
          ...value,
        };
      }
      return {
        id: `change-${changes.length + 1}`,
        createdAt: new Date('2026-09-07T11:00:00.000Z'),
        ...value,
      };
    }),
    save: jest.fn(async (value) => {
      if ('action' in value && 'changes' in value) {
        changes.push(value as ListingProductChange);
        return value;
      }
      const index = products.findIndex((product) => product.id === value.id);
      if (index >= 0) products[index] = value;
      else products.push(value);
      return value;
    }),
  };
  const dataSource = {
    manager,
    transaction: jest.fn(async (callback) => callback(manager)),
    getRepository: jest.fn((entity) => ({
      find: jest.fn(async (options) => {
        if (entity === ListingProductChange && options?.where?.productId) {
          return changes.filter(
            (change) => change.productId === options.where.productId,
          );
        }
        return products;
      }),
    })),
  };

  return {
    service: new AdminListingProductsService(dataSource as never),
    dataSource,
    manager,
    products,
    changes,
  };
}

describe('AdminListingProductsService', () => {
  it('updates a price and writes the audit record in one transaction', async () => {
    const { service, dataSource, changes } = buildService();

    const product = await service.updateProduct(
      'admin-1',
      'publication_60_days',
      { priceGrossAmount: 5900, reason: 'Nowy cennik' },
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(product.priceGrossAmount).toBe(5900);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      actorUserId: 'admin-1',
      action: ListingProductChangeAction.UPDATED,
      reason: 'Nowy cennik',
    });
    expect(changes[0].changes).toContainEqual({
      field: 'priceGrossAmount',
      oldValue: 4900,
      newValue: 5900,
    });
  });

  it('derives fulfillment parameters instead of trusting duplicated input', async () => {
    const featured = buildProduct({
      code: 'featured_7_days',
      type: ListingProductType.FEATURED,
      durationDays: 7,
      featuredTier: 'standard',
      priorityWeight: 100,
      fulfillmentParameters: {},
    });
    const { service } = buildService([featured]);

    const product = await service.updateProduct('admin-1', featured.code, {
      durationDays: 14,
      priorityWeight: 120,
    });

    expect(product.fulfillmentParameters).toEqual({
      durationDays: 14,
      featuredTier: 'standard',
      priorityWeight: 120,
    });
  });

  it('rejects inconsistent public and featured configurations', async () => {
    const { service } = buildService();

    await expect(
      service.updateProduct('admin-1', 'publication_60_days', {
        isActive: false,
        isPublic: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateProduct('admin-1', 'publication_60_days', {
        featuredTier: 'standard',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('archives and restores without republishing automatically', async () => {
    const { service, changes } = buildService();

    const archived = await service.archiveProduct(
      'admin-1',
      'publication_60_days',
      'Wycofanie z oferty',
    );
    const restored = await service.restoreProduct(
      'admin-1',
      'publication_60_days',
      'Ponowne przygotowanie produktu',
    );

    expect(archived).toMatchObject({ isActive: false, isPublic: false });
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(restored).toMatchObject({
      isActive: true,
      isPublic: false,
      archivedAt: null,
    });
    expect(changes.map((change) => change.action)).toEqual([
      ListingProductChangeAction.ARCHIVED,
      ListingProductChangeAction.RESTORED,
    ]);
  });

  it('creates new products with an immutable normalized code', async () => {
    const { service, changes } = buildService([]);

    const product = await service.createProduct('admin-1', {
      code: 'featured_14_days',
      name: ' Wyróżnienie 14 dni ',
      type: ListingProductType.FEATURED,
      priceGrossAmount: 2900,
      currency: 'PLN',
      vatRateBasisPoints: null,
      durationDays: 14,
      featuredTier: ' plus ',
      priorityWeight: 200,
    });

    expect(product).toMatchObject({
      code: 'featured_14_days',
      name: 'Wyróżnienie 14 dni',
      featuredTier: 'plus',
      priceGrossAmount: 2900,
    });
    expect(changes[0].action).toBe(ListingProductChangeAction.CREATED);
  });

  it('rejects duplicate and missing products', async () => {
    const { service } = buildService();

    await expect(
      service.createProduct('admin-1', {
        code: 'publication_60_days',
        name: 'Duplikat',
        type: ListingProductType.PUBLICATION,
        priceGrossAmount: 4900,
        currency: 'PLN',
        durationDays: 60,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(service.findProduct('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
