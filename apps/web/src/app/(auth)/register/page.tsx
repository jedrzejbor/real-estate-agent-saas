'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Home,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  getAuthenticatedRedirectPath,
  PRIVATE_SELLER_HOME_PATH,
  registerSchema,
  type RegisterFormData,
} from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchPublicPlans,
  type AgencyPlanCode,
  type PublicPlan,
} from '@/lib/billing-plans';
import {
  formatPlanPrice,
  getPlanFallbackDescription,
  getPlanHighlights,
} from '@/lib/public-pricing';
import {
  buildClaimAuthPath,
  claimPublicListingSubmission,
} from '@/lib/public-listing-submissions';
import { useAuthForm } from '@/hooks/use-auth-form';
import { Button } from '@/components/ui/button';
import { AuthFormField } from '@/components/auth/auth-form-field';
import { AuthRedirectLoading } from '@/components/auth/auth-redirect-loading';
import { cn } from '@/lib/utils';

type RegisterPlan = PublicPlan & {
  code: Exclude<AgencyPlanCode, 'custom'>;
};

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
  const initialPlan = getRegisterPlan(searchParams.get('plan'));
  const hasClaimedAuthenticatedTokenRef = useRef(false);
  const [accountType, setAccountType] = useState<'agent' | 'private_seller'>(
    claimToken ? 'private_seller' : 'agent',
  );
  const [selectedPlan, setSelectedPlan] = useState<
    Exclude<AgencyPlanCode, 'custom'>
  >(initialPlan ?? 'free');
  const [plans, setPlans] = useState<RegisterPlan[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [authenticatedClaimError, setAuthenticatedClaimError] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (claimToken || accountType !== 'agent') return;

    let isMounted = true;
    setIsLoadingPlans(true);

    fetchPublicPlans()
      .then((response) => {
        if (!isMounted) return;
        const registerPlans = response.filter(isRegisterPlan);
        setPlans(registerPlans);
        setPlansError(null);

        setSelectedPlan((currentPlan) =>
          registerPlans.length > 0 &&
          !registerPlans.some((plan) => plan.code === currentPlan)
            ? registerPlans[0].code
            : currentPlan,
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        setPlansError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, [accountType, claimToken]);

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
      <div className="rounded-2xl border border-destructive/20 bg-card p-6 text-sm text-destructive shadow-sm">
        {authenticatedClaimError}
      </div>
    ) : (
      <AuthRedirectLoading />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 text-center lg:text-left">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Utwórz konto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {claimToken
            ? 'Utwórz konto właściciela, aby zarządzać ofertą w panelu'
            : 'Wybierz, czy chcesz pracować jako agent, czy tylko opublikować ogłoszenie'}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:p-6">
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

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.85fr)]"
          noValidate
        >
          <div className="space-y-5">
            <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Typ konta
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="relative block cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="accountType"
                  value="agent"
                  defaultChecked={!claimToken}
                  disabled={Boolean(claimToken)}
                  onChange={() => setAccountType('agent')}
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

              <label className="relative block cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="radio"
                  name="accountType"
                  value="private_seller"
                  defaultChecked={Boolean(claimToken)}
                  onChange={() => setAccountType('private_seller')}
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

            {accountType === 'agent' && !claimToken ? (
              <div>
              <input type="hidden" name="selectedPlan" value={selectedPlan} />
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">
                  Pakiet startowy
                </p>
                <Link
                  href="/cennik"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Porównaj plany
                </Link>
              </div>

              {plansError ? (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {plansError}
                </div>
              ) : null}

              {isLoadingPlans ? (
                <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ładowanie planów
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {plans.map((plan) => (
                    <button
                      key={plan.code}
                      type="button"
                      onClick={() => setSelectedPlan(plan.code)}
                      className={cn(
                        'flex min-h-[220px] flex-col rounded-xl border p-4 text-left transition-colors',
                        selectedPlan === plan.code
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:bg-muted/30',
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block text-sm font-semibold text-foreground">
                            {plan.label}
                          </span>
                          <span className="mt-1 block min-h-[3.75rem] text-xs leading-5 text-muted-foreground">
                            {plan.description ??
                              getPlanFallbackDescription(plan)}
                          </span>
                        </span>
                        {selectedPlan === plan.code ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                        ) : null}
                      </span>
                      <span className="mt-3 block font-heading text-xl font-semibold text-foreground">
                        {formatPlanPrice(plan, 'monthly')}
                      </span>
                      <ul className="mt-3 space-y-1.5 text-xs leading-5 text-muted-foreground">
                        {getPlanHighlights(plan)
                          .slice(0, 3)
                          .map((highlight) => (
                            <li key={highlight} className="flex gap-1.5">
                              <span className="text-primary">•</span>
                              <span>{highlight}</span>
                            </li>
                          ))}
                      </ul>
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Płatności Stripe wdrożymy w kolejnym etapie. Teraz wybór
                pakietu ustawia konfigurację startową workspace.
              </p>
              {getFieldError('selectedPlan') ? (
                <p className="mt-2 text-xs text-destructive">
                  {getFieldError('selectedPlan')}
                </p>
              ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4 lg:self-start">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Dane konta
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Tymi danymi będziesz logować się do EstateFlow.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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
          </div>
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
    </div>
  );
}

function getRegisterPlan(
  value: string | null,
): Exclude<AgencyPlanCode, 'custom'> | undefined {
  return isRegisterPlanCode(value) ? value : undefined;
}

function isRegisterPlan(plan: PublicPlan): plan is RegisterPlan {
  return isRegisterPlanCode(plan.code);
}

function isRegisterPlanCode(
  value: string | null | undefined,
): value is Exclude<AgencyPlanCode, 'custom'> {
  return (
    value === 'free' ||
    value === 'starter' ||
    value === 'professional' ||
    value === 'enterprise'
  );
}
