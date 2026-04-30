'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Loader2,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  buildClaimAuthPath,
  verifyPublicListingSubmission,
} from '@/lib/public-listing-submissions';

type VerificationState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; claimToken: string }
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
  const token = searchParams.get('token');
  const hasVerifiedRef = useRef(false);
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

  return <VerificationShell state={state} />;
}

function VerificationShell({ state }: { state: VerificationState }) {
  return (
    <main className="min-h-screen bg-[#F7F3EA] px-4 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          EstateFlow
          <ArrowRight className="h-4 w-4" />
        </Link>

        <section className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          {state.status === 'idle' || state.status === 'loading' ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h1 className="mt-5 font-heading text-2xl font-bold">
                Potwierdzamy Twoją ofertę
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Sprawdzamy link z emaila i przygotowujemy bezpieczne przejęcie
                oferty do konta CRM.
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
                Oferta jest gotowa do przejęcia
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Załóż konto albo zaloguj się, a przypniemy ofertę do Twojego
                workspace i otworzymy ją w panelu CRM.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={buildClaimAuthPath('/register', state.claimToken)}>
                  <Button className="h-10 gap-2 rounded-xl">
                    <UserPlus className="h-4 w-4" />
                    Utwórz konto i przejmij
                  </Button>
                </Link>
                <Link href={buildClaimAuthPath('/login', state.claimToken)}>
                  <Button variant="outline" className="h-10 gap-2 rounded-xl">
                    <LogIn className="h-4 w-4" />
                    Mam już konto
                  </Button>
                </Link>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
