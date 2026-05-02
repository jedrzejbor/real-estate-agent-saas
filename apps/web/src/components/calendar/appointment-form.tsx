'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  SearchableSelect,
  type SelectOption,
} from '@/components/ui/searchable-select';
import { InlineSelect } from '@/components/ui/inline-select';
import { LimitUpgradeBanner } from '@/components/growth/limit-upgrade-banner';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { useClientForm } from '@/hooks/use-client-form';
import { fetchClients, clientFullName } from '@/lib/clients';
import { fetchListings } from '@/lib/listings';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  type CreateAppointmentFormData,
  type UpdateAppointmentFormData,
  type Appointment,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_STATUS_LABELS,
  createAppointment,
  updateAppointment,
} from '@/lib/appointments';
import { isUsageExceeded, isUsageWarning } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface AppointmentFormProps {
  /** Pass existing appointment for edit mode. */
  appointment?: Appointment;
}

/** Format a date string to datetime-local input value. */
function toDateTimeLocal(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  // Format: YYYY-MM-DDTHH:mm
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getCalendarRedirectUrl(dateStr: string): string {
  const date = new Date(dateStr);
  return `/dashboard/calendar?year=${date.getFullYear()}&month=${date.getMonth() + 1}`;
}

export function AppointmentForm({ appointment }: AppointmentFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { success } = useToast();
  const isEdit = !!appointment;
  const schema = isEdit ? updateAppointmentSchema : createAppointmentSchema;

  const appointmentsUsage = user?.usage.monthlyAppointments ?? 0;
  const appointmentsLimit =
    user?.entitlements.limits.monthlyAppointments ?? null;
  const showUsageWarning =
    !isEdit && isUsageWarning(appointmentsUsage, appointmentsLimit);
  const showUsageExceeded =
    !isEdit && isUsageExceeded(appointmentsUsage, appointmentsLimit);

  const { handleSubmit, getFieldError, globalError, isLoading } = useClientForm(
    {
      schema,
      onSubmit: async (
        data: CreateAppointmentFormData | UpdateAppointmentFormData,
      ) => {
        // Convert datetime-local to ISO strings
        const payload = {
          ...data,
          startTime: data.startTime
            ? new Date(data.startTime).toISOString()
            : '',
          endTime: data.endTime ? new Date(data.endTime).toISOString() : '',
        };

        const savedAppointment = isEdit
          ? await updateAppointment(
              appointment.id,
              payload as UpdateAppointmentFormData,
            )
          : await createAppointment(payload as CreateAppointmentFormData);

        success({
          title: isEdit
            ? 'Spotkanie zostało zaktualizowane'
            : 'Spotkanie zostało utworzone',
          description: `${savedAppointment.title} zapisano pomyślnie.`,
        });

        router.push(getCalendarRedirectUrl(savedAppointment.startTime));
        router.refresh();
      },
    },
  );

  // ── Async search handlers for relation pickers ──

  const searchClients = React.useCallback(
    async (query: string): Promise<SelectOption[]> => {
      const result = await fetchClients({
        search: query || undefined,
        limit: 30,
      });
      return result.data.map((c) => ({
        id: c.id,
        label: clientFullName(c),
        sublabel: c.email ?? c.phone ?? undefined,
      }));
    },
    [],
  );

  const searchListings = React.useCallback(
    async (query: string): Promise<SelectOption[]> => {
      const result = await fetchListings({
        search: query || undefined,
        limit: 30,
      });
      return result.data.map((l) => ({
        id: l.id,
        label: l.title,
        sublabel: l.address?.city
          ? `${l.address.city}${l.address.street ? ' · ' + l.address.street : ''}`
          : undefined,
      }));
    },
    [],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {!isEdit && (showUsageWarning || showUsageExceeded) ? (
        <LimitUpgradeBanner
          resource="appointments"
          usage={appointmentsUsage}
          limit={appointmentsLimit}
          exceeded={showUsageExceeded}
          source="appointment_form_limit_state"
        />
      ) : null}

      {globalError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {globalError}
        </div>
      )}

      {/* === Section: Informacje o spotkaniu === */}
      <FormSection title="Informacje o spotkaniu">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Tytuł"
            name="title"
            required
            error={getFieldError('title')}
            className="sm:col-span-2"
          >
            <Input
              name="title"
              defaultValue={appointment?.title}
              placeholder="np. Prezentacja mieszkania przy ul. Marszałkowskiej"
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('title')}
            />
          </FormField>

          <FormField
            label="Typ spotkania"
            name="type"
            error={getFieldError('type')}
          >
            <FormSelect
              name="type"
              defaultValue={appointment?.type}
              placeholder="Wybierz typ"
              options={Object.entries(APPOINTMENT_TYPE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </FormField>

          {isEdit && (
            <FormField
              label="Status"
              name="status"
              error={getFieldError('status')}
            >
              <FormSelect
                name="status"
                defaultValue={appointment?.status}
                placeholder="Wybierz status"
                options={Object.entries(APPOINTMENT_STATUS_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
            </FormField>
          )}

          <FormField
            label="Lokalizacja"
            name="location"
            error={getFieldError('location')}
            className={isEdit ? 'sm:col-span-2' : ''}
          >
            <Input
              name="location"
              defaultValue={appointment?.location ?? ''}
              placeholder="np. ul. Marszałkowska 10, Warszawa"
              className="h-10 rounded-xl"
            />
          </FormField>
        </div>
      </FormSection>

      {/* === Section: Termin === */}
      <FormSection title="Termin">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Data i godzina rozpoczęcia"
            name="startTime"
            required
            error={getFieldError('startTime')}
          >
            <Input
              name="startTime"
              type="datetime-local"
              defaultValue={toDateTimeLocal(appointment?.startTime)}
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('startTime')}
            />
          </FormField>

          <FormField
            label="Data i godzina zakończenia"
            name="endTime"
            required
            error={getFieldError('endTime')}
          >
            <Input
              name="endTime"
              type="datetime-local"
              defaultValue={toDateTimeLocal(appointment?.endTime)}
              className="h-10 rounded-xl"
              aria-invalid={!!getFieldError('endTime')}
            />
          </FormField>
        </div>
      </FormSection>

      {/* === Section: Powiązania === */}
      <FormSection title="Powiązania (opcjonalne)">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Klient"
            name="clientId"
            error={getFieldError('clientId')}
          >
            <SearchableSelect
              name="clientId"
              placeholder="Wybierz klienta..."
              onSearch={searchClients}
              defaultOption={
                appointment?.clientId
                  ? {
                      id: appointment.clientId,
                      label: appointment.client
                        ? `${appointment.client.firstName} ${appointment.client.lastName}`
                        : appointment.clientId,
                    }
                  : undefined
              }
              error={getFieldError('clientId')}
            />
          </FormField>

          <FormField
            label="Oferta"
            name="listingId"
            error={getFieldError('listingId')}
          >
            <SearchableSelect
              name="listingId"
              placeholder="Wybierz ofertę..."
              onSearch={searchListings}
              defaultOption={
                appointment?.listingId
                  ? {
                      id: appointment.listingId,
                      label:
                        appointment.listing?.title ?? appointment.listingId,
                    }
                  : undefined
              }
              error={getFieldError('listingId')}
            />
          </FormField>
        </div>
      </FormSection>

      {/* === Section: Notatki === */}
      <FormSection title="Notatki">
        <FormField
          label="Dodatkowe notatki"
          name="notes"
          error={getFieldError('notes')}
        >
          <textarea
            name="notes"
            defaultValue={appointment?.notes ?? ''}
            rows={3}
            placeholder="Dodatkowe informacje o spotkaniu..."
            className={cn(
              'w-full min-w-0 rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm transition-colors outline-none',
              'placeholder:text-muted-foreground',
              'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              'resize-y',
            )}
          />
        </FormField>
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
              : 'Utwórz spotkanie'}
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
}: {
  name: string;
  defaultValue?: string;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  const [value, setValue] = React.useState(defaultValue ?? '');

  return (
    <InlineSelect
      name={name}
      value={value}
      onChange={setValue}
      placeholder={placeholder}
      options={options}
    />
  );
}
