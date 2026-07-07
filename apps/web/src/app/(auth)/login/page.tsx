'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  getAuthenticatedRedirectPath,
  loginSchema,
  type LoginFormData,
} from '@/lib/auth';
import {
  buildClaimAuthPath,
  buildClaimRedirectPath,
} from '@/lib/public-listing-submissions';
import { useAuthForm } from '@/hooks/use-auth-form';
import { Button } from '@/components/ui/button';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthRedirectLoading } from '@/components/auth/auth-redirect-loading';
import { APP_NAME } from '@/lib/brand';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimToken = searchParams.get('claimToken');
  const claimRedirectPath = claimToken
    ? buildClaimRedirectPath(claimToken)
    : undefined;

  useEffect(() => {
    if (isAuthLoading || !user) return;

    router.replace(getAuthenticatedRedirectPath(user, claimRedirectPath));
  }, [claimRedirectPath, isAuthLoading, router, user]);

  const {
    handleSubmit,
    getFieldError,
    globalError,
    isLoading: isSubmitting,
  } = useAuthForm<typeof loginSchema>({
    schema: loginSchema,
    onSubmit: async (data: LoginFormData) => {
      await login(data, { redirectTo: claimRedirectPath });
    },
  });

  if (isAuthLoading || user) {
    return <AuthRedirectLoading />;
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Witaj ponownie
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {claimToken
            ? 'Zaloguj się, aby przejąć ofertę i dokończyć ją w CRM'
            : `Zaloguj się do swojego konta ${APP_NAME}`}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {claimToken && (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            Po logowaniu automatycznie przypniemy zweryfikowaną ofertę do
            Twojego workspace.
          </div>
        )}

        {globalError && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AuthFormField
            label="Email"
            name="email"
            type="email"
            placeholder="jan@example.com"
            autoComplete="email"
            error={getFieldError('email')}
          />

          <AuthFormField
            label="Hasło"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={getFieldError('password')}
          />

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Nie pamiętasz hasła?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full rounded-xl text-sm font-semibold"
          >
            {isSubmitting ? 'Logowanie…' : 'Zaloguj się'}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Nie masz konta?{' '}
        <Link
          href={
            claimToken
              ? buildClaimAuthPath('/register', claimToken)
              : '/register'
          }
          className="font-medium text-primary hover:underline"
        >
          Zarejestruj się
        </Link>
      </p>
    </div>
  );
}
