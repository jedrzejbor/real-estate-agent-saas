'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  requestPasswordReset,
  requestPasswordResetSchema,
  type RequestPasswordResetFormData,
} from '@/lib/auth';
import { useAuthForm } from '@/hooks/use-auth-form';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const {
    handleSubmit,
    getFieldError,
    globalError,
    isLoading: isSubmitting,
  } = useAuthForm<typeof requestPasswordResetSchema>({
    schema: requestPasswordResetSchema,
    onSubmit: async (data: RequestPasswordResetFormData) => {
      await requestPasswordReset(data);
      setIsSubmitted(true);
    },
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Przypomnij hasło
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Podaj email konta, a wyślemy link do ustawienia nowego hasła.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {isSubmitted ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            Jeśli konto z tym adresem istnieje, wysłaliśmy link do resetu hasła.
            Sprawdź skrzynkę pocztową.
          </div>
        ) : null}

        {globalError ? (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {globalError}
          </div>
        ) : null}

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AuthFormField
              label="Email"
              name="email"
              type="email"
              placeholder="jan@example.com"
              autoComplete="email"
              error={getFieldError('email')}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full rounded-xl text-sm font-semibold"
            >
              {isSubmitting ? 'Wysyłanie...' : 'Wyślij link resetu'}
            </Button>
          </form>
        ) : null}
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Pamiętasz hasło?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Zaloguj się
        </Link>
      </p>
    </div>
  );
}
