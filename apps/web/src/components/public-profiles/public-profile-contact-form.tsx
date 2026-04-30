'use client';

import * as React from 'react';
import { SendHorizonal } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PublicLeadSource,
  publicLeadFormSchema,
  submitPublicProfileLead,
  type PublicLeadFormData,
} from '@/lib/public-leads';
import { cn } from '@/lib/utils';

interface PublicProfileContactFormProps {
  agentId: string;
  profileName: string;
}

type FieldErrors = Partial<Record<keyof PublicLeadFormData, string>>;

const CONTACT_CONSENT_TEXT =
  'Wyrażam zgodę na kontakt ze strony agenta lub biura nieruchomości.';

export function PublicProfileContactForm({
  agentId,
  profileName,
}: PublicProfileContactFormProps) {
  const formStartedAt = React.useRef(Date.now());
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setGlobalError(null);

    const formData = new FormData(event.currentTarget);
    const parsed = publicLeadFormSchema.safeParse({
      fullName: String(formData.get('fullName') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      message: String(formData.get('message') ?? ''),
      contactConsent: formData.get('contactConsent') === 'on',
      marketingConsent: formData.get('marketingConsent') === 'on',
      website: String(formData.get('website') ?? ''),
    });

    if (!parsed.success) {
      setFieldErrors(mapZodErrors(parsed.error));
      return;
    }

    const utm = getUtmParams();

    try {
      setIsSubmitting(true);
      await submitPublicProfileLead(agentId, {
        ...parsed.data,
        source: PublicLeadSource.PUBLIC_PROFILE,
        sourceUrl: window.location.href,
        referrer: document.referrer || undefined,
        utmSource: utm.utm_source,
        utmMedium: utm.utm_medium,
        utmCampaign: utm.utm_campaign,
        utmTerm: utm.utm_term,
        utmContent: utm.utm_content,
        formStartedAt: formStartedAt.current,
        metadata: {
          agentId,
          profileName,
        },
      });

      setIsSubmitted(true);
    } catch (error) {
      setGlobalError(
        error instanceof Error
          ? error.message
          : 'Nie udało się wysłać formularza. Spróbuj ponownie.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">Dziękujemy za wiadomość.</p>
        <p className="mt-1 leading-6">
          Zgłoszenie trafiło do opiekuna profilu.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {globalError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {globalError}
        </div>
      ) : null}

      <LeadField
        label="Imię i nazwisko"
        name="fullName"
        error={fieldErrors.fullName}
        required
      >
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          className="h-10 rounded-xl"
          aria-invalid={Boolean(fieldErrors.fullName)}
        />
      </LeadField>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <LeadField label="Email" name="email" error={fieldErrors.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="h-10 rounded-xl"
            aria-invalid={Boolean(fieldErrors.email)}
          />
        </LeadField>
        <LeadField label="Telefon" name="phone" error={fieldErrors.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className="h-10 rounded-xl"
            aria-invalid={Boolean(fieldErrors.phone)}
          />
        </LeadField>
      </div>

      <LeadField label="Wiadomość" name="message" error={fieldErrors.message}>
        <textarea
          id="message"
          name="message"
          rows={4}
          defaultValue={`Dzień dobry, proszę o kontakt z profilu: ${profileName}.`}
          className={cn(
            'w-full min-w-0 resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm transition-colors outline-none',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
          )}
        />
      </LeadField>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <label className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          name="contactConsent"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
        />
        <span>
          <span className="font-medium text-foreground">
            {CONTACT_CONSENT_TEXT}
          </span>
          <span className="mt-1 block">
            Dane zostaną użyte do odpowiedzi na zapytanie.
          </span>
          {fieldErrors.contactConsent ? (
            <span className="mt-1 block text-destructive" role="alert">
              {fieldErrors.contactConsent}
            </span>
          ) : null}
        </span>
      </label>

      <label className="flex gap-3 rounded-xl border border-border bg-white p-3 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          name="marketingConsent"
          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-ring"
        />
        <span>Chcę otrzymywać także podobne oferty.</span>
      </label>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 w-full gap-2 rounded-xl"
      >
        <SendHorizonal className="h-4 w-4" />
        {isSubmitting ? 'Wysyłanie...' : 'Wyślij wiadomość'}
      </Button>
    </form>
  );
}

function LeadField({
  label,
  name,
  error,
  required,
  children,
}: {
  label: string;
  name: keyof PublicLeadFormData;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-foreground"
      >
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function mapZodErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof PublicLeadFormData;
    if (field) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') ?? undefined,
    utm_medium: params.get('utm_medium') ?? undefined,
    utm_campaign: params.get('utm_campaign') ?? undefined,
    utm_term: params.get('utm_term') ?? undefined,
    utm_content: params.get('utm_content') ?? undefined,
  };
}
