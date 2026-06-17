'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  Calculator,
  ImageIcon,
  ImagePlus,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InlineSelect } from '@/components/ui/inline-select';
import { CityAutocomplete } from '@/components/locations/city-autocomplete';
import { DistrictAutocomplete } from '@/components/locations/district-autocomplete';
import { LimitUpgradeBanner } from '@/components/growth/limit-upgrade-banner';
import { useToast } from '@/contexts/toast-context';
import { useListingForm } from '@/hooks/use-listing-form';
import { ListingDescriptionAssistant } from '@/components/listings/listing-description-assistant';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  createListingSchema,
  type CreateListingFormData,
  type Listing,
  LISTING_COMMISSION_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  shouldShowListingField,
  TRANSACTION_TYPE_LABELS,
  ListingCommissionType,
  PropertyType,
  calculateListingCommissionAmount,
  createListing,
  formatPrice,
  updateListing,
  uploadListingImages,
} from '@/lib/listings';
import {
  buildListingDescription,
  evaluateListingQuality,
  getStoredDescriptionAssistantUsage,
  incrementStoredDescriptionAssistantUsage,
  type ListingDescriptionAssistantInput,
} from '@/lib/listing-description-assistant';
import { useAuth } from '@/contexts/auth-context';
import { isUsageExceeded, isUsageWarning } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface ListingFormProps {
  /** Pass existing listing for edit mode, omit for create mode. */
  listing?: Listing;
  /** Uses a shorter first-listing flow for onboarding activation. */
  variant?: 'standard' | 'guided';
}

const ACCEPTED_CREATE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_CREATE_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/** Form for creating or editing a listing. */
export function ListingForm({
  listing,
  variant = 'standard',
}: ListingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { error: showErrorToast, warning: showWarningToast } = useToast();
  const isEdit = !!listing;
  const isGuidedCreate = !isEdit && variant === 'guided';
  const formRef = React.useRef<HTMLFormElement>(null);
  const descriptionRef = React.useRef<HTMLTextAreaElement>(null);
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(
    listing?.propertyType ?? '',
  );
  const [pricePreview, setPricePreview] = useState<number | string>(
    listing?.price ?? '',
  );
  const [commissionType, setCommissionType] = useState<
    ListingCommissionType | ''
  >(listing?.commissionType ?? '');
  const [commissionValue, setCommissionValue] = useState<number | string>(
    listing?.commissionValue ?? '',
  );
  const [city, setCity] = useState(listing?.address?.city ?? '');
  const [district, setDistrict] = useState(listing?.address?.district ?? '');
  const [voivodeship, setVoivodeship] = useState(
    listing?.address?.voivodeship ?? '',
  );
  const [locationPoint, setLocationPoint] = useState<{
    lat: number | string;
    lng: number | string;
  }>({
    lat: listing?.address?.lat ?? '',
    lng: listing?.address?.lng ?? '',
  });
  const [showExactLocationFields, setShowExactLocationFields] = useState(false);
  const [showDetails, setShowDetails] = useState(!isGuidedCreate);
  const [assistantInput, setAssistantInput] =
    useState<ListingDescriptionAssistantInput>(() =>
      getInitialAssistantInput(listing),
    );
  const [assistantUsage, setAssistantUsage] = useState(() =>
    getStoredDescriptionAssistantUsage(),
  );
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const listingsUsage = user?.usage.activeListings ?? 0;
  const listingsLimit = user?.entitlements.limits.activeListings ?? null;
  const imageLimit = user?.entitlements.limits.imagesPerListing ?? null;
  const showUsageWarning =
    !isEdit && isUsageWarning(listingsUsage, listingsLimit);
  const showUsageExceeded =
    !isEdit && isUsageExceeded(listingsUsage, listingsLimit);

  const { handleSubmit, getFieldError, globalError, isLoading } =
    useListingForm({
      schema: createListingSchema,
      onSubmit: async (data: CreateListingFormData) => {
        if (isEdit) {
          await updateListing(listing.id, data);
        } else {
          const created = await createListing(data);
          if (selectedImages.length > 0) {
            try {
              await uploadListingImages(created.id, selectedImages);
            } catch (error) {
              showErrorToast({
                title: 'Oferta zapisana, zdjęć nie dodano',
                description: getApiErrorMessage(error),
              });
              router.push(`/dashboard/listings/${created.id}/edit`);
              router.refresh();
              return;
            }
          }
        }
        router.push('/dashboard/listings');
        router.refresh();
      },
    });

  const qualityReport = React.useMemo(
    () => evaluateListingQuality(assistantInput),
    [assistantInput],
  );

  function syncAssistantInput() {
    setAssistantInput(
      collectAssistantInput(formRef.current, propertyType, listing),
    );
  }

  function handleGenerateDescription() {
    if (assistantUsage.remaining <= 0) return;

    const nextInput = collectAssistantInput(
      formRef.current,
      propertyType,
      listing,
    );
    const generatedDescription = buildListingDescription(nextInput);

    if (descriptionRef.current) {
      descriptionRef.current.value = generatedDescription;
      descriptionRef.current.dispatchEvent(
        new Event('input', { bubbles: true }),
      );
    }

    const nextUsage = incrementStoredDescriptionAssistantUsage();
    setAssistantUsage(nextUsage);
    setAssistantInput({
      ...nextInput,
      description: generatedDescription,
    });
  }

  function handleImageFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) return;

    const validFiles = files.filter((file) =>
      validateSelectedListingImage(file, showErrorToast),
    );

    if (validFiles.length === 0) return;

    setSelectedImages((current) => {
      const availableSlots =
        imageLimit === null ? validFiles.length : imageLimit - current.length;

      if (availableSlots <= 0) {
        showErrorToast({
          title: 'Limit zdjęć',
          description: `Nie możesz dodać więcej niż ${imageLimit} zdjęć do jednej oferty.`,
        });
        return current;
      }

      const accepted = validFiles.slice(0, availableSlots);
      const skipped = validFiles.length - accepted.length;

      if (skipped > 0) {
        showWarningToast({
          title: 'Część zdjęć pominięta',
          description: `Dodano ${accepted.length}, pominięto ${skipped} przez limit planu.`,
        });
      }

      return [...current, ...accepted];
    });
  }

  function removeSelectedImage(indexToRemove: number) {
    setSelectedImages((current) =>
      current.filter((_, index) => index !== indexToRemove),
    );
  }

  function setSelectedImageAsPrimary(indexToPromote: number) {
    setSelectedImages((current) => {
      const target = current[indexToPromote];
      if (!target) return current;

      return [
        target,
        ...current.filter((_, index) => index !== indexToPromote),
      ];
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={syncAssistantInput}
      className="space-y-8"
      noValidate
    >
      {isGuidedCreate ? <GuidedCreateIntro /> : null}

      {!isEdit && (showUsageWarning || showUsageExceeded) ? (
        <LimitUpgradeBanner
          resource="listings"
          usage={listingsUsage}
          limit={listingsLimit}
          exceeded={showUsageExceeded}
          source="listing_form_limit_state"
        />
      ) : null}

      {/* Global error */}
      {globalError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {globalError}
        </div>
      )}

      <FormSection
        title={isGuidedCreate ? 'Najważniejsze dane' : 'Informacje podstawowe'}
        description={
          isGuidedCreate
            ? 'Te pola wystarczą, żeby zapisać pierwszą ofertę i przejść dalej.'
            : undefined
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Tytuł oferty"
            name="title"
            required
            error={getFieldError('title')}
            className="sm:col-span-2"
          >
            <Input
              name="title"
              defaultValue={listing?.title}
              placeholder="np. Przestronne mieszkanie z widokiem na park"
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('title')}
            />
          </FormField>

          <FormField
            label="Typ nieruchomości"
            name="propertyType"
            required
            error={getFieldError('propertyType')}
          >
            <FormSelect
              name="propertyType"
              defaultValue={listing?.propertyType}
              value={propertyType}
              placeholder="Wybierz typ"
              options={Object.entries(PROPERTY_TYPE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
              error={!!getFieldError('propertyType')}
              onChange={(value) => setPropertyType(value as PropertyType | '')}
            />
          </FormField>

          <FormField
            label="Typ transakcji"
            name="transactionType"
            required
            error={getFieldError('transactionType')}
          >
            <FormSelect
              name="transactionType"
              defaultValue={listing?.transactionType}
              placeholder="Wybierz typ"
              options={Object.entries(TRANSACTION_TYPE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
              error={!!getFieldError('transactionType')}
            />
          </FormField>

          <FormField
            label="Cena (PLN)"
            name="price"
            required
            error={getFieldError('price')}
          >
            <Input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={listing ? Number(listing.price) : undefined}
              placeholder="np. 450000"
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('price')}
              onChange={(event) => setPricePreview(event.target.value)}
            />
          </FormField>

          <FormField
            label="Miasto"
            name="address.city"
            required
            error={getFieldError('address.city')}
          >
            <CityAutocomplete
              name="address.city"
              value={city}
              placeholder="np. Warszawa"
              error={getFieldError('address.city') ?? undefined}
              inputClassName="h-10 rounded-xl"
              onValueChange={(value) => {
                setCity(value);
                setLocationPoint({ lat: '', lng: '' });
              }}
              onLocationSelect={(location) => {
                setCity(location.name);
                setVoivodeship(location.voivodeship);
                setLocationPoint({ lat: '', lng: '' });
              }}
            />
          </FormField>

          {isGuidedCreate &&
            shouldShowListingField(propertyType, 'plotAreaM2') && (
              <FormField
                label="Powierzchnia działki (m²)"
                name="plotAreaM2"
                required={
                  propertyType === PropertyType.HOUSE ||
                  propertyType === PropertyType.LAND
                }
                error={getFieldError('plotAreaM2')}
              >
                <Input
                  name="plotAreaM2"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="np. 850"
                  className="h-10 rounded-xl"
                />
              </FormField>
            )}

          {showDetails ? (
            <FormField
              label="Opis"
              name="description"
              error={getFieldError('description')}
              className="sm:col-span-2"
            >
              <textarea
                ref={descriptionRef}
                name="description"
                defaultValue={listing?.description ?? ''}
                rows={isGuidedCreate ? 4 : 5}
                placeholder="Opisz nieruchomość..."
                className={cn(
                  'w-full min-w-0 rounded-xl border border-border/80 bg-card px-3 py-2 text-sm shadow-sm transition-colors outline-none',
                  'placeholder:text-muted-foreground',
                  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                  'resize-y',
                )}
              />
              <ListingDescriptionAssistant
                report={qualityReport}
                usage={assistantUsage}
                onGenerate={handleGenerateDescription}
              />
            </FormField>
          ) : null}
        </div>
      </FormSection>

      <CommissionSection
        currency={listing?.currency ?? 'PLN'}
        price={pricePreview}
        commissionType={commissionType}
        commissionValue={commissionValue}
        commissionTypeError={getFieldError('commissionType')}
        commissionValueError={getFieldError('commissionValue')}
        onCommissionTypeChange={(value) => {
          const nextType = value as ListingCommissionType | '';
          setCommissionType(nextType);
          if (!nextType) {
            setCommissionValue('');
          }
        }}
        onCommissionValueChange={setCommissionValue}
      />

      {!isEdit ? (
        <FormSection
          title="Widoczność publiczna"
          description="Te ustawienia będą użyte po opublikowaniu publicznej strony oferty."
        >
          <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <input type="hidden" name="showPublicViewCount" value="false" />
            <input
              type="checkbox"
              name="showPublicViewCount"
              value="true"
              defaultChecked={false}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Pokaż licznik wyświetleń na stronie oferty
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Odwiedzający zobaczą liczbę odsłon publicznej strony. Po
                utworzeniu oferty możesz zmienić to w panelu publikacji.
              </span>
            </span>
          </label>
        </FormSection>
      ) : null}

      {!isEdit ? (
        <CreateListingImagesSection
          files={selectedImages}
          imageLimit={imageLimit}
          onFilesSelected={handleImageFilesSelected}
          onRemove={removeSelectedImage}
          onSetPrimary={setSelectedImageAsPrimary}
        />
      ) : null}

      {isGuidedCreate ? (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Masz więcej danych pod ręką?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dodaj parametry, ulicę i szczegóły lokalizacji teraz albo
              uzupełnij je później w edycji oferty.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDetails((value) => !value)}
            className="gap-2 rounded-xl sm:self-start"
          >
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {showDetails ? 'Ukryj szczegóły' : 'Dodaj szczegóły'}
          </Button>
        </div>
      ) : null}

      {showDetails ? (
        <>
          {/* === Section: Price & Details === */}
          <FormSection title="Parametry nieruchomości">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shouldShowListingField(propertyType, 'areaM2') && (
                <FormField
                  label={
                    propertyType === PropertyType.HOUSE
                      ? 'Powierzchnia domu (m²)'
                      : 'Powierzchnia (m²)'
                  }
                  name="areaM2"
                  error={getFieldError('areaM2')}
                >
                  <Input
                    name="areaM2"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={
                      listing?.areaM2 ? Number(listing.areaM2) : undefined
                    }
                    placeholder="np. 65"
                    className="h-10 rounded-xl"
                  />
                </FormField>
              )}

              {!isGuidedCreate &&
                shouldShowListingField(propertyType, 'plotAreaM2') && (
                  <FormField
                    label="Powierzchnia działki (m²)"
                    name="plotAreaM2"
                    required={
                      propertyType === PropertyType.HOUSE ||
                      propertyType === PropertyType.LAND
                    }
                    error={getFieldError('plotAreaM2')}
                  >
                    <Input
                      name="plotAreaM2"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={
                        listing?.plotAreaM2
                          ? Number(listing.plotAreaM2)
                          : undefined
                      }
                      placeholder="np. 850"
                      className="h-10 rounded-xl"
                    />
                  </FormField>
                )}

              {shouldShowListingField(propertyType, 'rooms') && (
                <FormField
                  label="Pokoje"
                  name="rooms"
                  error={getFieldError('rooms')}
                >
                  <Input
                    name="rooms"
                    type="number"
                    min="1"
                    max="99"
                    defaultValue={listing?.rooms ?? undefined}
                    placeholder="np. 3"
                    className="h-10 rounded-xl"
                  />
                </FormField>
              )}

              {shouldShowListingField(propertyType, 'bathrooms') && (
                <FormField
                  label="Łazienki"
                  name="bathrooms"
                  error={getFieldError('bathrooms')}
                >
                  <Input
                    name="bathrooms"
                    type="number"
                    min="0"
                    max="20"
                    defaultValue={listing?.bathrooms ?? undefined}
                    placeholder="np. 1"
                    className="h-10 rounded-xl"
                  />
                </FormField>
              )}

              {shouldShowListingField(propertyType, 'floor') && (
                <FormField
                  label="Piętro"
                  name="floor"
                  error={getFieldError('floor')}
                >
                  <Input
                    name="floor"
                    type="number"
                    defaultValue={listing?.floor ?? undefined}
                    placeholder="np. 3"
                    className="h-10 rounded-xl"
                  />
                </FormField>
              )}

              {shouldShowListingField(propertyType, 'totalFloors') && (
                <FormField
                  label="Liczba pięter"
                  name="totalFloors"
                  error={getFieldError('totalFloors')}
                >
                  <Input
                    name="totalFloors"
                    type="number"
                    defaultValue={listing?.totalFloors ?? undefined}
                    placeholder="np. 10"
                    className="h-10 rounded-xl"
                  />
                </FormField>
              )}

              {shouldShowListingField(propertyType, 'yearBuilt') && (
                <FormField
                  label="Rok budowy"
                  name="yearBuilt"
                  error={getFieldError('yearBuilt')}
                >
                  <Input
                    name="yearBuilt"
                    type="number"
                    min="1800"
                    defaultValue={listing?.yearBuilt ?? undefined}
                    placeholder="np. 2020"
                    className="h-10 rounded-xl"
                  />
                </FormField>
              )}

              {!propertyType && (
                <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                  Wybierz typ nieruchomości, aby zobaczyć dopasowane pola
                  parametryczne.
                </p>
              )}
            </div>
          </FormSection>

          {/* === Section: Address === */}
          <FormSection title="Adres i lokalizacja">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                label="Ulica"
                name="address.street"
                error={getFieldError('address.street')}
              >
                <Input
                  name="address.street"
                  defaultValue={listing?.address?.street ?? ''}
                  placeholder="np. ul. Marszałkowska 10"
                  className="h-10 rounded-xl"
                />
              </FormField>

              <FormField
                label="Kod pocztowy"
                name="address.postalCode"
                error={getFieldError('address.postalCode')}
              >
                <Input
                  name="address.postalCode"
                  defaultValue={listing?.address?.postalCode ?? ''}
                  placeholder="np. 00-001"
                  className="h-10 rounded-xl"
                />
              </FormField>

              <FormField
                label="Dzielnica"
                name="address.district"
                error={getFieldError('address.district')}
              >
                <DistrictAutocomplete
                  city={city}
                  name="address.district"
                  value={district}
                  error={getFieldError('address.district') ?? undefined}
                  placeholder="np. Śródmieście"
                  inputClassName="h-10 rounded-xl"
                  onValueChange={setDistrict}
                />
              </FormField>

              <FormField
                label="Województwo"
                name="address.voivodeship"
                error={getFieldError('address.voivodeship')}
              >
                <Input
                  name="address.voivodeship"
                  value={voivodeship}
                  onChange={(event) => setVoivodeship(event.target.value)}
                  placeholder="np. mazowieckie"
                  className="h-10 rounded-xl"
                />
              </FormField>
            </div>

            <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={showExactLocationFields}
                  onChange={(event) =>
                    setShowExactLocationFields(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-border text-primary"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    Chcę ustawić dokładny punkt mapy
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    Sam wybór miasta lub dzielnicy oznacza lokalizację
                    przybliżoną. Publiczne pokazanie dokładnego punktu wymaga
                    też włączenia dokładnego adresu w ustawieniach publikacji.
                  </span>
                </span>
              </label>

              {showExactLocationFields ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="Szerokość geograficzna"
                    name="address.lat"
                    error={getFieldError('address.lat')}
                  >
                    <Input
                      name="address.lat"
                      type="number"
                      step="0.000001"
                      min="-90"
                      max="90"
                      value={locationPoint.lat}
                      onChange={(event) =>
                        setLocationPoint((current) => ({
                          ...current,
                          lat: event.target.value,
                        }))
                      }
                      placeholder="np. 53.123456"
                      className="h-10 rounded-xl"
                    />
                  </FormField>

                  <FormField
                    label="Długość geograficzna"
                    name="address.lng"
                    error={getFieldError('address.lng')}
                  >
                    <Input
                      name="address.lng"
                      type="number"
                      step="0.000001"
                      min="-180"
                      max="180"
                      value={locationPoint.lng}
                      onChange={(event) =>
                        setLocationPoint((current) => ({
                          ...current,
                          lng: event.target.value,
                        }))
                      }
                      placeholder="np. 18.012345"
                      className="h-10 rounded-xl"
                    />
                  </FormField>
                </div>
              ) : null}
            </div>
          </FormSection>
        </>
      ) : null}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.back()}
          className="rounded-xl"
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="rounded-xl"
        >
          {isLoading
            ? 'Zapisywanie...'
            : isEdit
              ? 'Zapisz zmiany'
              : isGuidedCreate
                ? 'Zapisz ofertę'
                : 'Dodaj ofertę'}
        </Button>
      </div>
    </form>
  );
}

// ── Helper components ──

function CreateListingImagesSection({
  files,
  imageLimit,
  onFilesSelected,
  onRemove,
  onSetPrimary,
}: {
  files: File[];
  imageLimit: number | null;
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  onSetPrimary: (index: number) => void;
}) {
  const isAtLimit = imageLimit !== null && files.length >= imageLimit;

  return (
    <FormSection
      title="Zdjęcia oferty"
      description="Dodaj zdjęcia od razu podczas tworzenia oferty. Po zapisie możesz zmienić kolejność, zdjęcie główne i opisy alternatywne."
    >
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-muted-foreground ring-1 ring-border">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  Galeria publicznej oferty
                </p>
                <Badge variant={isAtLimit ? 'warning' : 'secondary'}>
                  {imageLimit === null
                    ? `${files.length} zdjęć`
                    : `${files.length}/${imageLimit}`}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                JPG, PNG lub WebP, maksymalnie 10 MB na plik.
              </p>
            </div>
          </div>

          <div>
            <input
              id="create-listing-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={isAtLimit}
              onChange={onFilesSelected}
            />
            <label
              htmlFor="create-listing-images"
              className={cn(
                'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground shadow-sm transition-colors',
                'hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                isAtLimit && 'pointer-events-none opacity-50',
              )}
            >
              <ImagePlus className="h-4 w-4" />
              Dodaj zdjęcia
            </label>
          </div>
        </div>

        {files.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <SelectedListingImagePreview
                  file={file}
                  alt={`Podgląd zdjęcia ${index + 1}`}
                />
                <div className="grid gap-3 px-3 py-3">
                  <div className="flex items-start gap-3">
                    <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-medium text-foreground">
                          {file.name}
                        </p>
                        {index === 0 ? (
                          <Badge variant="success">Główne</Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={index === 0 ? 'secondary' : 'outline'}
                      size="sm"
                      disabled={index === 0}
                      className="min-w-0 flex-1 rounded-xl"
                      onClick={() => onSetPrimary(index)}
                    >
                      <Star className="h-4 w-4" />
                      {index === 0 ? 'Zdjęcie główne' : 'Ustaw jako główne'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                      aria-label={`Usuń ${file.name}`}
                      onClick={() => onRemove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}

function SelectedListingImagePreview({
  file,
  alt,
}: {
  file: File;
  alt: string;
}) {
  const [previewUrl, setPreviewUrl] = React.useState('');

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative aspect-[4/3] bg-muted">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImageIcon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

function GuidedCreateIntro() {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Szybki start z ofertą
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Zacznij od minimum danych. Po zapisaniu oferty możesz wrócić do
              szczegółów, zdjęć i publikacji.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-card px-3 py-2 text-xs font-medium text-muted-foreground ring-1 ring-border">
          <Clock3 className="h-3.5 w-3.5" />
          Około 2 min
        </div>
      </div>
    </div>
  );
}

function CommissionSection({
  currency,
  price,
  commissionType,
  commissionValue,
  commissionTypeError,
  commissionValueError,
  onCommissionTypeChange,
  onCommissionValueChange,
}: {
  currency: string;
  price: number | string;
  commissionType: ListingCommissionType | '';
  commissionValue: number | string;
  commissionTypeError: string | null;
  commissionValueError: string | null;
  onCommissionTypeChange: (value: string) => void;
  onCommissionValueChange: (value: string) => void;
}) {
  const commissionAmount = calculateListingCommissionAmount({
    price,
    commissionType: commissionType || null,
    commissionValue,
  });

  return (
    <FormSection
      title="Prowizja agenta"
      description="Prywatna informacja widoczna tylko w dashboardzie tej oferty."
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(220px,0.8fr)]">
        <FormField
          label="Typ prowizji"
          name="commissionType"
          error={commissionTypeError}
        >
          <FormSelect
            name="commissionType"
            value={commissionType}
            placeholder="Brak prowizji"
            options={Object.entries(LISTING_COMMISSION_TYPE_LABELS).map(
              ([value, label]) => ({ value, label }),
            )}
            error={!!commissionTypeError}
            onChange={onCommissionTypeChange}
          />
        </FormField>

        <FormField
          label={
            commissionType === ListingCommissionType.PERCENTAGE
              ? 'Wartość (%)'
              : 'Wartość prowizji'
          }
          name="commissionValue"
          error={commissionValueError}
        >
          <Input
            name="commissionValue"
            type="number"
            step="0.01"
            min="0"
            max={
              commissionType === ListingCommissionType.PERCENTAGE
                ? 100
                : undefined
            }
            value={commissionValue}
            disabled={!commissionType}
            placeholder={
              commissionType === ListingCommissionType.PERCENTAGE
                ? 'np. 2.5'
                : commissionType === ListingCommissionType.FIXED
                  ? 'np. 15000'
                  : 'Wybierz typ'
            }
            className="h-10 rounded-xl"
            aria-invalid={!!commissionValueError}
            onChange={(event) => onCommissionValueChange(event.target.value)}
          />
        </FormField>

        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Calculator className="h-3.5 w-3.5" />
            Szacowana prowizja
          </div>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {commissionAmount === null
              ? 'Nie ustawiono'
              : formatPrice(commissionAmount, currency)}
          </p>
        </div>
      </div>
    </FormSection>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <div>
        <legend className="font-heading text-base font-semibold text-foreground">
          {title}
        </legend>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </fieldset>
  );
}

function FormField({
  label,
  name,
  required,
  error,
  className,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  error: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function getInitialAssistantInput(
  listing: Listing | undefined,
): ListingDescriptionAssistantInput {
  return {
    title: listing?.title ?? '',
    propertyType: listing?.propertyType ?? '',
    transactionType: listing?.transactionType ?? '',
    price: toNumberOrNull(listing?.price),
    currency: listing?.currency ?? 'PLN',
    city: listing?.address?.city ?? '',
    district: listing?.address?.district ?? '',
    street: listing?.address?.street ?? '',
    areaM2: toNumberOrNull(listing?.areaM2),
    plotAreaM2: toNumberOrNull(listing?.plotAreaM2),
    rooms: toNumberOrNull(listing?.rooms),
    bathrooms: toNumberOrNull(listing?.bathrooms),
    floor: toNumberOrNull(listing?.floor),
    totalFloors: toNumberOrNull(listing?.totalFloors),
    yearBuilt: toNumberOrNull(listing?.yearBuilt),
    description: listing?.description ?? '',
  };
}

function collectAssistantInput(
  form: HTMLFormElement | null,
  fallbackPropertyType: PropertyType | '',
  listing: Listing | undefined,
): ListingDescriptionAssistantInput {
  if (!form) return getInitialAssistantInput(listing);

  return {
    title: getFormValue(form, 'title'),
    propertyType:
      (getFormValue(form, 'propertyType') as PropertyType | '') ||
      fallbackPropertyType,
    transactionType: getFormValue(form, 'transactionType') as
      | ListingDescriptionAssistantInput['transactionType']
      | '',
    price: toNumberOrNull(getFormValue(form, 'price')),
    currency: listing?.currency ?? 'PLN',
    city: getFormValue(form, 'address.city'),
    district: getFormValue(form, 'address.district'),
    street: getFormValue(form, 'address.street'),
    areaM2: toNumberOrNull(getFormValue(form, 'areaM2')),
    plotAreaM2: toNumberOrNull(getFormValue(form, 'plotAreaM2')),
    rooms: toNumberOrNull(getFormValue(form, 'rooms')),
    bathrooms: toNumberOrNull(getFormValue(form, 'bathrooms')),
    floor: toNumberOrNull(getFormValue(form, 'floor')),
    totalFloors: toNumberOrNull(getFormValue(form, 'totalFloors')),
    yearBuilt: toNumberOrNull(getFormValue(form, 'yearBuilt')),
    description: getFormValue(form, 'description'),
  };
}

function getFormValue(form: HTMLFormElement, name: string): string {
  const element = form.elements.namedItem(name);
  if (!element) return '';

  if (element instanceof RadioNodeList) {
    return String(element.value ?? '').trim();
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value.trim();
  }

  return '';
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validateSelectedListingImage(
  file: File,
  showErrorToast: (input: { title: string; description?: string }) => string,
): boolean {
  if (!ACCEPTED_CREATE_IMAGE_TYPES.includes(file.type)) {
    showErrorToast({
      title: 'Nieobsługiwany format',
      description: `${file.name}: dozwolone są JPG, PNG i WebP.`,
    });
    return false;
  }

  if (file.size > MAX_CREATE_IMAGE_SIZE_BYTES) {
    showErrorToast({
      title: 'Plik jest za duży',
      description: `${file.name}: maksymalny rozmiar to 10 MB.`,
    });
    return false;
  }

  return true;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FormSelect({
  name,
  defaultValue,
  value: controlledValue,
  placeholder,
  options,
  error,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  value?: string;
  placeholder: string;
  options: { value: string; label: string }[];
  error?: boolean;
  onChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  function handleChange(v: string) {
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
  }

  return (
    <InlineSelect
      name={name}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      options={options}
      error={error}
    />
  );
}
