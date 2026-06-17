'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Home,
  ImagePlus,
  Loader2,
  Mail,
  Star,
  Trash2,
} from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CityAutocomplete } from '@/components/locations/city-autocomplete';
import { DistrictAutocomplete } from '@/components/locations/district-autocomplete';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { isPrivateSellerUser, type AuthUser } from '@/lib/auth';
import {
  PROPERTY_TYPE_LABELS,
  PropertyType,
  TRANSACTION_TYPE_LABELS,
  TransactionType,
  type PropertyType as PropertyTypeValue,
  type TransactionType as TransactionTypeValue,
} from '@/lib/listings';
import { LEGAL_COPY, LEGAL_LINKS } from '@/lib/legal';
import {
  createPublicListingSubmission,
  createSellerPublicListingSubmission,
  uploadPublicListingSubmissionImages,
  type PublicListingSubmissionImage,
} from '@/lib/public-listing-submissions';
import {
  getPublicListingParameterFields,
  getPublicListingPriceLabel,
  getPublicListingTransactionFields,
  isPublicListingParameterFieldRequired,
  type PublicListingParameterField,
  type PublicListingTransactionField,
} from '@/lib/public-listing-form-fields';
import { cn } from '@/lib/utils';

type WizardStep = 0 | 1 | 2 | 3 | 4;

interface PublicListingWizardDraft {
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
}

const STORAGE_KEY = 'estateflow.publicListingWizard.v1';
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 15;

const INITIAL_DRAFT: PublicListingWizardDraft = {
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
};

const STEPS = [
  'Podstawy',
  'Parametry',
  'Zdjęcia',
  'Kontakt',
  'Podsumowanie',
] as const;

const SUBMISSION_PROCESS = [
  'Uzupełnij dane',
  'Potwierdź email',
  'Poczekaj na weryfikację',
  'Pokaż ofertę w katalogu',
] as const;

export default function PublicListingSubmissionWizardPage() {
  const router = useRouter();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const shouldRedirectAuthenticatedAgent = user
    ? !isPrivateSellerUser(user)
    : false;
  const formStartedAt = React.useRef(Date.now());
  const appliedContactDefaultsForUserRef = React.useRef<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [draft, setDraft] =
    React.useState<PublicListingWizardDraft>(INITIAL_DRAFT);
  const [step, setStep] = React.useState<WizardStep>(0);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isUploadingImages, setIsUploadingImages] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const cityFromUrl = getCityFromCurrentUrl();
    let nextDraft = INITIAL_DRAFT;

    if (stored) {
      try {
        nextDraft = { ...INITIAL_DRAFT, ...JSON.parse(stored) };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    if (!nextDraft.city && cityFromUrl) {
      nextDraft = { ...nextDraft, city: cityFromUrl };
    }

    setDraft(nextDraft);
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (shouldRedirectAuthenticatedAgent) {
      router.replace('/dashboard/listings/new');
    }
  }, [router, shouldRedirectAuthenticatedAgent]);

  React.useEffect(() => {
    if (!isHydrated || !user) return;
    if (appliedContactDefaultsForUserRef.current === user.id) return;

    appliedContactDefaultsForUserRef.current = user.id;

    setDraft((current) => {
      const next = applyAuthenticatedContactDefaults(current, user);
      if (next === current) {
        return current;
      }

      setFieldErrors((errors) =>
        clearErrorsForFilledContactDefaults(errors, current, next),
      );

      return next;
    });
  }, [isHydrated, user]);

  React.useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, isHydrated]);

  if (isAuthLoading || shouldRedirectAuthenticatedAgent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  function updateDraft<K extends keyof PublicListingWizardDraft>(
    key: K,
    value: PublicListingWizardDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function goNext() {
    const validation = validateStep(step, draft);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setStep((current) => Math.min(current + 1, 4) as WizardStep);
  }

  function goBack() {
    setFieldErrors({});
    setStep((current) => Math.max(current - 1, 0) as WizardStep);
  }

  async function handleImagesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - draft.images.length;
    const validFiles = files.filter(validateImageFile).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      showErrorToast({
        title: 'Limit zdjęć',
        description: `Możesz dodać maksymalnie ${MAX_IMAGES} zdjęć do jednej oferty.`,
      });
    }

    if (validFiles.length === 0) return;

    try {
      setIsUploadingImages(true);
      const result = await uploadPublicListingSubmissionImages(validFiles);
      const nextImages = [
        ...draft.images,
        ...result.images.map((image, index) => ({
          ...image,
          altText: draft.title || null,
          order: draft.images.length + index,
          isPrimary: draft.images.length === 0 && index === 0,
        })),
      ].slice(0, MAX_IMAGES);

      updateDraft('images', normalizeSubmissionImages(nextImages));
      showSuccessToast({
        title: 'Zdjęcia dodane',
        description: 'Dodaliśmy zdjęcia do publicznego zgłoszenia.',
      });
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się dodać zdjęć',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleSubmit() {
    const validation = validateStep(4, draft);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }

    const urlSearchParams = new URLSearchParams(window.location.search);
    const payload = buildSubmissionPayload(draft, {
      formStartedAt: formStartedAt.current,
      sourceUrl: window.location.href,
      referrer: document.referrer || undefined,
      entrySource: urlSearchParams.get('source') ?? undefined,
      blogPost: urlSearchParams.get('blogPost') ?? undefined,
      utmSource: urlSearchParams.get('utm_source') ?? undefined,
      utmMedium: urlSearchParams.get('utm_medium') ?? undefined,
      utmCampaign: urlSearchParams.get('utm_campaign') ?? undefined,
    });

    try {
      setIsSubmitting(true);
      const submit =
        user && isPrivateSellerUser(user)
          ? createSellerPublicListingSubmission
          : createPublicListingSubmission;
      const result = await submit(payload);
      localStorage.removeItem(STORAGE_KEY);
      const nextParams = new URLSearchParams({
        email: result.emailMasked,
        expiresAt: result.expiresAt,
      });

      if (user && isPrivateSellerUser(user)) {
        nextParams.set('account', 'private_seller');
      }

      router.push(`/dodaj-oferte/sprawdz-email?${nextParams.toString()}`);
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się wysłać oferty',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function validateImageFile(file: File): boolean {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      showErrorToast({
        title: 'Nieobsługiwany format',
        description: `${file.name}: dozwolone są JPG, PNG i WebP.`,
      });
      return false;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      showErrorToast({
        title: 'Plik jest za duży',
        description: `${file.name}: maksymalny rozmiar to 10 MB.`,
      });
      return false;
    }

    return true;
  }

  return (
    <main className="min-h-screen bg-muted text-foreground">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          EstateFlow
        </Link>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <Badge variant="brand">Publiczne dodanie oferty</Badge>
                <h1 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">
                  Dodaj ogłoszenie nieruchomości
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Wypełnij krótki formularz, potwierdź email i poczekaj na
                  weryfikację. Po akceptacji oferta może pojawić się w
                  publicznym katalogu i na mapie.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Krok {step + 1} z {STEPS.length}
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-4">
              {SUBMISSION_PROCESS.map((label, index) => (
                <div
                  key={label}
                  className="rounded-xl border border-border bg-muted/20 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-primary">
                    {index + 1}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-5">
              {STEPS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (index <= step) setStep(index as WizardStep);
                  }}
                  className={cn(
                    'h-2 rounded-full bg-muted transition-colors',
                    index <= step ? 'bg-primary' : '',
                  )}
                  aria-label={label}
                />
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {step === 0 ? (
              <StepBasics
                draft={draft}
                errors={fieldErrors}
                updateDraft={updateDraft}
              />
            ) : null}
            {step === 1 ? (
              <StepParameters
                draft={draft}
                errors={fieldErrors}
                updateDraft={updateDraft}
              />
            ) : null}
            {step === 2 ? (
              <StepImages
                draft={draft}
                isUploading={isUploadingImages}
                fileInputRef={fileInputRef}
                onFilesSelected={handleImagesSelected}
                updateDraft={updateDraft}
              />
            ) : null}
            {step === 3 ? (
              <StepContact
                draft={draft}
                errors={fieldErrors}
                updateDraft={updateDraft}
              />
            ) : null}
            {step === 4 ? <StepSummary draft={draft} /> : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 0 || isSubmitting}
              className="h-10 rounded-xl"
            >
              Wróć
            </Button>

            {step < 4 ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={isUploadingImages}
                className="h-10 gap-2 rounded-xl"
              >
                Dalej
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-10 gap-2 rounded-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Wyślij do weryfikacji
              </Button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StepBasics({
  draft,
  errors,
  updateDraft,
}: StepProps<
  | 'transactionType'
  | 'propertyType'
  | 'title'
  | 'price'
  | 'city'
  | 'voivodeship'
  | 'lat'
  | 'lng'
>) {
  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Home}
        title="Podstawy"
        description="Zbierzemy tylko dane potrzebne do przygotowania publicznej karty oferty."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Typ transakcji"
          value={draft.transactionType}
          error={errors.transactionType}
          onChange={(value) =>
            updateDraft('transactionType', value as TransactionTypeValue)
          }
          options={Object.entries(TRANSACTION_TYPE_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <SelectField
          label="Typ nieruchomości"
          value={draft.propertyType}
          error={errors.propertyType}
          onChange={(value) =>
            updateDraft('propertyType', value as PropertyTypeValue)
          }
          options={Object.entries(PROPERTY_TYPE_LABELS).map(
            ([value, label]) => ({ value, label }),
          )}
        />
        <TextField
          label="Tytuł"
          value={draft.title}
          error={errors.title}
          placeholder="np. Jasne mieszkanie z balkonem"
          onChange={(value) => updateDraft('title', value)}
          className="sm:col-span-2"
        />
        <TextField
          label={getPublicListingPriceLabel(draft.transactionType)}
          value={draft.price}
          error={errors.price}
          type="number"
          min="1"
          placeholder="np. 650000"
          onChange={(value) => updateDraft('price', value)}
        />
        <FieldShell label="Miasto" error={errors.city}>
          <CityAutocomplete
            value={draft.city}
            error={errors.city}
            placeholder="np. Warszawa"
            onValueChange={(value) => {
              updateDraft('city', value);
              updateDraft('voivodeship', '');
              updateDraft('lat', '');
              updateDraft('lng', '');
            }}
            onLocationSelect={(location) => {
              updateDraft('city', location.name);
              updateDraft('voivodeship', location.voivodeship);
              updateDraft('lat', String(location.lat));
              updateDraft('lng', String(location.lng));
            }}
          />
        </FieldShell>
        <FieldShell label="Dzielnica">
          <DistrictAutocomplete
            city={draft.city}
            value={draft.district}
            placeholder="np. Śródmieście"
            onValueChange={(value) => updateDraft('district', value)}
          />
        </FieldShell>
        <TextField
          label="Ulica"
          value={draft.street}
          placeholder="Nie musisz pokazywać jej publicznie"
          onChange={(value) => updateDraft('street', value)}
        />
      </div>
      <CheckboxField
        checked={draft.showExactAddressOnPublicPage}
        onChange={(checked) =>
          updateDraft('showExactAddressOnPublicPage', checked)
        }
        label="Pokazuj dokładny adres na stronie publicznej"
        description="Domyślnie pokazujemy tylko miasto i dzielnicę."
      />
    </div>
  );
}

function StepParameters({
  draft,
  errors,
  updateDraft,
}: StepProps<
  PublicListingParameterField | PublicListingTransactionField | 'description'
>) {
  const parameterFields = getPublicListingParameterFields(draft.propertyType);
  const transactionFields = getPublicListingTransactionFields(
    draft.transactionType,
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Building2}
        title="Parametry"
        description="Te informacje pomagają kupującym szybko ocenić, czy nieruchomość pasuje do ich potrzeb."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {parameterFields.map((field) => (
          <TextField
            key={field.key}
            label={field.required ? `${field.label} *` : field.label}
            value={draft[field.key]}
            error={errors[field.key]}
            type="number"
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            onChange={(value) => updateDraft(field.key, value)}
          />
        ))}
        {transactionFields.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            value={draft[field.key]}
            error={errors[field.key]}
            type="number"
            min={field.min}
            max={field.max}
            placeholder={field.placeholder}
            onChange={(value) => updateDraft(field.key, value)}
          />
        ))}
        {parameterFields.length === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            Wybierz typ nieruchomości, aby zobaczyć dopasowane pola
            parametryczne.
          </p>
        ) : null}
      </div>
      <TextAreaField
        label="Opis"
        value={draft.description}
        error={errors.description}
        placeholder="Opisz lokalizację, standard, układ i atuty nieruchomości."
        onChange={(value) => updateDraft('description', value)}
      />
    </div>
  );
}

function StepImages({
  draft,
  isUploading,
  fileInputRef,
  onFilesSelected,
  updateDraft,
}: {
  draft: PublicListingWizardDraft;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  updateDraft: <K extends keyof PublicListingWizardDraft>(
    key: K,
    value: PublicListingWizardDraft[K],
  ) => void;
}) {
  function removeImage(index: number) {
    updateDraft(
      'images',
      normalizeSubmissionImages(
        draft.images.filter((_, currentIndex) => currentIndex !== index),
      ),
    );
  }

  function setPrimaryImage(index: number) {
    const target = draft.images[index];
    if (!target) return;

    updateDraft(
      'images',
      normalizeSubmissionImages([
        target,
        ...draft.images.filter((_, currentIndex) => currentIndex !== index),
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={ImagePlus}
        title="Zdjęcia"
        description="Zdjęcia nie są twardo wymagane, ale znacząco zwiększają szansę kontaktu."
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFilesSelected}
      />
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
        <p className="text-sm font-medium text-foreground">
          Dodano {draft.images.length}/{MAX_IMAGES} zdjęć
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          JPG, PNG lub WebP, maksymalnie 10 MB na plik.
        </p>
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || draft.images.length >= MAX_IMAGES}
          className="mt-4 h-10 gap-2 rounded-xl"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {isUploading ? 'Dodawanie...' : 'Wybierz zdjęcia'}
        </Button>
      </div>

      {draft.images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {draft.images.map((image, index) => (
            <article
              key={`${image.url}-${index}`}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-[4/3] bg-muted">
                <img
                  src={image.url}
                  alt={image.altText || draft.title || 'Zdjęcie oferty'}
                  className="h-full w-full object-cover"
                />
                {image.isPrimary || index === 0 ? (
                  <Badge className="absolute left-3 top-3" variant="success">
                    Główne
                  </Badge>
                ) : null}
              </div>
              <div className="grid gap-2 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    Zdjęcie {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    aria-label="Usuń zdjęcie"
                    onClick={() => removeImage(index)}
                    className="rounded-xl"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant={
                    image.isPrimary || index === 0 ? 'secondary' : 'outline'
                  }
                  size="sm"
                  disabled={image.isPrimary || index === 0}
                  onClick={() => setPrimaryImage(index)}
                  className="w-full rounded-xl"
                >
                  <Star className="h-4 w-4" />
                  {image.isPrimary || index === 0
                    ? 'Zdjęcie główne'
                    : 'Ustaw jako główne'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StepContact({
  draft,
  errors,
  updateDraft,
}: StepProps<
  | 'ownerName'
  | 'email'
  | 'phone'
  | 'agencyName'
  | 'contactConsent'
  | 'termsConsent'
  | 'marketingConsent'
  | 'website'
>) {
  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Mail}
        title="Kontakt i zgody"
        description="Na ten adres wyślemy wiadomość potwierdzającą zgłoszenie oferty."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Imię i nazwisko"
          value={draft.ownerName}
          error={errors.ownerName}
          onChange={(value) => updateDraft('ownerName', value)}
        />
        <TextField
          label="Email"
          value={draft.email}
          error={errors.email}
          type="email"
          onChange={(value) => updateDraft('email', value)}
        />
        <TextField
          label="Telefon"
          value={draft.phone}
          error={errors.phone}
          onChange={(value) => updateDraft('phone', value)}
        />
        <TextField
          label="Biuro / agencja (opcjonalnie)"
          value={draft.agencyName}
          onChange={(value) => updateDraft('agencyName', value)}
        />
      </div>
      <div className="hidden">
        <label htmlFor="website">Strona internetowa</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={draft.website}
          onChange={(event) => updateDraft('website', event.target.value)}
        />
      </div>
      <div className="space-y-3">
        <CheckboxField
          checked={draft.contactConsent}
          error={errors.contactConsent}
          onChange={(checked) => updateDraft('contactConsent', checked)}
          label={LEGAL_COPY.publicListingContactConsent}
          description={
            <>
              {LEGAL_COPY.responsePurpose}{' '}
              <LegalLink href={LEGAL_LINKS.privacy}>
                Polityka prywatności
              </LegalLink>
              .
            </>
          }
        />
        <CheckboxField
          checked={draft.termsConsent}
          error={errors.termsConsent}
          onChange={(checked) => updateDraft('termsConsent', checked)}
          label="Akceptuję regulamin i zasady publikacji ofert"
          description={
            <>
              {LEGAL_COPY.publicationConsent}{' '}
              <LegalLink href={LEGAL_LINKS.terms}>Regulamin</LegalLink> ·{' '}
              <LegalLink href={LEGAL_LINKS.publicationRules}>
                Zasady publikacji
              </LegalLink>
              .
            </>
          }
        />
        <CheckboxField
          checked={draft.marketingConsent}
          onChange={(checked) => updateDraft('marketingConsent', checked)}
          label={LEGAL_COPY.marketingConsent}
        />
      </div>
    </div>
  );
}

function StepSummary({ draft }: { draft: PublicListingWizardDraft }) {
  const parameterRows: Array<[string, string]> =
    getPublicListingParameterFields(draft.propertyType).map((field) => [
      field.label.replace(/ \*$/, ''),
      formatNumberFieldSummary(draft[field.key], field.key),
    ]);
  const transactionRows: Array<[string, string]> =
    getPublicListingTransactionFields(draft.transactionType).map((field) => [
      field.label,
      formatMoneyFieldSummary(draft[field.key]),
    ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Check}
        title="Podsumowanie"
        description="Sprawdź dane przed wysłaniem. Po potwierdzeniu emaila oferta trafi do weryfikacji."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="Oferta"
          rows={[
            ['Tytuł', draft.title],
            [
              'Transakcja',
              labelOrEmpty(TRANSACTION_TYPE_LABELS, draft.transactionType),
            ],
            ['Typ', labelOrEmpty(PROPERTY_TYPE_LABELS, draft.propertyType)],
            [
              getPublicListingPriceLabel(draft.transactionType),
              formatMoneyFieldSummary(draft.price),
            ],
            ...transactionRows,
          ]}
        />
        <SummaryCard
          title="Lokalizacja"
          rows={[
            ['Miasto', draft.city],
            ['Dzielnica', draft.district],
            ['Ulica', draft.street],
            [
              'Adres publiczny',
              draft.showExactAddressOnPublicPage ? 'dokładny' : 'ukryty',
            ],
          ]}
        />
        <SummaryCard title="Parametry" rows={parameterRows} />
        <SummaryCard
          title="Kontakt"
          rows={[
            ['Osoba', draft.ownerName],
            ['Email', draft.email],
            ['Telefon', draft.phone],
            ['Zdjęcia', String(draft.images.length)],
          ]}
        />
      </div>
    </div>
  );
}

type StepProps<K extends keyof PublicListingWizardDraft> = {
  draft: PublicListingWizardDraft;
  errors: Partial<Record<K, string>>;
  updateDraft: <Key extends keyof PublicListingWizardDraft>(
    key: Key,
    value: PublicListingWizardDraft[Key],
  ) => void;
};

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Home;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  error,
  onChange,
  className,
  ...props
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<React.ComponentProps<'input'>, 'value' | 'onChange'>) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="h-10 rounded-xl"
        {...props}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function FieldShell({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={5}
        maxLength={3000}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          'w-full min-w-0 resize-y rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm transition-colors outline-none',
          'placeholder:text-muted-foreground',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          error ? 'border-destructive ring-3 ring-destructive/20' : '',
        )}
      />
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  error,
  options,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={cn(
          'h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-sm shadow-sm outline-none transition-colors',
          'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          error ? 'border-destructive ring-3 ring-destructive/20' : '',
        )}
      >
        <option value="">Wybierz</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <FieldError>{error}</FieldError> : null}
    </label>
  );
}

function CheckboxField({
  checked,
  error,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  error?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        'flex gap-3 rounded-xl border border-border bg-card p-3',
        error ? 'border-destructive bg-destructive/5' : '',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
        {error ? <FieldError>{error}</FieldError> : null}
      </span>
    </label>
  );
}

function SummaryCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="max-w-[65%] text-right font-medium text-foreground">
              {value || '—'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>;
}

function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="font-medium text-primary hover:underline">
      {children}
    </Link>
  );
}

function validateStep(
  step: WizardStep,
  draft: PublicListingWizardDraft,
): { success: true } | { success: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (step === 0) {
    const result = z
      .object({
        transactionType: z.enum([TransactionType.SALE, TransactionType.RENT]),
        propertyType: z.enum([
          PropertyType.APARTMENT,
          PropertyType.HOUSE,
          PropertyType.LAND,
          PropertyType.COMMERCIAL,
          PropertyType.OFFICE,
          PropertyType.GARAGE,
        ]),
        title: z.string().trim().min(10).max(120),
        price: z.coerce.number().min(1),
        city: z.string().trim().min(1),
      })
      .safeParse(draft);

    if (!result.success) {
      return { success: false, errors: mapZodErrors(result.error) };
    }
  }

  if (step === 1) {
    for (const field of getPublicListingParameterFields(draft.propertyType)) {
      if (
        isPublicListingParameterFieldRequired(draft.propertyType, field.key) &&
        !positiveNumber(draft[field.key])
      ) {
        errors[field.key] = `${field.label} jest wymagane`;
      }
    }

    const visibleParameterKeys = new Set(
      getPublicListingParameterFields(draft.propertyType).map(
        (field) => field.key,
      ),
    );

    if (visibleParameterKeys.has('yearBuilt') && draft.yearBuilt) {
      const yearBuilt = Number(draft.yearBuilt);
      const maxYear = new Date().getFullYear() + 5;
      if (
        !Number.isFinite(yearBuilt) ||
        yearBuilt < 1800 ||
        yearBuilt > maxYear
      ) {
        errors.yearBuilt = `Rok budowy musi być między 1800 a ${maxYear}`;
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

    if (draft.description.length > 3000) {
      errors.description = 'Opis może mieć maksymalnie 3000 znaków';
    }
  }

  if (step === 3 || step === 4) {
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

function applyAuthenticatedContactDefaults(
  draft: PublicListingWizardDraft,
  user: AuthUser,
): PublicListingWizardDraft {
  const defaults = getAuthenticatedContactDefaults(user);
  let next = draft;

  for (const [key, value] of Object.entries(defaults) as Array<
    [keyof typeof defaults, string]
  >) {
    if (!value || draft[key].trim()) {
      continue;
    }

    next = {
      ...next,
      [key]: value,
    };
  }

  return next;
}

function getAuthenticatedContactDefaults(
  user: AuthUser,
): Pick<
  PublicListingWizardDraft,
  'ownerName' | 'email' | 'phone' | 'agencyName'
> {
  return {
    ownerName: [user.agent?.firstName, user.agent?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim(),
    email: user.email,
    phone: user.agent?.phone?.trim() ?? '',
    agencyName: user.agency?.name?.trim() ?? '',
  };
}

function clearErrorsForFilledContactDefaults(
  errors: Record<string, string>,
  previous: PublicListingWizardDraft,
  next: PublicListingWizardDraft,
): Record<string, string> {
  const updated = { ...errors };

  for (const field of ['ownerName', 'email', 'phone', 'agencyName'] as const) {
    if (!previous[field].trim() && next[field].trim()) {
      delete updated[field];
    }
  }

  return updated;
}

function buildSubmissionPayload(
  draft: PublicListingWizardDraft,
  context: {
    formStartedAt: number;
    sourceUrl?: string;
    referrer?: string;
    entrySource?: string;
    blogPost?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  },
) {
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
      propertyType: draft.propertyType as PropertyTypeValue,
      transactionType: draft.transactionType as TransactionTypeValue,
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
    source: 'public_wizard' as const,
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

function normalizeSubmissionImages(
  images: PublicListingSubmissionImage[],
): PublicListingSubmissionImage[] {
  return images.map((image, index) => ({
    ...image,
    order: index,
    isPrimary: index === 0,
  }));
}

function positiveNumber(value: string): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function nonNegativeNumber(value: string): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0;
}

function optionalNumber(value: string): number | undefined {
  if (!value) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getCityFromCurrentUrl(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const city = new URLSearchParams(window.location.search).get('city')?.trim();

  return city ? city.slice(0, 255) : undefined;
}

function labelOrEmpty<T extends string>(
  labels: Record<T, string>,
  value: T | '',
): string {
  return value ? labels[value] : '';
}

function formatNumberFieldSummary(
  value: string,
  field: PublicListingParameterField,
): string {
  if (!value) {
    return '';
  }

  return field === 'areaM2' || field === 'plotAreaM2' ? `${value} m²` : value;
}

function formatMoneyFieldSummary(value: string): string {
  return value ? `${value} PLN` : '';
}
