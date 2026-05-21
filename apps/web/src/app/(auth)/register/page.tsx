'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Home } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  getAuthenticatedRedirectPath,
  PRIVATE_SELLER_HOME_PATH,
  registerSchema,
  type RegisterFormData,
} from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  buildClaimAuthPath,
  claimPublicListingSubmission,
} from '@/lib/public-listing-submissions';
import { useAuthForm } from '@/hooks/use-auth-form';
import { Button } from '@/components/ui/button';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthRedirectLoading } from '@/components/auth/auth-redirect-loading';

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register, user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimToken = searchParams.get('claimToken');
  const hasClaimedAuthenticatedTokenRef = useRef(false);
  const [authenticatedClaimError, setAuthenticatedClaimError] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (isAuthLoading || !user) return;

    if (claimToken) {
      if (hasClaimedAuthenticatedTokenRef.current) return;

      hasClaimedAuthenticatedTokenRef.current = true;
      claimPublicListingSubmission(claimToken)
        .then(() => router.replace(PRIVATE_SELLER_HOME_PATH))
        .catch((error) => {
          setAuthenticatedClaimError(getApiErrorMessage(error));
        });
      return;
    }

    router.replace(getAuthenticatedRedirectPath(user));
  }, [claimToken, isAuthLoading, router, user]);

  const {
    handleSubmit,
    getFieldError,
    globalError,
    isLoading: isSubmitting,
  } = useAuthForm<typeof registerSchema>({
    schema: registerSchema,
    onSubmit: async (data: RegisterFormData) => {
      if (claimToken) {
        hasClaimedAuthenticatedTokenRef.current = true;
        await register(
          { ...data, accountType: 'private_seller' },
          { skipRedirect: true },
        );
        try {
          await claimPublicListingSubmission(claimToken);
        } catch (error) {
          setAuthenticatedClaimError(getApiErrorMessage(error));
          return;
        }
        router.push(PRIVATE_SELLER_HOME_PATH);
        return;
      }

      await register(data, {
        redirectTo:
          data.accountType === 'private_seller'
            ? PRIVATE_SELLER_HOME_PATH
            : undefined,
      });
    },
  });

  if (isAuthLoading || user) {
    return authenticatedClaimError ? (
      <div className="rounded-2xl border border-destructive/20 bg-white p-6 text-sm text-destructive shadow-sm">
        {authenticatedClaimError}
      </div>
    ) : (
      <AuthRedirectLoading />
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Utwórz konto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {claimToken
            ? 'Utwórz konto właściciela, aby zarządzać ofertą w panelu'
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
                  defaultChecked={!claimToken}
                  disabled={Boolean(claimToken)}
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
                  defaultChecked={Boolean(claimToken)}
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
                Zweryfikowana oferta zostanie automatycznie przypisana do
                konta właściciela.
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
            disabled={isSubmitting}
            className="h-10 w-full rounded-xl text-sm font-semibold"
          >
            {isSubmitting ? 'Tworzenie konta…' : 'Zarejestruj się'}
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
