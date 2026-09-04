import {
  PropertyType,
  type PropertyType as PropertyTypeValue,
} from './listing-field-rules';
import { TransactionType } from './listings';
import type { AuthUser } from './auth';
import {
  applyAuthenticatedPublicListingContactDefaults,
  buildPublicListingSubmissionPayload,
  clearStoredPublicListingWizardDraft,
  INITIAL_PUBLIC_LISTING_WIZARD_DRAFT,
  readStoredPublicListingWizardDraft,
  type PublicListingWizardDraft,
  validatePublicListingWizardStep,
  writeStoredPublicListingWizardDraft,
} from './public-listing-wizard';
import { STORAGE_KEYS } from './storage-keys';

const requiredFieldsByType: Record<
  PropertyTypeValue,
  Partial<PublicListingWizardDraft>
> = {
  apartment: { areaM2: '55', rooms: '3' },
  house: { areaM2: '140', plotAreaM2: '850', rooms: '5' },
  land: { plotAreaM2: '1200' },
  commercial: { areaM2: '90' },
  office: { areaM2: '75' },
  garage: { areaM2: '18' },
};

describe('public listing wizard payload regression', () => {
  it.each(Object.values(PropertyType))(
    'builds a serializable submission for %s',
    (propertyType) => {
      const payload = serialize(
        buildPublicListingSubmissionPayload(buildDraft(propertyType), {
          formStartedAt: 1_700_000_000_000,
        }),
      );

      expect(payload.listing).toMatchObject({
        propertyType,
        transactionType: TransactionType.SALE,
        ...numericFields(requiredFieldsByType[propertyType]),
      });
      expect(payload.images).toHaveLength(3);
    },
  );

  it.each([TransactionType.SALE, TransactionType.RENT])(
    'builds an apartment payload for %s',
    (transactionType) => {
      const payload = serialize(
        buildPublicListingSubmissionPayload(
          buildDraft(PropertyType.APARTMENT, { transactionType }),
          { formStartedAt: 1_700_000_000_000 },
        ),
      );

      expect(payload.listing).toMatchObject({
        propertyType: PropertyType.APARTMENT,
        transactionType,
        areaM2: 55,
        rooms: 3,
      });
    },
  );

  it('removes fields hidden for land and sale from the serialized payload', () => {
    const payload = serialize(
      buildPublicListingSubmissionPayload(
        buildDraft(PropertyType.LAND, {
          areaM2: '99',
          rooms: '4',
          bathrooms: '2',
          floor: '3',
          totalFloors: '5',
          yearBuilt: '2020',
          rentAdministrativeFee: '700',
          deposit: '3000',
        }),
        { formStartedAt: 1_700_000_000_000 },
      ),
    );

    expect(payload.listing).toEqual(
      expect.objectContaining({
        propertyType: PropertyType.LAND,
        plotAreaM2: 1200,
      }),
    );
    expect(payload.listing).not.toHaveProperty('areaM2');
    expect(payload.listing).not.toHaveProperty('rooms');
    expect(payload.listing).not.toHaveProperty('bathrooms');
    expect(payload.listing).not.toHaveProperty('floor');
    expect(payload.listing).not.toHaveProperty('totalFloors');
    expect(payload.listing).not.toHaveProperty('yearBuilt');
    expect(payload.metadata).not.toHaveProperty('rentAdministrativeFee');
    expect(payload.metadata).not.toHaveProperty('deposit');
  });

  it('includes rent-only metadata and normalizes image order', () => {
    const payload = serialize(
      buildPublicListingSubmissionPayload(
        buildDraft(PropertyType.APARTMENT, {
          transactionType: TransactionType.RENT,
          rentAdministrativeFee: '850',
          deposit: '4000',
          images: buildImages().map((image) => ({
            ...image,
            order: 99,
            isPrimary: false,
          })),
        }),
        { formStartedAt: 1_700_000_000_000 },
      ),
    );

    expect(payload.metadata).toMatchObject({
      rentAdministrativeFee: 850,
      deposit: 4000,
      imageCount: 3,
    });
    expect(payload.images.map((image) => image.order)).toEqual([0, 1, 2]);
    expect(payload.images.map((image) => image.isPrimary)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it('rejects building a payload before the intent is selected', () => {
    expect(() =>
      buildPublicListingSubmissionPayload(
        { ...INITIAL_PUBLIC_LISTING_WIZARD_DRAFT },
        { formStartedAt: 1_700_000_000_000 },
      ),
    ).toThrow('Typ nieruchomości i transakcji są wymagane');
  });
});

describe('public listing wizard validation regression', () => {
  it.each(Object.values(PropertyType))(
    'accepts required parameters for %s',
    (propertyType) => {
      expect(
        validatePublicListingWizardStep(2, buildDraft(propertyType)),
      ).toEqual({ success: true });
    },
  );

  it('rejects a house without plotAreaM2', () => {
    const result = validatePublicListingWizardStep(
      2,
      buildDraft(PropertyType.HOUSE, { plotAreaM2: '' }),
    );

    expect(result).toEqual({
      success: false,
      errors: expect.objectContaining({
        plotAreaM2: 'Powierzchnia działki (m²) jest wymagana',
      }),
    });
  });

  it('rejects fewer than three images and accepts three', () => {
    const draft = buildDraft(PropertyType.APARTMENT);

    expect(
      validatePublicListingWizardStep(3, {
        ...draft,
        images: draft.images.slice(0, 2),
      }),
    ).toEqual({
      success: false,
      errors: { images: 'Dodaj co najmniej 3 zdjęcia' },
    });
    expect(validatePublicListingWizardStep(3, draft)).toEqual({
      success: true,
    });
  });
});

describe('public listing wizard storage regression', () => {
  it('saves and reads the public wizard draft from current localStorage key', () => {
    const storage = new MemoryStorage();
    const draft = buildDraft(PropertyType.APARTMENT, {
      title: 'Zapamietany draft publicznego formularza',
      city: 'Krakow',
    });

    writeStoredPublicListingWizardDraft(storage, draft);

    expect(readStoredPublicListingWizardDraft(storage)).toMatchObject({
      title: 'Zapamietany draft publicznego formularza',
      city: 'Krakow',
      propertyType: PropertyType.APARTMENT,
      transactionType: TransactionType.SALE,
      images: expect.arrayContaining([
        expect.objectContaining({ url: expect.stringContaining('image-1') }),
      ]),
    });
  });

  it('migrates the legacy storage key without losing the draft', () => {
    const storage = new MemoryStorage();
    const draft = buildDraft(PropertyType.HOUSE, { city: 'Gdansk' });
    storage.setItem(
      STORAGE_KEYS.legacyPublicListingWizard,
      JSON.stringify(draft),
    );

    const restored = readStoredPublicListingWizardDraft(storage);

    expect(restored).toMatchObject({
      city: 'Gdansk',
      propertyType: PropertyType.HOUSE,
    });
    expect(storage.getItem(STORAGE_KEYS.publicListingWizard)).toEqual(
      JSON.stringify(draft),
    );
  });

  it('uses city from URL only when the stored draft has no city', () => {
    const emptyStorage = new MemoryStorage();

    expect(
      readStoredPublicListingWizardDraft(emptyStorage, {
        cityFromUrl: 'Wroclaw',
      }),
    ).toMatchObject({ city: 'Wroclaw' });

    const storageWithCity = new MemoryStorage();
    writeStoredPublicListingWizardDraft(
      storageWithCity,
      buildDraft(PropertyType.APARTMENT, { city: 'Poznan' }),
    );

    expect(
      readStoredPublicListingWizardDraft(storageWithCity, {
        cityFromUrl: 'Wroclaw',
      }),
    ).toMatchObject({ city: 'Poznan' });
  });

  it('clears invalid and submitted drafts from both current and legacy keys', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.publicListingWizard, '{invalid');
    storage.setItem(STORAGE_KEYS.legacyPublicListingWizard, '{invalid');

    expect(readStoredPublicListingWizardDraft(storage)).toEqual(
      INITIAL_PUBLIC_LISTING_WIZARD_DRAFT,
    );
    expect(storage.getItem(STORAGE_KEYS.publicListingWizard)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.legacyPublicListingWizard)).toBeNull();

    writeStoredPublicListingWizardDraft(
      storage,
      buildDraft(PropertyType.GARAGE),
    );
    storage.setItem(STORAGE_KEYS.legacyPublicListingWizard, '{}');

    clearStoredPublicListingWizardDraft(storage);

    expect(storage.getItem(STORAGE_KEYS.publicListingWizard)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.legacyPublicListingWizard)).toBeNull();
  });
});

describe('public listing wizard authenticated contact defaults', () => {
  it('replaces stored contact fields with the current private seller account', () => {
    const storedDraft = buildDraft(PropertyType.APARTMENT, {
      ownerName: 'Poprzedni Uzytkownik',
      email: 'previous@example.com',
      phone: '600100200',
      agencyName: 'Stara Agencja',
    });

    const next = applyAuthenticatedPublicListingContactDefaults(
      storedDraft,
      {
        id: 'seller-2',
        email: 'current@example.com',
        role: 'viewer',
        agent: {
          firstName: 'Anna',
          lastName: 'Nowak',
        },
        agency: null,
      } as AuthUser,
    );

    expect(next).toMatchObject({
      title: storedDraft.title,
      city: storedDraft.city,
      ownerName: 'Anna Nowak',
      email: 'current@example.com',
      phone: '',
      agencyName: '',
    });
  });

  it('keeps a draft phone for the same account when the profile has no phone', () => {
    const storedDraft = buildDraft(PropertyType.APARTMENT, {
      ownerName: 'Anna Nowak',
      email: 'current@example.com',
      phone: '700800900',
    });

    const next = applyAuthenticatedPublicListingContactDefaults(
      storedDraft,
      {
        id: 'seller-2',
        email: 'current@example.com',
        role: 'viewer',
        agent: {
          firstName: 'Anna',
          lastName: 'Nowak',
        },
        agency: null,
      } as AuthUser,
    );

    expect(next.phone).toBe('700800900');
  });
});

function buildDraft(
  propertyType: PropertyTypeValue,
  overrides: Partial<PublicListingWizardDraft> = {},
): PublicListingWizardDraft {
  return {
    ...INITIAL_PUBLIC_LISTING_WIZARD_DRAFT,
    transactionType: TransactionType.SALE,
    propertyType,
    title: 'Przykładowa oferta nieruchomości',
    price: '500000',
    city: 'Warszawa',
    description: 'Kompletny opis przykładowej nieruchomości.',
    images: buildImages(),
    ownerName: 'Jan Kowalski',
    email: 'jan@example.com',
    phone: '500600700',
    contactConsent: true,
    termsConsent: true,
    ...requiredFieldsByType[propertyType],
    ...overrides,
  };
}

function buildImages() {
  return [1, 2, 3].map((index) => ({
    url: `/uploads/public-listing-submissions/image-${index}.jpg`,
    altText: null,
    order: index - 1,
    isPrimary: index === 1,
  }));
}

function numericFields(
  fields: Partial<PublicListingWizardDraft>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, Number(value)]),
  );
}

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}
