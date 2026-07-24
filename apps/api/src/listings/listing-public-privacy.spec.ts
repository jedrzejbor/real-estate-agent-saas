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
const MESSAGE_RECIPIENT_KEYS = ['messageRecipient', 'ownerUser'];
const OWNER_PRIVATE_KEYS = [
  'ownerUserId',
  'ownerEmail',
  'ownerPhone',
  'contactEmail',
  'contactPhone',
];
const LISTING_AGENT_PROPOSAL_KEYS = [
  'proposals',
  'listingAgentProposals',
  'acceptedTermsSnapshot',
  'commissionType',
  'commissionValue',
  'minimumContractMonths',
  'exclusivity',
  'marketingPlan',
  'valuationOpinion',
  'availability',
  'message',
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

  it('does not expose message recipient fields in public listing detail', () => {
    const payload = service.toPublicListingView(buildListingWithCommission());

    expect(payload).not.toContainMessageRecipientFields();
  });

  it('does not expose owner private identity fields in public listing detail', () => {
    const payload = service.toPublicListingView(buildListingWithCommission());

    expect(payload).not.toContainOwnerPrivateFields();
  });

  it('does not expose agent proposal fields in public listing detail', () => {
    const payload = service.toPublicListingView(buildListingWithCommission());

    expect(payload).not.toContainListingAgentProposalFields();
  });

  it('exposes neutral platform branding alias in public listing detail', () => {
    const payload = service.toPublicListingView({
      ...buildListingWithCommission(),
      estateflowBrandingEnabled: false,
    }) as Record<string, unknown>;

    expect(payload.platformBrandingEnabled).toBe(false);
    expect(payload.estateflowBrandingEnabled).toBe(false);
  });

  it('does not expose commission fields in public catalog item', () => {
    const payload = service.toPublicCatalogItem(buildListingWithCommission());

    expect(payload).not.toContainCommissionFields();
  });

  it('does not expose document fields in public catalog item', () => {
    const payload = service.toPublicCatalogItem(buildListingWithCommission());

    expect(payload).not.toContainDocumentFields();
  });

  it('does not expose message recipient fields in public catalog item', () => {
    const payload = service.toPublicCatalogItem(buildListingWithCommission());

    expect(payload).not.toContainMessageRecipientFields();
  });

  it('does not expose owner private identity fields in public catalog item', () => {
    const payload = service.toPublicCatalogItem(buildListingWithCommission());

    expect(payload).not.toContainOwnerPrivateFields();
  });

  it('does not expose agent proposal fields in public catalog item', () => {
    const payload = service.toPublicCatalogItem(buildListingWithCommission());

    expect(payload).not.toContainListingAgentProposalFields();
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

  it('does not expose message recipient fields in public catalog map markers', () => {
    const payload = service.buildPublicCatalogMapMarkers(
      [buildListingWithCommission()],
      10,
    );

    expect(payload).not.toContainMessageRecipientFields();
  });

  it('does not expose owner private identity fields in public catalog map markers', () => {
    const payload = service.buildPublicCatalogMapMarkers(
      [buildListingWithCommission()],
      10,
    );

    expect(payload).not.toContainOwnerPrivateFields();
  });

  it('does not expose agent proposal fields in public catalog map markers', () => {
    const payload = service.buildPublicCatalogMapMarkers(
      [buildListingWithCommission()],
      10,
    );

    expect(payload).not.toContainListingAgentProposalFields();
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
  toContainMessageRecipientFields(received: unknown) {
    const foundKeys = findKeys(received, MESSAGE_RECIPIENT_KEYS);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain message recipient fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain message recipient fields',
    };
  },
  toContainOwnerPrivateFields(received: unknown) {
    const foundKeys = findKeys(received, OWNER_PRIVATE_KEYS);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain owner private fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain owner private fields',
    };
  },
  toContainListingAgentProposalFields(received: unknown) {
    const foundKeys = findKeys(received, LISTING_AGENT_PROPOSAL_KEYS);

    return {
      pass: foundKeys.length > 0,
      message: () =>
        foundKeys.length > 0
          ? `Expected payload not to contain listing agent proposal fields, found: ${foundKeys.join(', ')}`
          : 'Expected payload to contain listing agent proposal fields',
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainCommissionFields(): R;
      toContainDocumentFields(): R;
      toContainMessageRecipientFields(): R;
      toContainOwnerPrivateFields(): R;
      toContainListingAgentProposalFields(): R;
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
    ownerUserId: 'owner-user-1',
    ownerEmail: 'owner@example.com',
    ownerPhone: '+48123123123',
    contactEmail: 'owner@example.com',
    contactPhone: '+48123123123',
    messageRecipient: {
      type: 'owner_user',
      id: 'owner-user-1',
      name: 'Owner User',
      email: 'owner@example.com',
      phone: '+48123123123',
    },
    ownerUser: {
      id: 'owner-user-1',
      email: 'owner@example.com',
    },
    listingAgentProposals: [
      {
        id: 'proposal-1',
        commissionType: 'percentage',
        commissionValue: '2.50',
        minimumContractMonths: 3,
        exclusivity: 'exclusive',
        marketingPlan: 'Prywatny plan marketingowy',
        valuationOpinion: 'Prywatna opinia o cenie',
        availability: 'Prywatna dostępność',
        message: 'Prywatna wiadomość agenta',
      },
    ],
    proposals: [
      {
        id: 'proposal-2',
        acceptedTermsSnapshot: {
          commissionType: 'fixed',
          commissionValue: '12000.00',
        },
      },
    ],
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

function findKeys(value: unknown, keys: string[], path = '$'): string[] {
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
