'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { useAuth } from '@/contexts/auth-context';
import { AGENT_DASHBOARD_PATH, isPrivateSellerUser } from '@/lib/auth';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchListingOrder,
  isListingOrderPaid,
  type ListingOrder,
} from '@/lib/listing-checkout';
import { formatListingProductPrice } from '@/lib/listing-products';

const MAX_CONFIRMATION_ATTEMPTS = 10;
const CONFIRMATION_INTERVAL_MS = 1_500;

interface SellerPaymentReturnProps {
  outcome: 'success' | 'cancel';
}

type ReturnState =
  | 'loading'
  | 'confirming'
  | 'confirmed'
  | 'cancelled'
  | 'delayed'
  | 'error';

export function SellerPaymentReturn({ outcome }: SellerPaymentReturnProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const orderId = searchParams.get('orderId')?.trim() ?? '';
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const [state, setState] = useState<ReturnState>('loading');
  const [order, setOrder] = useState<ListingOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshSequence, setRefreshSequence] = useState(0);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!isPrivateSeller) router.replace(AGENT_DASHBOARD_PATH);
  }, [isAuthLoading, isPrivateSeller, router, user]);

  const refresh = useCallback(() => {
    setRefreshSequence((current) => current + 1);
  }, []);

  useEffect(() => {
    if (isAuthLoading || !user || !isPrivateSeller) return;
    if (!orderId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function checkOrder() {
      if (cancelled) return;
      setError(null);

      try {
        const currentOrder = await fetchListingOrder(orderId);
        if (cancelled) return;
        setOrder(currentOrder);

        if (isListingOrderPaid(currentOrder)) {
          setState('confirmed');
          return;
        }

        if (outcome === 'cancel') {
          setState('cancelled');
          return;
        }

        attempts += 1;
        if (attempts >= MAX_CONFIRMATION_ATTEMPTS) {
          setState('delayed');
          return;
        }

        setState('confirming');
        timer = setTimeout(() => void checkOrder(), CONFIRMATION_INTERVAL_MS);
      } catch (cause) {
        if (cancelled) return;
        setError(getApiErrorMessage(cause));
        setState('error');
      }
    }

    void checkOrder();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isAuthLoading, isPrivateSeller, orderId, outcome, refreshSequence, user]);

  if (isAuthLoading || !user || !isPrivateSeller) {
    return <FullPageLoader />;
  }

  const effectiveState = orderId ? state : 'error';
  const displayedError = orderId
    ? error
    : 'Brakuje identyfikatora zamówienia. Wróć do panelu i sprawdź historię płatności.';
  const content = getReturnContent(effectiveState);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center px-5 py-4 sm:px-8">
          <Link href="/seller" aria-label="Przejdź do panelu właściciela">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-16 sm:px-8">
        <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
          <ReturnIcon state={effectiveState} />
          <h1 className="mt-5 font-heading text-2xl font-bold">{content.title}</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {content.description}
          </p>

          {order ? (
            <dl className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-left text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Zamówienie</dt>
                <dd className="mt-1 font-semibold">{order.orderNumber}</dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-muted-foreground">Kwota brutto</dt>
                <dd className="mt-1 font-semibold">
                  {formatListingProductPrice(order.totalGrossAmount, order.currency)}
                </dd>
              </div>
            </dl>
          ) : null}

          {displayedError ? (
            <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {displayedError}
            </p>
          ) : null}

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {(effectiveState === 'delayed' || effectiveState === 'error') && orderId ? (
              <button
                type="button"
                onClick={refresh}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-4 w-4" />
                Sprawdź ponownie
              </button>
            ) : null}
            <Link
              href="/seller"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted sm:col-start-2"
            >
              Wróć do panelu
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function ReturnIcon({ state }: { state: ReturnState }) {
  if (state === 'confirmed') {
    return (
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>
    );
  }

  if (state === 'cancelled' || state === 'error') {
    return (
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
        <XCircle className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
      {state === 'delayed' ? <Clock3 className="h-8 w-8" /> : <Loader2 className="h-8 w-8 animate-spin" />}
    </div>
  );
}

function getReturnContent(state: ReturnState): {
  title: string;
  description: string;
} {
  switch (state) {
    case 'confirmed':
      return {
        title: 'Płatność potwierdzona',
        description: 'Zamówienie zostało opłacone. Publikacja ogłoszenia jest realizowana automatycznie.',
      };
    case 'cancelled':
      return {
        title: 'Płatność nie została dokończona',
        description: 'Nie pobraliśmy potwierdzenia zapłaty. Możesz wrócić do ogłoszenia i ponowić płatność.',
      };
    case 'delayed':
      return {
        title: 'Płatność jest nadal przetwarzana',
        description: 'Potwierdzenie operatora może dotrzeć z opóźnieniem. Nie płać ponownie, dopóki status zamówienia się nie zaktualizuje.',
      };
    case 'error':
      return {
        title: 'Nie udało się sprawdzić płatności',
        description: 'Nie oznacza to, że płatność się nie powiodła. Spróbuj ponownie lub sprawdź historię w panelu.',
      };
    case 'loading':
    case 'confirming':
      return {
        title: 'Potwierdzamy płatność',
        description: 'Czekamy na bezpieczne potwierdzenie operatora. Nie zamykaj jeszcze tej strony.',
      };
  }
}

function FullPageLoader() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </main>
  );
}
