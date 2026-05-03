'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { LEGAL_META } from '@/lib/legal';
import { reportPublicListingAbuse } from '@/lib/listings';
import { cn } from '@/lib/utils';

interface PublicListingAbuseReportProps {
  slug: string;
  listingId: string;
  listingTitle: string;
}

const ABUSE_REASONS = [
  { value: 'fake_listing', label: 'Fałszywa oferta' },
  { value: 'wrong_data', label: 'Nieprawidłowe dane' },
  { value: 'unauthorized_photos', label: 'Zdjęcia bez zgody' },
  { value: 'personal_data', label: 'Dane osobowe / prywatność' },
  { value: 'spam_or_fraud', label: 'Spam lub próba oszustwa' },
  { value: 'other', label: 'Inny powód' },
] as const;

export function PublicListingAbuseReport({
  slug,
  listingId,
  listingTitle,
}: PublicListingAbuseReportProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [reason, setReason] = React.useState<string>('');
  const [details, setDetails] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!reason) {
      setError('Wybierz powód zgłoszenia');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await reportPublicListingAbuse(slug, {
        reason,
        details: details.trim() || undefined,
        listingId,
        listingTitle,
      });
      setIsSubmitted(true);
      showSuccessToast({
        title: 'Zgłoszenie przyjęte',
        description: 'Dziękujemy. Sprawdzimy tę ofertę operacyjnie.',
      });
    } catch (reportError) {
      showErrorToast({
        title: 'Nie udało się wysłać zgłoszenia',
        description: getApiErrorMessage(reportError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Zgłoszenie wysłane</p>
            <p className="mt-0.5 text-emerald-800">
              Jeśli oferta narusza zasady, zespół może ją zweryfikować lub
              wycofać.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Zgłoś nadużycie
        </span>
        {isOpen ? <X className="h-4 w-4" /> : null}
      </button>

      {isOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3 px-3 pb-3">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Zgłoszenie trafia do logu operacyjnego EstateFlow razem z
              identyfikatorem oferty. Pilne sprawy można też zgłosić na{' '}
              <a
                href={`mailto:${LEGAL_META.abuseEmail}`}
                className="font-medium text-primary hover:underline"
              >
                {LEGAL_META.abuseEmail}
              </a>
              .
            </p>
            <div className="grid gap-2">
              {ABUSE_REASONS.map((item) => (
                <label
                  key={item.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm',
                    reason === item.value
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <input
                    type="radio"
                    name="abuseReason"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => {
                      setReason(item.value);
                      setError(null);
                    }}
                    className="h-4 w-4 accent-primary"
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              Szczegóły
            </span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Dodaj krótki kontekst zgłoszenia"
              className={cn(
                'w-full min-w-0 resize-y rounded-xl border border-border/80 bg-white px-3 py-2 text-sm shadow-sm transition-colors outline-none',
                'placeholder:text-muted-foreground',
                'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
              )}
            />
          </label>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full gap-2 rounded-xl"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
