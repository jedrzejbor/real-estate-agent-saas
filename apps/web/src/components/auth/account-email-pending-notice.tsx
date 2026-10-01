'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { maskAccountEmail } from '@/lib/auth';
import { requestAccountEmailVerification } from '@/lib/account-email-verification';

export function AccountEmailPendingNotice({
  email,
  loginHref = '/login',
  onBackToLogin,
}: {
  email: string;
  loginHref?: string;
  onBackToLogin?: () => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setIsSending(true);
    setMessage(null);
    try {
      await requestAccountEmailVerification(email);
      setMessage(
        'Jeśli konto wymaga potwierdzenia, wyślemy nowy link. Sprawdź pocztę i folder spam.',
      );
    } catch {
      setMessage(
        'Nie udało się teraz wysłać wiadomości. Spróbuj ponownie za chwilę.',
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section
      className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
      aria-labelledby="email-pending-title"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Mail className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1
        id="email-pending-title"
        className="mt-5 font-heading text-2xl font-bold text-foreground"
      >
        Sprawdź swoją pocztę
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Jeśli konto wymaga potwierdzenia adresu, wyślemy link na{' '}
        <strong className="text-foreground">{maskAccountEmail(email)}</strong>.
        Otwórz wiadomość i potwierdź adres, zanim się zalogujesz.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Link jest ważny przez 24 godziny. Sprawdź też folder spam.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={resend}
          disabled={isSending}
          className="gap-2"
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          {isSending ? 'Wysyłanie…' : 'Wyślij link ponownie'}
        </Button>
        {onBackToLogin ? (
          <Button type="button" onClick={onBackToLogin} className="gap-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Wróć do logowania
          </Button>
        ) : (
          <Button render={<Link href={loginHref} />} className="w-full gap-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Przejdź do logowania
          </Button>
        )}
      </div>
      {message && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
