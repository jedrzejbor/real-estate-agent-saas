import { ListingCommissionType } from '../common/enums';
import { ListingsService } from './listings.service';

const COMMISSION_KEYS = [
  'commissionType',
  'commissionValue',
  'commissionAmount',
];
const DOCUMENT_KEYS = [
  'documents',
  'storageKey',
  'checksum',
  'reviewedByUserId',
  'uploadedByUserId',
];

describe('public listing privacy', () => {
  let service: {
    toPublicListingView: (listing: Record<string, unknown>) => unknown;
    toPublicCatalogItem: (listing: Record<string, unknown>) => unknown;
    buildPublicCatalogMapMarkers: (
      listings: Record<string, unknown>[],
      limit: number,
    ) => unknown;
  };

  beforeEach(() => {
    service = new ListingsService(
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
    ) as unknown as typeof service;
  });

  it('does not expose commission fields in public listing detail', () => {
    const payload = service.toPublicListingView(buildListingWithCommission());

    expect(payload).not.toContainCommissionFields();
  });

  it('does not expose document fields in public listing detail', () => {
    const payload = service.toPublicListingView(buildListingWithCommission());

    expect(payload).not.toContainDocumentFields();
  });

  it('does not expose commission fields in public catalog item', () => {
    const payload = service.toPublicCatalogItem(buildListingWithCommission());

    expect(payload).not.toContainCommissionFields();
  });

  it('does not expose document fields in public catalog item', () => {
    const payload = service.toPublicCatalogItem(buildListingWithCommission());

    expect(payload).not.toContainDocumentFields();
  });

  it('does not expose commission fields in public catalog map markers', () => {
    const payload = service.buildPublicCatalogMapMarkers(
      [buildListingWithCommission()],
      10,
    );

    expect(payload).not.toContainCommissionFields();
  });

  it('does not expose document fields in public catalog map markers', () => {
    const payload = service.buildPublicCatalogMapMarkers(
      [buildListingWithCommission()],
      10,
    );

    expect(payload).not.toContainDocumentFields();
  });
});

expect.extend({
  toContainCommissionFields(received: unknown) {
    const foundKeys = findCommissionKeys(received);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain commission fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain commission fields',
    };
  },
  toContainDocumentFields(received: unknown) {
    const foundKeys = findKeys(received, DOCUMENT_KEYS);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain document fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain document fields',
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainCommissionFields(): R;
      toContainDocumentFields(): R;
    }
  }
}

function buildListingWithCommission(): Record<string, unknown> {
  const publishedAt = new Date('2026-06-11T12:00:00.000Z');

  return {
    id: 'listing-1',
    publicSlug: 'testowa-oferta',
    publicationStatus: 'published',
    title: 'Testowa oferta',
    publicTitle: 'Publiczna testowa oferta',
    description: 'Opis prywatny',
    publicDescription: 'Opis publiczny',
    propertyType: 'apartment',
    transactionType: 'sale',
    price: '850000.00',
    currency: 'PLN',
    commissionType: ListingCommissionType.PERCENTAGE,
    commissionValue: '2.50',
    commissionAmount: 21250,
    areaM2: '64.00',
    plotAreaM2: null,
    rooms: 3,
    bathrooms: 1,
    floor: 2,
    totalFloors: 5,
    yearBuilt: 2018,
    address: {
      city: 'Warszawa',
      district: 'Mokotow',
      voivodeship: 'mazowieckie',
      street: 'Testowa 1',
      postalCode: '00-001',
      lat: 52.2,
      lng: 21,
    },
    images: [
      {
        id: 'image-1',
        url: '/uploads/listing.jpg',
        order: 0,
        isPrimary: true,
        altText: 'Testowa oferta',
      },
    ],
    agent: {
      id: 'agent-1',
      firstName: 'Anna',
      lastName: 'Agent',
      phone: '+48123123123',
      bio: 'Agentka',
      avatarUrl: null,
      agency: {
        id: 'agency-1',
        name: 'Test Agency',
        logoUrl: null,
      },
    },
    seoTitle: null,
    seoDescription: null,
    shareImageUrl: null,
    estateflowBrandingEnabled: true,
    showPublicViewCount: true,
    showExactAddressOnPublicPage: true,
    showPriceOnPublicPage: true,
    publicViewCount: 7,
    documents: [
      {
        id: 'document-1',
        displayName: 'Umowa pośrednictwa',
        storageKey: 'agent-1/listing-1/private.pdf',
        checksum: 'private-checksum',
        uploadedByUserId: 'user-1',
        reviewedByUserId: 'user-1',
      },
    ],
    publishedAt,
    updatedAt: publishedAt,
    expiresAt: null,
  };
}

function findCommissionKeys(value: unknown, path = '$'): string[] {
  return findKeys(value, COMMISSION_KEYS, path);
}

function findKeys(
  value: unknown,
  keys: string[],
  path = '$',
): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findKeys(item, keys, `${path}[${index}]`),
    );
  }

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nestedValue]) => {
      const currentPath = `${path}.${key}`;
      const matches = keys.includes(key) ? [currentPath] : [];
      return [...matches, ...findKeys(nestedValue, keys, currentPath)];
    },
  );
}
