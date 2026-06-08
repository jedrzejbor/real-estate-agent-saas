'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  resetPassword,
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/lib/auth';
import { useAuthForm } from '@/hooks/use-auth-form';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [isCompleted, setIsCompleted] = useState(false);
  const {
    handleSubmit,
    getFieldError,
    globalError,
    isLoading: isSubmitting,
  } = useAuthForm<typeof resetPasswordSchema>({
    schema: resetPasswordSchema,
    onSubmit: async (data: ResetPasswordFormData) => {
      await resetPassword(data);
      setIsCompleted(true);
    },
  });

  const isTokenMissing = !token;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Ustaw nowe hasło
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Podaj nowe hasło dwa razy, aby potwierdzić zmianę.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {isTokenMissing ? (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Link resetu hasła jest nieprawidłowy albo niekompletny.
          </div>
        ) : null}

        {isCompleted ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-950">
            Hasło zostało zmienione. Możesz zalogować się nowym hasłem.
          </div>
        ) : null}

        {globalError ? (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {globalError}
          </div>
        ) : null}

        {!isCompleted && !isTokenMissing ? (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <input type="hidden" name="token" value={token} readOnly />
            <AuthFormField
              label="Nowe hasło"
              name="newPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={getFieldError('newPassword')}
            />
            <AuthFormField
              label="Powtórz nowe hasło"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={getFieldError('confirmPassword')}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 w-full rounded-xl text-sm font-semibold"
            >
              {isSubmitting ? 'Zapisywanie...' : 'Zmień hasło'}
            </Button>
          </form>
        ) : null}
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Wróć do logowania
        </Link>
      </p>
    </div>
  );
}
