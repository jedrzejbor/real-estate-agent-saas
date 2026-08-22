jest.mock('./api-client', () => ({
  apiBlobFetch: jest.fn(),
  apiFetch: jest.fn(),
  apiFormDataFetch: jest.fn(),
}));

import { apiFetch } from './api-client';
import {
  createListing,
  ListingMarketType,
  PropertyType,
  TransactionType,
  type CreateListingFormData,
  type Listing,
  type ListingDynamicField,
  type PropertyType as PropertyTypeValue,
} from './listings';
import {
  createPublicListingSubmission,
  createSellerPublicListingSubmission,
  type CreatePublicListingSubmissionInput,
} from './public-listing-submissions';

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

const requiredFieldsByType: Record<
  PropertyTypeValue,
  Partial<CreateListingFormData>
> = {
  apartment: { areaM2: 55, rooms: 3 },
  house: { areaM2: 140, plotAreaM2: 850, rooms: 5 },
  land: { plotAreaM2: 1200 },
  commercial: { areaM2: 90 },
  office: { areaM2: 75 },
  garage: { areaM2: 18 },
};

const visibleFieldsByType: Record<PropertyTypeValue, ListingDynamicField[]> = {
  apartment: [
    'areaM2',
    'rooms',
    'floor',
    'totalFloors',
    'bathrooms',
    'yearBuilt',
  ],
  house: [
    'areaM2',
    'plotAreaM2',
    'rooms',
    'bathrooms',
    'totalFloors',
    'yearBuilt',
  ],
  land: ['plotAreaM2'],
  commercial: [
    'areaM2',
    'rooms',
    'floor',
    'bathrooms',
    'totalFloors',
    'yearBuilt',
  ],
  office: [
    'areaM2',
    'rooms',
    'floor',
    'bathrooms',
    'totalFloors',
    'yearBuilt',
  ],
  garage: ['areaM2', 'floor'],
};

describe('listing creation HTTP contract', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it.each(
    Object.values(PropertyType).flatMap((propertyType) =>
      Object.values(TransactionType).map(
        (transactionType) => [propertyType, transactionType] as const,
      ),
    ),
  )('posts sanitized %s/%s data to the listings endpoint', async (
    propertyType,
    transactionType,
  ) => {
    const input = buildDashboardInput(propertyType, transactionType);
    const response = buildListingResponse(propertyType, transactionType);
    apiFetchMock.mockResolvedValue(response);

    await expect(createListing(input)).resolves.toBe(response);

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock).toHaveBeenCalledWith('/listings', {
      method: 'POST',
      body: expect.objectContaining({
        title: 'Przykładowa oferta nieruchomości',
        description: 'Kompletny opis przykładowej nieruchomości.',
        propertyType,
        transactionType,
        price: 500000,
        address: { city: 'Warszawa' },
        listingDetails: buildListingDetailsInput(propertyType, transactionType),
        ...requiredFieldsByType[propertyType],
      }),
    });

    const requestBody = apiFetchMock.mock.calls[0]?.[1]?.body as Record<
      string,
      unknown
    >;
    const dynamicFields = Object.keys(DYNAMIC_FIELD_VALUES).filter(
      (field): field is ListingDynamicField => field in DYNAMIC_FIELD_VALUES,
    );

    for (const field of dynamicFields) {
      if (visibleFieldsByType[propertyType].includes(field)) {
        expect(requestBody).toHaveProperty(field, input[field]);
      } else {
        expect(requestBody).not.toHaveProperty(field);
      }
    }
  });

  it('posts anonymous submissions without authentication', async () => {
    const input = buildPublicSubmissionInput();
    const response = buildSubmissionResponse();
    apiFetchMock.mockResolvedValue(response);

    await expect(createPublicListingSubmission(input)).resolves.toBe(response);

    expect(apiFetchMock).toHaveBeenCalledWith('/public-listing-submissions', {
      method: 'POST',
      skipAuth: true,
      body: input,
    });
  });

  it('posts private seller submissions through the authenticated endpoint', async () => {
    const input = buildPublicSubmissionInput();
    const response = buildSubmissionResponse();
    apiFetchMock.mockResolvedValue(response);

    await expect(createSellerPublicListingSubmission(input)).resolves.toBe(
      response,
    );

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/public-listing-submissions/seller',
      {
        method: 'POST',
        body: input,
      },
    );
  });
});

const DYNAMIC_FIELD_VALUES: Record<ListingDynamicField, number> = {
  areaM2: 90,
  plotAreaM2: 850,
  rooms: 4,
  bathrooms: 2,
  floor: 3,
  totalFloors: 5,
  yearBuilt: 2020,
};

function buildDashboardInput(
  propertyType: PropertyTypeValue,
  transactionType: CreateListingFormData['transactionType'],
): CreateListingFormData {
  return {
    title: 'Przykładowa oferta nieruchomości',
    description: 'Kompletny opis przykładowej nieruchomości.',
    propertyType,
    transactionType,
    price: 500000,
    address: { city: 'Warszawa' },
    listingDetails: buildListingDetailsInput(propertyType, transactionType),
    ...DYNAMIC_FIELD_VALUES,
    ...requiredFieldsByType[propertyType],
  };
}

function buildListingDetailsInput(
  propertyType: PropertyTypeValue,
  transactionType: CreateListingFormData['transactionType'],
): NonNullable<CreateListingFormData['listingDetails']> {
  return {
    availableFrom: '2026-09-01',
    ...(propertyType !== PropertyType.LAND && propertyType !== PropertyType.GARAGE
      ? { marketType: ListingMarketType.SECONDARY }
      : {}),
    ...(transactionType === TransactionType.SALE
      ? { priceNegotiable: true }
      : propertyType !== PropertyType.LAND
        ? { deposit: 4000 }
        : {}),
  };
}

function buildListingResponse(
  propertyType: PropertyTypeValue,
  transactionType: CreateListingFormData['transactionType'],
): Listing {
  return {
    id: `listing-${propertyType}-${transactionType}`,
    propertyType,
    transactionType,
    status: 'draft',
  } as Listing;
}

function buildPublicSubmissionInput(): CreatePublicListingSubmissionInput {
  return {
    listing: {
      title: 'Przykładowe mieszkanie',
      description: 'Kompletny opis przykładowej nieruchomości.',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      price: 500000,
      areaM2: 55,
      rooms: 3,
    },
    address: { city: 'Warszawa' },
    images: [1, 2, 3].map((index) => ({
      url: `/uploads/public-listing-submissions/image-${index}.jpg`,
      order: index - 1,
      isPrimary: index === 1,
    })),
    ownerName: 'Jan Kowalski',
    email: 'jan@example.com',
    phone: '500600700',
    contactConsent: true,
    termsConsent: true,
  };
}

function buildSubmissionResponse() {
  return {
    id: 'submission-1',
    status: 'pending_email_verification' as const,
    emailMasked: 'j***@example.com',
    expiresAt: '2026-08-21T12:00:00.000Z',
  };
}
