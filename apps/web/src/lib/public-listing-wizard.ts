import { z } from 'zod';
import {
  buildAgentCollaborationPayload,
  INITIAL_AGENT_COLLABORATION_FORM_VALUE,
  type AgentCollaborationFormValue,
} from './agent-collaboration-form';
import { LEGAL_COPY } from './legal';
import {
  PROPERTY_TYPE_VALUES,
  TRANSACTION_TYPE_VALUES,
  type PropertyType as PropertyTypeValue,
  type TransactionType as TransactionTypeValue,
} from './listings';
import { getListingImageCountError } from './listing-image-rules';
import {
  getPublicListingParameterFields,
  getPublicListingTransactionFields,
  type PublicListingParameterField,
  validatePublicListingParameterFieldValue,
} from './public-listing-form-fields';
import type {
  CreatePublicListingSubmissionInput,
  PublicListingSubmissionImage,
} from './public-listing-submissions';
import { readMigratedStorageValue, STORAGE_KEYS } from './storage-keys';

export interface PublicListingWizardDraft {
  transactionType: TransactionTypeValue | '';
  propertyType: PropertyTypeValue | '';
  title: string;
  price: string;
  city: string;
  district: string;
  street: string;
  postalCode: string;
  voivodeship: string;
  lat: string;
  lng: string;
  showExactAddressOnPublicPage: boolean;
  areaM2: string;
  plotAreaM2: string;
  rooms: string;
  bathrooms: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  rentAdministrativeFee: string;
  deposit: string;
  description: string;
  images: PublicListingSubmissionImage[];
  ownerName: string;
  email: string;
  phone: string;
  agencyName: string;
  contactConsent: boolean;
  termsConsent: boolean;
  marketingConsent: boolean;
  website: string;
  agentCollaboration: AgentCollaborationFormValue;
}

export type PublicListingWizardStep = 0 | 1 | 2 | 3 | 4 | 5;

export type PublicListingWizardValidationResult =
  | { success: true }
  | { success: false; errors: Record<string, string> };

export interface PublicListingSubmissionContext {
  formStartedAt: number;
  sourceUrl?: string;
  referrer?: string;
  entrySource?: string;
  blogPost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

type PublicListingWizardStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export const INITIAL_PUBLIC_LISTING_WIZARD_DRAFT: PublicListingWizardDraft = {
  transactionType: '',
  propertyType: '',
  title: '',
  price: '',
  city: '',
  district: '',
  street: '',
  postalCode: '',
  voivodeship: '',
  lat: '',
  lng: '',
  showExactAddressOnPublicPage: false,
  areaM2: '',
  plotAreaM2: '',
  rooms: '',
  bathrooms: '',
  floor: '',
  totalFloors: '',
  yearBuilt: '',
  rentAdministrativeFee: '',
  deposit: '',
  description: '',
  images: [],
  ownerName: '',
  email: '',
  phone: '',
  agencyName: '',
  contactConsent: false,
  termsConsent: false,
  marketingConsent: false,
  website: '',
  agentCollaboration: INITIAL_AGENT_COLLABORATION_FORM_VALUE,
};

export function readStoredPublicListingWizardDraft(
  storage: PublicListingWizardStorage,
  options: { cityFromUrl?: string } = {},
): PublicListingWizardDraft {
  const stored = readMigratedStorageValue(
    storage,
    STORAGE_KEYS.publicListingWizard,
    STORAGE_KEYS.legacyPublicListingWizard,
  );
  let nextDraft = INITIAL_PUBLIC_LISTING_WIZARD_DRAFT;

  if (stored) {
    try {
      nextDraft = {
        ...INITIAL_PUBLIC_LISTING_WIZARD_DRAFT,
        ...JSON.parse(stored),
      };
    } catch {
      clearStoredPublicListingWizardDraft(storage);
    }
  }

  if (!nextDraft.city && options.cityFromUrl) {
    nextDraft = { ...nextDraft, city: options.cityFromUrl };
  }

  return nextDraft;
}

export function writeStoredPublicListingWizardDraft(
  storage: PublicListingWizardStorage,
  draft: PublicListingWizardDraft,
): void {
  storage.setItem(STORAGE_KEYS.publicListingWizard, JSON.stringify(draft));
}

export function clearStoredPublicListingWizardDraft(
  storage: PublicListingWizardStorage,
): void {
  storage.removeItem(STORAGE_KEYS.publicListingWizard);
  storage.removeItem(STORAGE_KEYS.legacyPublicListingWizard);
}

export function buildPublicListingSubmissionPayload(
  draft: PublicListingWizardDraft,
  context: PublicListingSubmissionContext,
): CreatePublicListingSubmissionInput {
  if (!draft.propertyType || !draft.transactionType) {
    throw new Error('Typ nieruchomości i transakcji są wymagane');
  }

  const visibleParameterFields = new Set(
    getPublicListingParameterFields(draft.propertyType).map(
      (field) => field.key,
    ),
  );
  const visibleTransactionFields = new Set(
    getPublicListingTransactionFields(draft.transactionType).map(
      (field) => field.key,
    ),
  );
  const optionalVisibleNumber = (field: PublicListingParameterField) =>
    visibleParameterFields.has(field)
      ? optionalNumber(draft[field])
      : undefined;

  return {
    listing: {
      title: draft.title.trim(),
      description: optionalString(draft.description),
      propertyType: draft.propertyType,
      transactionType: draft.transactionType,
      price: Number(draft.price),
      currency: 'PLN',
      areaM2: optionalVisibleNumber('areaM2'),
      plotAreaM2: optionalVisibleNumber('plotAreaM2'),
      rooms: optionalVisibleNumber('rooms'),
      bathrooms: optionalVisibleNumber('bathrooms'),
      floor: optionalVisibleNumber('floor'),
      totalFloors: optionalVisibleNumber('totalFloors'),
      yearBuilt: optionalVisibleNumber('yearBuilt'),
    },
    address: {
      city: draft.city.trim(),
      street: optionalString(draft.street),
      postalCode: optionalString(draft.postalCode),
      district: optionalString(draft.district),
      voivodeship: optionalString(draft.voivodeship),
      lat: optionalNumber(draft.lat),
      lng: optionalNumber(draft.lng),
    },
    publicSettings: {
      publicTitle: draft.title.trim(),
      publicDescription: optionalString(draft.description),
      showExactAddressOnPublicPage: draft.showExactAddressOnPublicPage,
    },
    images: draft.images.map((image, index) => ({
      url: image.url,
      altText: image.altText || draft.title.trim(),
      order: index,
      isPrimary: image.isPrimary || index === 0,
    })),
    agentCollaboration: buildAgentCollaborationPayload(
      draft.agentCollaboration,
    ),
    ownerName: draft.ownerName.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    agencyName: optionalString(draft.agencyName),
    contactConsent: draft.contactConsent,
    termsConsent: draft.termsConsent,
    marketingConsent: draft.marketingConsent,
    consentText: [
      LEGAL_COPY.publicListingContactConsent,
      LEGAL_COPY.publicationConsent,
      LEGAL_COPY.responsePurpose,
    ].join(' '),
    source: 'public_wizard',
    sourceUrl: context.sourceUrl,
    referrer: context.referrer,
    utmSource: context.utmSource,
    utmMedium: context.utmMedium,
    utmCampaign: context.utmCampaign,
    website: draft.website,
    formStartedAt: context.formStartedAt,
    metadata: {
      uiVersion: 'public-listing-wizard-v1',
      imageCount: draft.images.length,
      entrySource: context.entrySource,
      blogPost: context.blogPost,
      rentAdministrativeFee: visibleTransactionFields.has(
        'rentAdministrativeFee',
      )
        ? optionalNumber(draft.rentAdministrativeFee)
        : undefined,
      deposit: visibleTransactionFields.has('deposit')
        ? optionalNumber(draft.deposit)
        : undefined,
    },
  };
}

export function validatePublicListingWizardStep(
  step: PublicListingWizardStep,
  draft: PublicListingWizardDraft,
): PublicListingWizardValidationResult {
  const errors: Record<string, string> = {};

  if (step === 0) {
    const result = z
      .object({
        transactionType: z.enum(TRANSACTION_TYPE_VALUES),
        propertyType: z.enum(PROPERTY_TYPE_VALUES),
      })
      .safeParse(draft);

    if (!result.success) {
      return { success: false, errors: mapZodErrors(result.error) };
    }
  }

  if (step === 1) {
    const result = z
      .object({
        title: z.string().trim().min(10).max(120),
        price: z.coerce.number().min(1),
        city: z.string().trim().min(1),
      })
      .safeParse(draft);

    if (!result.success) {
      return { success: false, errors: mapZodErrors(result.error) };
    }
  }

  if (step === 2) {
    for (const field of getPublicListingParameterFields(draft.propertyType)) {
      const fieldError = validatePublicListingParameterFieldValue(
        draft.propertyType,
        field,
        draft[field.key],
      );
      if (fieldError) {
        errors[field.key] = fieldError;
      }
    }

    for (const field of getPublicListingTransactionFields(
      draft.transactionType,
    )) {
      if (draft[field.key] && !nonNegativeNumber(draft[field.key])) {
        errors[field.key] =
          `${field.label} musi być liczbą większą lub równą 0`;
      }
    }

    const description = draft.description.trim();
    if (!description) {
      errors.description = 'Opis jest wymagany';
    } else if (description.length > 3000) {
      errors.description = 'Opis może mieć maksymalnie 3000 znaków';
    }
  }

  if (step === 3 || step === 5) {
    const imageError = getListingImageCountError(draft.images.length);
    if (imageError) {
      errors.images = imageError;
    }
  }

  if (step === 4 || step === 5) {
    const result = z
      .object({
        ownerName: z.string().trim().min(1),
        email: z.string().trim().email(),
        phone: z.string().trim().min(6).max(30),
        contactConsent: z.literal(true),
        termsConsent: z.literal(true),
      })
      .safeParse(draft);

    if (!result.success) {
      Object.assign(errors, mapZodErrors(result.error));
    }
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : { success: true };
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function mapZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]);
    errors[field] = getValidationMessage(field, issue.message);
  }
  return errors;
}

function getValidationMessage(field: string, fallback: string): string {
  const messages: Record<string, string> = {
    transactionType: 'Wybierz typ transakcji',
    propertyType: 'Wybierz typ nieruchomości',
    title: 'Tytuł powinien mieć 10-120 znaków',
    price: 'Cena musi być większa od zera',
    city: 'Miasto jest wymagane',
    ownerName: 'Imię i nazwisko są wymagane',
    email: 'Podaj poprawny email',
    phone: 'Telefon powinien mieć co najmniej 6 znaków',
    contactConsent: 'Zgoda na kontakt jest wymagana',
    termsConsent: 'Akceptacja regulaminu jest wymagana',
  };
  return messages[field] ?? fallback;
}

function nonNegativeNumber(value: string): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0;
}
