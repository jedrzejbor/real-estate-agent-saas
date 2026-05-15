'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building2, Home } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { registerSchema, type RegisterFormData } from '@/lib/auth';
import {
  buildClaimAuthPath,
  buildClaimRedirectPath,
} from '@/lib/public-listing-submissions';
import { useAuthForm } from '@/hooks/use-auth-form';
import { Button } from '@/components/ui/button';
import { AuthFormField } from '@/components/auth/auth-form-field';

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const searchParams = useSearchParams();
  const claimToken = searchParams.get('claimToken');
  const claimRedirectPath = claimToken
    ? buildClaimRedirectPath(claimToken)
    : undefined;

  const { handleSubmit, getFieldError, globalError, isLoading } = useAuthForm<
    typeof registerSchema
  >({
    schema: registerSchema,
    onSubmit: async (data: RegisterFormData) => {
      await register(data, {
        redirectTo:
          claimRedirectPath ??
          (data.accountType === 'private_seller'
            ? '/dodaj-oferte'
            : undefined),
      });
    },
  });

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Utwórz konto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {claimToken
            ? 'Utwórz konto, aby przejąć ofertę i zacząć pracę w CRM'
            : 'Wybierz, czy chcesz pracować jako agent, czy tylko opublikować ogłoszenie'}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {claimToken && (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
            Oferta jest już zweryfikowana. Po rejestracji automatycznie dodamy
            ją do Twojego panelu.
          </div>
        )}

        {globalError && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Typ konta
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="relative block cursor-pointer rounded-xl border border-border bg-white p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="accountType"
                  value="agent"
                  defaultChecked
                  className="peer sr-only"
                />
                <span className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      Konto agenta
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      CRM, klienci, spotkania i zarządzanie wieloma ofertami.
                    </span>
                  </span>
                </span>
              </label>

              <label className="relative block cursor-pointer rounded-xl border border-border bg-white p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="accountType"
                  value="private_seller"
                  disabled={Boolean(claimToken)}
                  className="peer sr-only"
                />
                <span className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Home className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">
                      Tylko ogłoszenie
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Dla właściciela, który chce dodać pojedynczą ofertę.
                    </span>
                  </span>
                </span>
              </label>
            </div>
            {claimToken ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Przejęcie zweryfikowanej oferty wymaga konta agenta.
              </p>
            ) : null}
            {getFieldError('accountType') ? (
              <p className="mt-2 text-xs text-destructive">
                {getFieldError('accountType')}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <AuthFormField
              label="Imię"
              name="firstName"
              type="text"
              placeholder="Jan"
              autoComplete="given-name"
              error={getFieldError('firstName')}
            />
            <AuthFormField
              label="Nazwisko"
              name="lastName"
              type="text"
              placeholder="Kowalski"
              autoComplete="family-name"
              error={getFieldError('lastName')}
            />
          </div>

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
            placeholder="Min. 8 znaków, wielka litera, cyfra"
            autoComplete="new-password"
            error={getFieldError('password')}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="h-10 w-full rounded-xl text-sm font-semibold"
          >
            {isLoading ? 'Tworzenie konta…' : 'Zarejestruj się'}
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Masz już konto?{' '}
        <Link
          href={
            claimToken ? buildClaimAuthPath('/login', claimToken) : '/login'
          }
          className="font-medium text-primary hover:underline"
        >
          Zaloguj się
        </Link>
      </p>
    </>
  );
}
