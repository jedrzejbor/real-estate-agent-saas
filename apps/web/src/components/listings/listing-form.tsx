'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { useListingForm } from '@/hooks/use-listing-form';
import {
  createListingSchema,
  type CreateListingFormData,
  type Listing,
  PROPERTY_TYPE_LABELS,
  shouldShowListingField,
  TRANSACTION_TYPE_LABELS,
  PropertyType,
  createListing,
  updateListing,
} from '@/lib/listings';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { isUsageExceeded, isUsageWarning } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface ListingFormProps {
  /** Pass existing listing for edit mode, omit for create mode. */
  listing?: Listing;
}

/** Form for creating or editing a listing. */
export function ListingForm({ listing }: ListingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = !!listing;
  const [propertyType, setPropertyType] = useState<PropertyType | ''>(
    listing?.propertyType ?? '',
  );

  const listingsUsage = user?.usage.activeListings ?? 0;
  const listingsLimit = user?.entitlements.limits.activeListings ?? null;
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
          await createListing(data);
        }
        router.push('/dashboard/listings');
        router.refresh();
      },
    });

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {!isEdit && (showUsageWarning || showUsageExceeded) ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex items-center gap-2">
            <Badge variant={showUsageExceeded ? 'destructive' : 'warning'}>
              {showUsageExceeded ? 'Limit osiągnięty' : 'Zbliżasz się do limitu'}
            </Badge>
            <span>
              Oferty: {listingsUsage}/{listingsLimit}
            </span>
          </div>
        </div>
      ) : null}

      {/* Global error */}
      {globalError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {globalError}
        </div>
      )}

      {/* === Section: Basic Info === */}
      <FormSection title="Informacje podstawowe">
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
            label="Opis"
            name="description"
            error={getFieldError('description')}
            className="sm:col-span-2"
          >
            <textarea
              name="description"
              defaultValue={listing?.description ?? ''}
              rows={5}
              placeholder="Opisz nieruchomość..."
              className={cn(
                'w-full min-w-0 rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm transition-colors outline-none',
                'placeholder:text-muted-foreground',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                'resize-y',
              )}
            />
          </FormField>
        </div>
      </FormSection>

      {/* === Section: Price & Details === */}
      <FormSection title="Cena i parametry">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            />
          </FormField>

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
                defaultValue={listing?.areaM2 ? Number(listing.areaM2) : undefined}
                placeholder="np. 65"
                className="h-10 rounded-xl"
              />
            </FormField>
          )}

          {shouldShowListingField(propertyType, 'plotAreaM2') && (
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
                  listing?.plotAreaM2 ? Number(listing.plotAreaM2) : undefined
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
      <FormSection title="Adres">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Miasto"
            name="address.city"
            required
            error={getFieldError('address.city')}
          >
            <Input
              name="address.city"
              defaultValue={listing?.address?.city}
              placeholder="np. Warszawa"
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('address.city')}
            />
          </FormField>

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
            <Input
              name="address.district"
              defaultValue={listing?.address?.district ?? ''}
              placeholder="np. Śródmieście"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Województwo"
            name="address.voivodeship"
            error={getFieldError('address.voivodeship')}
          >
            <Input
              name="address.voivodeship"
              defaultValue={listing?.address?.voivodeship ?? ''}
              placeholder="np. mazowieckie"
              className="h-10 rounded-xl"
            />
          </FormField>
        </div>
      </FormSection>

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
              : 'Dodaj ofertę'}
        </Button>
      </div>
    </form>
  );
}

// ── Helper components ──

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="font-heading text-base font-semibold text-foreground">
        {title}
      </legend>
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
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
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
