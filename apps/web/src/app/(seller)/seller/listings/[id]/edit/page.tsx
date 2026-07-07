'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Home,
  ImagePlus,
  Loader2,
  Save,
  Send,
  Star,
  Trash2,
} from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { AGENT_DASHBOARD_PATH, isPrivateSellerUser } from '@/lib/auth';
import { APP_NAME } from '@/lib/brand';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  PROPERTY_TYPE_LABELS,
  PropertyType,
  TRANSACTION_TYPE_LABELS,
  TransactionType,
  type PropertyType as PropertyTypeValue,
  type TransactionType as TransactionTypeValue,
} from '@/lib/listings';
import {
  fetchSellerPublicListingSubmission,
  resubmitSellerPublicListingSubmission,
  updateSellerPublicListingSubmission,
  uploadPublicListingSubmissionImages,
  type PublicListingSubmissionImage,
  type SellerPublicListingSubmissionDetail,
} from '@/lib/public-listing-submissions';
import { CityAutocomplete } from '@/components/locations/city-autocomplete';
import { Logo } from '@/components/common/logo';
import { BulkSelectionToolbar } from '@/components/common/bulk-selection-toolbar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { cn } from '@/lib/utils';

interface SellerListingEditDraft {
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
  description: string;
  images: PublicListingSubmissionImage[];
  ownerName: string;
  email: string;
  phone: string;
  agencyName: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 15;

export default function SellerListingEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const [submission, setSubmission] =
    useState<SellerPublicListingSubmissionDetail | null>(null);
  const [draft, setDraft] = useState<SellerListingEditDraft | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const imageSelectionIds = useMemo(
    () =>
      (draft?.images ?? []).map((image, index) =>
        getSubmissionImageSelectionId(image, index),
      ),
    [draft?.images],
  );
  const imageSelection = useBulkSelection(imageSelectionIds);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!isPrivateSeller) {
      router.replace(AGENT_DASHBOARD_PATH);
    }
  }, [isLoading, isPrivateSeller, router, user]);

  useEffect(() => {
    if (isLoading || !user || !isPrivateSeller) return;

    let cancelled = false;

    async function loadSubmission() {
      setIsFetching(true);

      try {
        const result = await fetchSellerPublicListingSubmission(params.id);
        if (!cancelled) {
          setSubmission(result);
          setDraft(toDraft(result));
        }
      } catch (error) {
        if (!cancelled) {
          showErrorToast({
            title: 'Nie udało się pobrać ogłoszenia',
            description: getApiErrorMessage(error),
          });
          router.replace('/seller');
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void loadSubmission();

    return () => {
      cancelled = true;
    };
  }, [isLoading, isPrivateSeller, params.id, router, showErrorToast, user]);

  function updateDraft<K extends keyof SellerListingEditDraft>(
    key: K,
    value: SellerListingEditDraft[K],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleImagesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    if (!draft) return;

    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    const remainingSlots = MAX_IMAGES - draft.images.length;
    const validFiles = files.filter(validateImageFile).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      showErrorToast({
        title: 'Limit zdjęć',
        description: `Możesz dodać maksymalnie ${MAX_IMAGES} zdjęć do jednej oferty.`,
      });
    }

    if (!validFiles.length) return;

    try {
      setIsUploadingImages(true);
      const result = await uploadPublicListingSubmissionImages(validFiles);
      updateDraft(
        'images',
        normalizeSubmissionImages(
          [
            ...draft.images,
            ...result.images.map((image, index) => ({
              ...image,
              altText: draft.title || null,
              order: draft.images.length + index,
              isPrimary: draft.images.length === 0 && index === 0,
            })),
          ].slice(0, MAX_IMAGES),
        ),
      );
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się dodać zdjęć',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsUploadingImages(false);
    }
  }

  function removeImage(index: number) {
    if (!draft) return;

    updateDraft(
      'images',
      normalizeSubmissionImages(
        draft.images.filter((_, currentIndex) => currentIndex !== index),
      ),
    );
  }

  function removeSelectedImages() {
    if (!draft || imageSelection.selectedCount === 0) return;

    updateDraft(
      'images',
      normalizeSubmissionImages(
        draft.images.filter(
          (image, index) =>
            !imageSelection.selectedIdSet.has(
              getSubmissionImageSelectionId(image, index),
            ),
        ),
      ),
    );
    imageSelection.clear();
  }

  function setPrimaryImage(index: number) {
    if (!draft) return;

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

  async function saveDraft(): Promise<SellerPublicListingSubmissionDetail | null> {
    if (!draft) return null;

    const validation = validateDraft(draft);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return null;
    }

    const updated = await updateSellerPublicListingSubmission(
      params.id,
      buildUpdatePayload(draft),
    );
    setSubmission(updated);
    setDraft(toDraft(updated));

    return updated;
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      const updated = await saveDraft();

      if (!updated) return;

      showSuccessToast({
        title: 'Ogłoszenie zapisane',
        description: 'Zapisaliśmy podstawowe dane i zdjęcia.',
      });
      router.push('/seller');
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się zapisać ogłoszenia',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResubmit() {
    try {
      setIsResubmitting(true);
      const updated = await saveDraft();

      if (!updated) return;

      const resubmitted = await resubmitSellerPublicListingSubmission(
        updated.id,
      );
      setSubmission(resubmitted);
      setDraft(toDraft(resubmitted));
      showSuccessToast({
        title: 'Wysłano do ponownej weryfikacji',
        description: 'Zespół sprawdzi poprawioną ofertę przed publikacją.',
      });
      router.push('/seller');
    } catch (error) {
      showErrorToast({
        title: 'Nie udało się wysłać ogłoszenia',
        description: getApiErrorMessage(error),
      });
    } finally {
      setIsResubmitting(false);
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

  if (isLoading || isFetching || !user || !isPrivateSeller || !draft) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/seller" aria-label={`Panel właściciela ${APP_NAME}`}>
            <Logo size="sm" />
          </Link>
          <Link
            href="/seller"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              Edycja ogłoszenia
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold leading-tight">
              {submission?.title ?? draft.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Zaktualizuj podstawowe dane, lokalizację, opis i zdjęcia. Zmiany
              dotyczą Twojego zgłoszenia w panelu właściciela.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || isResubmitting || isUploadingImages}
              className="h-11 gap-2 rounded-xl"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Zapisz zmiany
            </Button>
            {submission?.status === 'rejected' ? (
              <Button
                type="button"
                onClick={handleResubmit}
                disabled={isSaving || isResubmitting || isUploadingImages}
                className="h-11 gap-2 rounded-xl"
              >
                {isResubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Wyślij do weryfikacji
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5">
          {submission?.status === 'rejected' ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
              Oferta została odrzucona w moderacji. Popraw dane zgodnie z
              wiadomością od zespołu i wyślij zgłoszenie do ponownej
              weryfikacji.
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <SectionHeader
              icon={Home}
              title="Podstawowe dane"
              description="Te informacje będą widoczne na karcie ogłoszenia."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Typ transakcji"
                value={draft.transactionType}
                error={fieldErrors.transactionType}
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
                error={fieldErrors.propertyType}
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
                error={fieldErrors.title}
                onChange={(value) => updateDraft('title', value)}
                className="sm:col-span-2"
              />
              <TextField
                label="Cena"
                type="number"
                min="1"
                value={draft.price}
                error={fieldErrors.price}
                onChange={(value) => updateDraft('price', value)}
              />
              <FieldShell label="Miasto" error={fieldErrors.city}>
                <CityAutocomplete
                  value={draft.city}
                  error={fieldErrors.city}
                  placeholder="np. Warszawa"
                  onValueChange={(value) => updateDraft('city', value)}
                  onLocationSelect={(location) => {
                    updateDraft('city', location.name);
                    updateDraft('voivodeship', location.voivodeship);
                    updateDraft('lat', String(location.lat));
                    updateDraft('lng', String(location.lng));
                  }}
                />
              </FieldShell>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <SectionHeader
              icon={Building2}
              title="Parametry i opis"
              description="Uzupełnij dane, które pomagają kupującym porównać ofertę."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {draft.propertyType !== PropertyType.LAND ? (
                <TextField
                  label="Powierzchnia (m²)"
                  type="number"
                  min="1"
                  value={draft.areaM2}
                  error={fieldErrors.areaM2}
                  onChange={(value) => updateDraft('areaM2', value)}
                />
              ) : null}
              {draft.propertyType === PropertyType.HOUSE ||
              draft.propertyType === PropertyType.LAND ? (
                <TextField
                  label="Powierzchnia działki (m²)"
                  type="number"
                  min="1"
                  value={draft.plotAreaM2}
                  error={fieldErrors.plotAreaM2}
                  onChange={(value) => updateDraft('plotAreaM2', value)}
                />
              ) : null}
              {draft.propertyType === PropertyType.APARTMENT ||
              draft.propertyType === PropertyType.HOUSE ? (
                <TextField
                  label="Pokoje"
                  type="number"
                  min="1"
                  max="99"
                  value={draft.rooms}
                  error={fieldErrors.rooms}
                  onChange={(value) => updateDraft('rooms', value)}
                />
              ) : null}
              <TextField
                label="Łazienki"
                type="number"
                min="0"
                max="20"
                value={draft.bathrooms}
                onChange={(value) => updateDraft('bathrooms', value)}
              />
              <TextField
                label="Rok budowy"
                type="number"
                min="1800"
                value={draft.yearBuilt}
                error={fieldErrors.yearBuilt}
                onChange={(value) => updateDraft('yearBuilt', value)}
              />
            </div>
            <TextAreaField
              label="Opis"
              value={draft.description}
              error={fieldErrors.description}
              onChange={(value) => updateDraft('description', value)}
            />
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <SectionHeader
              icon={ImagePlus}
              title="Zdjęcia"
              description="Pierwsze zdjęcie traktujemy jako główne."
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleImagesSelected}
            />
            <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
              <p className="text-sm font-medium">
                Dodano {draft.images.length}/{MAX_IMAGES} zdjęć
              </p>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={
                  isUploadingImages || draft.images.length >= MAX_IMAGES
                }
                className="mt-4 h-10 gap-2 rounded-xl"
              >
                {isUploadingImages ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {isUploadingImages ? 'Dodawanie...' : 'Dodaj zdjęcia'}
              </Button>
            </div>

            {draft.images.length > 0 ? (
              <div className="mt-5 space-y-4">
                <BulkSelectionToolbar
                  allSelected={imageSelection.allSelected}
                  selectedCount={imageSelection.selectedCount}
                  totalCount={draft.images.length}
                  onToggleAll={imageSelection.toggleAll}
                  onClear={imageSelection.clear}
                  onDeleteSelected={removeSelectedImages}
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {draft.images.map((image, index) => {
                    const imageSelectionId = getSubmissionImageSelectionId(
                      image,
                      index,
                    );
                    const isSelected =
                      imageSelection.selectedIdSet.has(imageSelectionId);

                    return (
                      <article
                        key={`${image.url}-${index}`}
                        className={cn(
                          'overflow-hidden rounded-xl border bg-card transition',
                          isSelected
                            ? 'border-primary shadow-sm ring-2 ring-primary/25'
                            : 'border-border',
                        )}
                      >
                        <div
                          className="relative aspect-[4/3] bg-muted bg-cover bg-center"
                          style={{ backgroundImage: `url(${image.url})` }}
                        >
                          <label className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/80 bg-background/90 shadow-sm backdrop-blur">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                imageSelection.toggle(imageSelectionId)
                              }
                              aria-label="Zaznacz zdjęcie"
                              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                            />
                          </label>
                          {image.isPrimary || index === 0 ? (
                            <span className="absolute left-3 top-3 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                              Główne
                            </span>
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
                              image.isPrimary || index === 0
                                ? 'secondary'
                                : 'outline'
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
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

function toDraft(
  submission: SellerPublicListingSubmissionDetail,
): SellerListingEditDraft {
  const listing = submission.listing;
  const address = submission.address;
  const publicSettings = submission.publicSettings ?? {};

  return {
    transactionType: asString(listing.transactionType) as TransactionTypeValue,
    propertyType: asString(listing.propertyType) as PropertyTypeValue,
    title: asString(listing.title),
    price: asString(listing.price),
    city: asString(address.city),
    district: asString(address.district),
    street: asString(address.street),
    postalCode: asString(address.postalCode),
    voivodeship: asString(address.voivodeship),
    lat: asString(address.lat),
    lng: asString(address.lng),
    showExactAddressOnPublicPage: Boolean(
      publicSettings.showExactAddressOnPublicPage,
    ),
    areaM2: asString(listing.areaM2),
    plotAreaM2: asString(listing.plotAreaM2),
    rooms: asString(listing.rooms),
    bathrooms: asString(listing.bathrooms),
    floor: asString(listing.floor),
    totalFloors: asString(listing.totalFloors),
    yearBuilt: asString(listing.yearBuilt),
    description: asString(listing.description),
    images: normalizeSubmissionImages(
      submission.images
        .map((image, index) => ({
          ...image,
          order: image.order ?? index,
        }))
        .sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
          return (a.order ?? 0) - (b.order ?? 0);
        }),
    ),
    ownerName: submission.ownerName,
    email: submission.email,
    phone: submission.phone,
    agencyName: submission.agencyName ?? '',
  };
}

function buildUpdatePayload(draft: SellerListingEditDraft) {
  return {
    listing: {
      title: draft.title.trim(),
      description: optionalString(draft.description),
      propertyType: draft.propertyType as PropertyTypeValue,
      transactionType: draft.transactionType as TransactionTypeValue,
      price: Number(draft.price),
      currency: 'PLN',
      areaM2: optionalNumber(draft.areaM2),
      plotAreaM2: optionalNumber(draft.plotAreaM2),
      rooms: optionalNumber(draft.rooms),
      bathrooms: optionalNumber(draft.bathrooms),
      floor: optionalNumber(draft.floor),
      totalFloors: optionalNumber(draft.totalFloors),
      yearBuilt: optionalNumber(draft.yearBuilt),
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
    metadata: {
      uiVersion: 'seller-listing-edit-v1',
      imageCount: draft.images.length,
    },
  };
}

function validateDraft(
  draft: SellerListingEditDraft,
): { success: true } | { success: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
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
      ownerName: z.string().trim().min(1),
      email: z.string().trim().email(),
      phone: z.string().trim().min(6).max(30),
    })
    .safeParse(draft);

  if (!result.success) {
    Object.assign(errors, mapZodErrors(result.error));
  }

  if (
    draft.propertyType !== PropertyType.LAND &&
    !positiveNumber(draft.areaM2)
  ) {
    errors.areaM2 = 'Powierzchnia jest wymagana';
  }
  if (
    (draft.propertyType === PropertyType.HOUSE ||
      draft.propertyType === PropertyType.LAND) &&
    !positiveNumber(draft.plotAreaM2)
  ) {
    errors.plotAreaM2 = 'Powierzchnia działki jest wymagana';
  }
  if (
    (draft.propertyType === PropertyType.APARTMENT ||
      draft.propertyType === PropertyType.HOUSE) &&
    !positiveNumber(draft.rooms)
  ) {
    errors.rooms = 'Liczba pokoi jest wymagana';
  }
  if (draft.yearBuilt) {
    const maxYear = new Date().getFullYear() + 5;
    const yearBuilt = Number(draft.yearBuilt);
    if (
      !Number.isFinite(yearBuilt) ||
      yearBuilt < 1800 ||
      yearBuilt > maxYear
    ) {
      errors.yearBuilt = `Rok budowy musi być między 1800 a ${maxYear}`;
    }
  }
  if (draft.description.length > 3000) {
    errors.description = 'Opis może mieć maksymalnie 3000 znaków';
  }

  return Object.keys(errors).length
    ? { success: false, errors }
    : { success: true };
}

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
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
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
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        value={value}
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

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>;
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
  };
  return messages[field] ?? fallback;
}

function asString(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function positiveNumber(value: string): boolean {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
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

function normalizeSubmissionImages(
  images: PublicListingSubmissionImage[],
): PublicListingSubmissionImage[] {
  return images.map((image, index) => ({
    ...image,
    order: index,
    isPrimary: index === 0,
  }));
}

function getSubmissionImageSelectionId(
  image: PublicListingSubmissionImage,
  index: number,
): string {
  return `${image.url}-${image.order ?? index}`;
}
