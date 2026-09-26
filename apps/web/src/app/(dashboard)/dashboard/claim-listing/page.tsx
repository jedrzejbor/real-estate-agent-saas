'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { isPrivateSellerUser } from '@/lib/auth';
import {
  buildSellerListingPath,
  claimPublicListingSubmission,
  type PublicListingSubmissionClaimResult,
} from '@/lib/public-listing-submissions';

type ClaimState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; result: PublicListingSubmissionClaimResult }
  | { status: 'error'; message: string };

export default function ClaimListingPage() {
  return (
    <Suspense fallback={<ClaimListingShell state={{ status: 'loading' }} />}>
      <ClaimListingContent />
    </Suspense>
  );
}

function ClaimListingContent() {
  const searchParams = useSearchParams();
  const claimToken = searchParams.get('claimToken');
  const hasClaimedRef = useRef(false);
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [state, setState] = useState<ClaimState>(() =>
    claimToken
      ? { status: 'loading' }
      : {
          status: 'error',
          message: 'Brakuje tokenu przejęcia oferty.',
        },
  );

  useEffect(() => {
    if (hasClaimedRef.current) return;
    hasClaimedRef.current = true;

    if (!claimToken) {
      return;
    }

    claimPublicListingSubmission(claimToken)
      .then((result) => {
        setState({ status: 'success', result });
        showSuccessToast({
          title: result.reviewRequired
            ? 'Oferta przejęta jako szkic'
            : 'Oferta przejęta',
          description: result.reviewRequired
            ? 'Dodaliśmy ją do panelu. Wymaga sprawdzenia przed wyborem publikacji.'
            : 'Dodaliśmy ją do panelu. Wybierz pakiet publikacji, aby pokazać ją w katalogu.',
          duration: 6000,
        });
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : 'Nie udało się przejąć oferty.';

        setState({ status: 'error', message });
        showErrorToast({
          title: 'Nie udało się przejąć oferty',
          description: message,
          duration: 7000,
        });
      });
  }, [claimToken, showErrorToast, showSuccessToast]);

  return <ClaimListingShell state={state} />;
}

function ClaimListingShell({ state }: { state: ClaimState }) {
  const { user } = useAuth();
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const claimedListingHref =
    state.status === 'success'
      ? isPrivateSeller
        ? buildSellerListingPath(state.result.id)
        : `/dashboard/listings/${state.result.listingId}`
      : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Publiczna oferta</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-foreground">
          Przejmij ofertę i zacznij używać CRM
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Połączymy zweryfikowane zgłoszenie z Twoim kontem, a potem pokażemy
          następny krok: weryfikację, wybór pakietu albo obsługę oferty.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {state.status === 'idle' || state.status === 'loading' ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="mt-5 font-heading text-xl font-semibold">
              Przejmujemy ofertę
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Tworzymy ofertę, podpinamy ją do Twojego konta i sprawdzamy, czy
              może przejść do wyboru pakietu publikacji.
            </p>
          </div>
        ) : null}

        {state.status === 'error' ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <CircleAlert className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-heading text-xl font-semibold">
              Oferta nie została przejęta
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {state.message}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 rounded-xl"
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="h-4 w-4" />
                Spróbuj ponownie
              </Button>
              <Link href="/dashboard/listings">
                <Button className="h-10 gap-2 rounded-xl">
                  <Building2 className="h-4 w-4" />
                  Oferty w CRM
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        {state.status === 'success' ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div
              className={
                state.result.reviewRequired
                  ? 'rounded-full bg-amber-100 p-3 text-amber-700'
                  : 'rounded-full bg-status-success-bg p-3 text-status-success'
              }
            >
              {state.result.reviewRequired ? (
                <ShieldAlert className="h-8 w-8" />
              ) : (
                <CheckCircle2 className="h-8 w-8" />
              )}
            </div>
            <h2 className="mt-5 font-heading text-xl font-semibold">
              {state.result.reviewRequired
                ? 'Oferta czeka na sprawdzenie'
                : 'Oferta jest gotowa do kolejnego kroku'}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {state.result.reviewRequired
                ? 'Dodaliśmy ją jako szkic. Po sprawdzeniu zobaczysz w panelu kolejny krok publikacji.'
                : 'Możesz sprawdzić dane i przejść do wyboru pakietu publikacji. Oferta nie jest publiczna przed opłaceniem albo grantem administratora.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={claimedListingHref ?? '/seller'}>
                <Button className="h-10 gap-2 rounded-xl">
                  {isPrivateSeller
                    ? 'Otwórz ofertę w panelu'
                    : 'Otwórz ofertę w CRM'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {state.result.publicSlug && !isPrivateSeller ? (
                <Link href={`/oferty/${state.result.publicSlug}`}>
                  <Button variant="outline" className="h-10 gap-2 rounded-xl">
                    Publiczna strona
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
