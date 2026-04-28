'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InlineSelect } from '@/components/ui/inline-select';
import { useClientForm } from '@/hooks/use-client-form';
import {
  createClientSchema,
  type CreateClientFormData,
  type Client,
  CLIENT_SOURCE_LABELS,
  PROPERTY_TYPE_LABELS,
  createClient,
  updateClient,
} from '@/lib/clients';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { isUsageExceeded, isUsageWarning } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface ClientFormProps {
  /** Pass existing client for edit mode, omit for create mode. */
  client?: Client;
}

/** Form for creating or editing a client with preferences. */
export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isEdit = !!client;

  const clientsUsage = user?.usage.clients ?? 0;
  const clientsLimit = user?.entitlements.limits.clients ?? null;
  const showUsageWarning = !isEdit && isUsageWarning(clientsUsage, clientsLimit);
  const showUsageExceeded = !isEdit && isUsageExceeded(clientsUsage, clientsLimit);

  const { handleSubmit, getFieldError, globalError, isLoading } =
    useClientForm({
      schema: createClientSchema,
      onSubmit: async (data: CreateClientFormData) => {
        if (isEdit) {
          await updateClient(client.id, data);
        } else {
          await createClient(data);
        }
        router.push('/dashboard/clients');
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
              Klienci: {clientsUsage}/{clientsLimit}
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

      {/* === Section: Personal Info === */}
      <FormSection title="Dane osobowe">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Imię"
            name="firstName"
            required
            error={getFieldError('firstName')}
          >
            <Input
              name="firstName"
              defaultValue={client?.firstName}
              placeholder="np. Anna"
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('firstName')}
            />
          </FormField>

          <FormField
            label="Nazwisko"
            name="lastName"
            required
            error={getFieldError('lastName')}
          >
            <Input
              name="lastName"
              defaultValue={client?.lastName}
              placeholder="np. Kowalska"
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('lastName')}
            />
          </FormField>

          <FormField
            label="Email"
            name="email"
            error={getFieldError('email')}
          >
            <Input
              name="email"
              type="email"
              defaultValue={client?.email ?? ''}
              placeholder="np. anna@example.com"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Telefon"
            name="phone"
            error={getFieldError('phone')}
          >
            <Input
              name="phone"
              type="tel"
              defaultValue={client?.phone ?? ''}
              placeholder="np. +48 600 123 456"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Źródło"
            name="source"
            error={getFieldError('source')}
          >
            <FormSelect
              name="source"
              defaultValue={client?.source}
              placeholder="Wybierz źródło"
              options={Object.entries(CLIENT_SOURCE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </FormField>
        </div>
      </FormSection>

      {/* === Section: Budget === */}
      <FormSection title="Budżet">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Budżet od (PLN)"
            name="budgetMin"
            error={getFieldError('budgetMin')}
          >
            <Input
              name="budgetMin"
              type="number"
              step="1000"
              min="0"
              defaultValue={
                client?.budgetMin ? Number(client.budgetMin) : undefined
              }
              placeholder="np. 300000"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Budżet do (PLN)"
            name="budgetMax"
            error={getFieldError('budgetMax')}
          >
            <Input
              name="budgetMax"
              type="number"
              step="1000"
              min="0"
              defaultValue={
                client?.budgetMax ? Number(client.budgetMax) : undefined
              }
              placeholder="np. 600000"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Notatki"
            name="notes"
            error={getFieldError('notes')}
            className="sm:col-span-2"
          >
            <textarea
              name="notes"
              defaultValue={client?.notes ?? ''}
              rows={3}
              placeholder="Dodatkowe informacje o kliencie..."
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

      {/* === Section: Preferences === */}
      <FormSection title="Preferencje nieruchomości">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            label="Typ nieruchomości"
            name="preference.propertyType"
            error={getFieldError('preference.propertyType')}
          >
            <FormSelect
              name="preference.propertyType"
              defaultValue={client?.preference?.propertyType}
              placeholder="Wybierz typ"
              options={Object.entries(PROPERTY_TYPE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </FormField>

          <FormField
            label="Min. powierzchnia (m²)"
            name="preference.minArea"
            error={getFieldError('preference.minArea')}
          >
            <Input
              name="preference.minArea"
              type="number"
              step="1"
              min="0"
              defaultValue={
                client?.preference?.minArea
                  ? Number(client.preference.minArea)
                  : undefined
              }
              placeholder="np. 50"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Maks. cena (PLN)"
            name="preference.maxPrice"
            error={getFieldError('preference.maxPrice')}
          >
            <Input
              name="preference.maxPrice"
              type="number"
              step="1000"
              min="0"
              defaultValue={
                client?.preference?.maxPrice
                  ? Number(client.preference.maxPrice)
                  : undefined
              }
              placeholder="np. 500000"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Preferowane miasto"
            name="preference.preferredCity"
            error={getFieldError('preference.preferredCity')}
          >
            <Input
              name="preference.preferredCity"
              defaultValue={client?.preference?.preferredCity ?? ''}
              placeholder="np. Warszawa"
              className="h-10 rounded-xl"
            />
          </FormField>

          <FormField
            label="Min. pokoje"
            name="preference.minRooms"
            error={getFieldError('preference.minRooms')}
          >
            <Input
              name="preference.minRooms"
              type="number"
              min="1"
              max="20"
              defaultValue={client?.preference?.minRooms ?? undefined}
              placeholder="np. 3"
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
              : 'Dodaj klienta'}
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

function FormSelect({
  name,
  defaultValue,
  placeholder,
  options,
  error,
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  options: { value: string; label: string }[];
  error?: boolean;
}) {
  const [value, setValue] = React.useState(defaultValue ?? '');

  return (
    <InlineSelect
      name={name}
      value={value}
      onChange={setValue}
      placeholder={placeholder}
      options={options}
      error={error}
    />
  );
}
