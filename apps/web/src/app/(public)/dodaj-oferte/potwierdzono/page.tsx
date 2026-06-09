'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Loader2,
  LogIn,
  Search,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { isPrivateSellerUser, PRIVATE_SELLER_HOME_PATH } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  buildClaimAuthPath,
  claimPublicListingSubmission,
  verifyPublicListingSubmission,
} from '@/lib/public-listing-submissions';

type VerificationState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; claimToken: string }
  | { status: 'claiming' }
  | { status: 'error'; message: string };

export default function PublicListingSubmissionConfirmedPage() {
  return (
    <Suspense fallback={<VerificationShell state={{ status: 'loading' }} />}>
      <VerificationContent />
    </Suspense>
  );
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { success: showSuccessToast } = useToast();
  const token = searchParams.get('token');
  const hasVerifiedRef = useRef(false);
  const hasClaimedRef = useRef(false);
  const [state, setState] = useState<VerificationState>(() =>
    token
      ? { status: 'loading' }
      : {
          status: 'error',
          message: 'Link weryfikacyjny jest niepełny albo wygasł.',
        },
  );

  useEffect(() => {
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    if (!token) {
      return;
    }

    verifyPublicListingSubmission(token)
      .then((result) =>
        setState({ status: 'success', claimToken: result.claimToken }),
      )
      .catch((error) =>
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Nie udało się potwierdzić zgłoszenia.',
        }),
      );
  }, [token]);

  useEffect(() => {
    if (
      state.status !== 'success' ||
      isAuthLoading ||
      !user ||
      !isPrivateSellerUser(user) ||
      hasClaimedRef.current
    ) {
      return;
    }

    hasClaimedRef.current = true;
    const claimingStateTimer = window.setTimeout(
      () => setState({ status: 'claiming' }),
      0,
    );

    claimPublicListingSubmission(state.claimToken)
      .then((result) => {
        showSuccessToast({
          title: result.reviewRequired
            ? 'Oferta czeka na sprawdzenie'
            : 'Oferta została dodana',
          description:
            'Przenieśliśmy ją do panelu właściciela. Status publikacji zobaczysz na liście ogłoszeń.',
          duration: 6000,
        });
        router.replace(PRIVATE_SELLER_HOME_PATH);
      })
      .catch((error) => {
        hasClaimedRef.current = false;
        setState({
          status: 'error',
          message: getApiErrorMessage(error),
        });
      });

    return () => window.clearTimeout(claimingStateTimer);
  }, [isAuthLoading, router, showSuccessToast, state, user]);

  return <VerificationShell state={state} />;
}

function VerificationShell({ state }: { state: VerificationState }) {
  const { user } = useAuth();
  const isPrivateSeller = Boolean(user && isPrivateSellerUser(user));

  return (
    <main className="min-h-screen bg-muted px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          EstateFlow
          <ArrowRight className="h-4 w-4" />
        </Link>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {state.status === 'idle' ||
          state.status === 'loading' ||
          state.status === 'claiming' ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h1 className="mt-5 font-heading text-2xl font-bold">
                {state.status === 'claiming'
                  ? 'Dodajemy ofertę do panelu'
                  : 'Potwierdzamy Twoją ofertę'}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {state.status === 'claiming'
                  ? 'Łączymy zweryfikowane zgłoszenie z Twoim kontem właściciela i za chwilę przejdziemy do panelu.'
                  : 'Sprawdzamy link z emaila i przygotowujemy bezpieczne przejęcie oferty do konta.'}
              </p>
            </div>
          ) : null}

          {state.status === 'error' ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="rounded-full bg-destructive/10 p-3 text-destructive">
                <CircleAlert className="h-8 w-8" />
              </div>
              <h1 className="mt-5 font-heading text-2xl font-bold">
                Nie udało się potwierdzić oferty
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {state.message}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href="/">
                  <Button variant="outline" className="h-10 rounded-xl">
                    Wróć na start
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="h-10 rounded-xl">Strona główna</Button>
                </Link>
              </div>
            </div>
          ) : null}

          {state.status === 'success' ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="mt-5 font-heading text-2xl font-bold">
                {isPrivateSeller
                  ? 'Oferta została potwierdzona'
                  : 'Oferta jest gotowa do przejęcia'}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                {isPrivateSeller
                  ? 'Zgłoszenie jest przypisane do Twojego konta. W panelu właściciela zobaczysz jego aktualny status i kolejne kroki publikacji.'
                  : 'Załóż konto albo zaloguj się, a przypniemy ofertę do Twojego workspace i otworzymy ją w panelu CRM. Jeśli oferta przejdzie automatyczną kontrolę, po przejęciu będzie mogła pojawić się w publicznym katalogu; w przeciwnym razie poczeka na sprawdzenie przed publikacją.'}
              </p>
              {isPrivateSeller ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Link href="/seller">
                    <Button className="h-10 w-full rounded-xl">
                      Przejdź do panelu
                    </Button>
                  </Link>
                  <Link href="/dodaj-oferte">
                    <Button
                      variant="outline"
                      className="h-10 w-full rounded-xl"
                    >
                      Dodaj kolejną ofertę
                    </Button>
                  </Link>
                  <Link href="/oferty">
                    <Button
                      variant="outline"
                      className="h-10 w-full gap-2 rounded-xl"
                    >
                      <Search className="h-4 w-4" />
                      Katalog ofert
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Link
                    href={buildClaimAuthPath('/register', state.claimToken)}
                  >
                    <Button className="h-10 w-full gap-2 rounded-xl">
                      <UserPlus className="h-4 w-4" />
                      Utwórz konto i przejmij
                    </Button>
                  </Link>
                  <Link href={buildClaimAuthPath('/login', state.claimToken)}>
                    <Button
                      variant="outline"
                      className="h-10 w-full gap-2 rounded-xl"
                    >
                      <LogIn className="h-4 w-4" />
                      Mam już konto
                    </Button>
                  </Link>
                  <Link href="/oferty">
                    <Button
                      variant="outline"
                      className="h-10 w-full gap-2 rounded-xl"
                    >
                      <Search className="h-4 w-4" />
                      Katalog ofert
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
