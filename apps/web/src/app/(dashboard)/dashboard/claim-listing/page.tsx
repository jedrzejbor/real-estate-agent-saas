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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import {
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
          title: 'Oferta przejęta',
          description: 'Dodaliśmy ją do Twojego CRM i opublikowaliśmy stronę.',
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
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-primary">Publiczna oferta</p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-foreground">
          Przejmij ofertę i zacznij używać CRM
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Połączymy zweryfikowane zgłoszenie z Twoim workspace, a potem
          przejdziesz prosto do szczegółów oferty.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {state.status === 'idle' || state.status === 'loading' ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="mt-5 font-heading text-xl font-semibold">
              Przejmujemy ofertę
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Tworzymy ofertę w CRM, podpinamy ją do Twojego konta i
              przygotowujemy publiczny link.
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
            <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 font-heading text-xl font-semibold">
              Oferta jest w Twoim CRM
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Możesz uzupełnić dane, dodać zdjęcia, obsługiwać leady i wrócić do
              publicznego linku w panelu publikacji.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href={`/dashboard/listings/${state.result.listingId}`}>
                <Button className="h-10 gap-2 rounded-xl">
                  Otwórz ofertę w CRM
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {state.result.publicSlug ? (
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
