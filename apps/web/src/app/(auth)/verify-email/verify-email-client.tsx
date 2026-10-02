'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleAlert, Loader2, Mail } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-client';
import {
  confirmAccountEmailVerification,
  requestAccountEmailVerification,
} from '@/lib/account-email-verification';

type VerificationState = 'verifying' | 'success' | 'invalid' | 'network-error';

export function VerifyEmailClient() {
  const hasStarted = useRef(false);
  const [state, setState] = useState<VerificationState>('verifying');
  const [email, setEmail] = useState('');
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      'token',
    );
    // Remove the fragment before any API request or navigation can expose it.
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname + window.location.search,
    );
    if (!token) {
      setState('invalid');
      return;
    }

    confirmAccountEmailVerification(token)
      .then(() => setState('success'))
      .catch((error: unknown) => {
        setState(
          error instanceof ApiError && error.status === 400
            ? 'invalid'
            : 'network-error',
        );
      });
  }, []);

  async function requestNewLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    setResendMessage(null);
    try {
      await requestAccountEmailVerification(email.trim());
      setResendMessage(
        'Jeśli konto wymaga potwierdzenia, wyślemy nowy link. Sprawdź pocztę i folder spam.',
      );
    } catch {
      setResendMessage(
        'Nie udało się teraz wysłać wiadomości. Spróbuj ponownie później.',
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      aria-live="polite"
    >
      {state === 'verifying' && (
        <>
          <Loader2
            className="mx-auto h-9 w-9 animate-spin text-primary"
            aria-hidden="true"
          />
          <h1 className="mt-5 font-heading text-2xl font-bold">
            Potwierdzamy adres e-mail
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            To może potrwać kilka sekund.
          </p>
        </>
      )}
      {state === 'success' && (
        <>
          <CheckCircle2
            className="mx-auto h-10 w-10 text-status-success"
            aria-hidden="true"
          />
          <h1 className="mt-5 font-heading text-2xl font-bold">
            Adres został potwierdzony
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Zaloguj się, aby kontynuować pracę z kontem.
          </p>
          <Link href="/login" className={buttonVariants({ className: 'mt-6' })}>
            Zaloguj się
          </Link>
        </>
      )}
      {(state === 'invalid' || state === 'network-error') && (
        <>
          <CircleAlert
            className="mx-auto h-10 w-10 text-destructive"
            aria-hidden="true"
          />
          <h1 className="mt-5 font-heading text-2xl font-bold">
            {state === 'invalid'
              ? 'Link jest nieprawidłowy lub wygasł'
              : 'Nie udało się sprawdzić linku'}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {state === 'invalid'
              ? 'Możesz poprosić o nową wiadomość.'
              : 'Sprawdź połączenie i poproś o nowy link, jeśli problem się powtarza.'}
          </p>
          <form onSubmit={requestNewLink} className="mt-6 space-y-3 text-left">
            <label
              htmlFor="verification-email"
              className="block text-sm font-medium"
            >
              Adres e-mail konta
            </label>
            <Input
              id="verification-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" disabled={isSending} className="w-full gap-2">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {isSending ? 'Wysyłanie…' : 'Wyślij nowy link'}
            </Button>
          </form>
          {resendMessage && (
            <p className="mt-4 text-sm text-muted-foreground" role="status">
              {resendMessage}
            </p>
          )}
          <Link
            href="/login"
            className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
          >
            Wróć do logowania
          </Link>
        </>
      )}
    </section>
  );
}
