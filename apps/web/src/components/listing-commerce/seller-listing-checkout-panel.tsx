'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-client';
import { getListingEntitlementLifecycle } from '@/lib/listing-entitlement-lifecycle';
import {
  canStartListingCheckout,
  createListingCheckoutSession,
  createListingOrder,
  createListingQuote,
  fetchListingEntitlementsForListing,
  fetchListingOrdersForListing,
  findCurrentPayableOrder,
  isListingOrderPaid,
  isStripeCheckoutUrl,
  type ListingOrder,
  type ListingEntitlement,
  type ListingQuote,
} from '@/lib/listing-checkout';
import {
  fetchPublicListingProducts,
  formatListingProductPrice,
  ListingProductType,
  type PublicListingProduct,
} from '@/lib/listing-products';

interface SellerListingCheckoutPanelProps {
  listingId: string;
  ownerName: string;
  isPublished: boolean;
  isExpired: boolean;
}

export function SellerListingCheckoutPanel({
  listingId,
  ownerName,
  isPublished,
  isExpired,
}: SellerListingCheckoutPanelProps) {
  const [products, setProducts] = useState<PublicListingProduct[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [quote, setQuote] = useState<ListingQuote | null>(null);
  const [orders, setOrders] = useState<ListingOrder[]>([]);
  const [entitlements, setEntitlements] = useState<ListingEntitlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const loadCheckout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [availableProducts, orderHistory, lifecycle] = await Promise.all([
        fetchPublicListingProducts(),
        fetchListingOrdersForListing(listingId),
        fetchListingEntitlementsForListing(listingId),
      ]);

      setProducts(availableProducts);
      setOrders(orderHistory);
      setEntitlements(lifecycle);
      setSelectedCode(
        (current) =>
          current ||
          getDefaultProductCode(availableProducts, isPublished, isExpired) ||
          '',
      );
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setIsLoading(false);
    }
  }, [isExpired, isPublished, listingId]);

  useEffect(() => {
    void loadCheckout();
  }, [loadCheckout]);

  const payableOrder = findCurrentPayableOrder(orders);
  const hasActivePublication = entitlements.some(
    (entitlement) => entitlement.type === 'publication',
  );
  const hasActiveFeatured = entitlements.some(
    (entitlement) => entitlement.type === 'featured',
  );
  const purchasableProducts = products.filter((product) => {
    if (product.type === ListingProductType.PUBLICATION) {
      return !hasActivePublication && !isPublished;
    }
    if (product.type === ListingProductType.RENEWAL) {
      return isPublished || isExpired || hasActivePublication;
    }
    return isPublished && !isExpired && !hasActiveFeatured;
  });
  const hasCompletedPublication = orders.some(
    (order) =>
      isListingOrderPaid(order) &&
      order.items.some(
        (item) => item.productType === ListingProductType.PUBLICATION,
      ),
  );
  const summary = payableOrder?.pricingSnapshot ?? quote;
  const lifecycle = getListingEntitlementLifecycle(entitlements);

  useEffect(() => {
    if (payableOrder || !purchasableProducts.length) return;
    if (purchasableProducts.some((product) => product.code === selectedCode)) {
      return;
    }
    setSelectedCode(
      getDefaultProductCode(purchasableProducts, isPublished, isExpired) ??
        purchasableProducts[0].code,
    );
  }, [isExpired, isPublished, payableOrder, purchasableProducts, selectedCode]);

  useEffect(() => {
    if (isLoading || payableOrder || !selectedCode) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setIsQuoting(true);
    setError(null);

    createListingQuote(listingId, [{ productCode: selectedCode, quantity: 1 }])
      .then((result) => {
        if (!cancelled) setQuote(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(getApiErrorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setIsQuoting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoading, listingId, payableOrder, selectedCode]);

  async function startPayment() {
    if (!selectedCode && !payableOrder) return;

    setIsStartingPayment(true);
    setError(null);

    try {
      let order = payableOrder;

      if (!order) {
        idempotencyKeyRef.current ??= `listing-checkout:${crypto.randomUUID()}`;
        order = await createListingOrder(
          listingId,
          [{ productCode: selectedCode, quantity: 1 }],
          {
            countryCode: 'PL',
            buyerType: 'consumer',
            ...(ownerName.trim() ? { fullName: ownerName.trim() } : {}),
          },
          idempotencyKeyRef.current,
        );
        setOrders((current) => [order!, ...current]);
      }

      if (isListingOrderPaid(order) || !order.requiresPayment) {
        await loadCheckout();
        return;
      }

      const session = await createListingCheckoutSession(order.id);
      if (!isStripeCheckoutUrl(session.checkoutUrl)) {
        throw new Error(
          'Operator płatności zwrócił nieprawidłowy adres przekierowania.',
        );
      }

      window.location.assign(session.checkoutUrl);
    } catch (cause) {
      setError(getApiErrorMessage(cause));
      await refreshOrdersSilently();
    } finally {
      setIsStartingPayment(false);
    }
  }

  async function refreshOrdersSilently() {
    try {
      setOrders(await fetchListingOrdersForListing(listingId));
    } catch {
      // The original checkout error is more useful than a secondary refresh error.
    }
  }

  if (isLoading) {
    return (
      <CheckoutShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Przygotowujemy podsumowanie…
        </div>
      </CheckoutShell>
    );
  }

  if (!purchasableProducts.length && !payableOrder) {
    return (
      <CheckoutShell>
        <p className="text-sm leading-6 text-muted-foreground">
          Obecnie nie ma aktywnego wariantu publikacji. Wróć później lub
          skontaktuj się z obsługą.
        </p>
        {error ? (
          <CheckoutError message={error} onRetry={loadCheckout} />
        ) : null}
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <p className="text-sm leading-6 text-muted-foreground">
        Wybierz usługę dla ogłoszenia. Aktualny status jest weryfikowany przez
        serwer.
      </p>

      {hasCompletedPublication ? (
        <div className="mt-3 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Publikacja została opłacona. Możesz dokupić odnowienie lub
            wyróżnienie.
          </p>
        </div>
      ) : null}

      <EntitlementLifecycleSummary lifecycle={lifecycle} />

      {!payableOrder && purchasableProducts.length > 1 ? (
        <fieldset className="mt-4 grid gap-2">
          <legend className="sr-only">Wariant publikacji</legend>
          {purchasableProducts.map((product) => (
            <label
              key={product.code}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="publication-product"
                value={product.code}
                checked={selectedCode === product.code}
                onChange={() => setSelectedCode(product.code)}
                className="mt-1"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {product.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {product.durationDays} dni ·{' '}
                  {formatListingProductPrice(
                    product.priceGrossAmount,
                    product.currency,
                  )}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
        {isQuoting || !summary ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Przeliczamy cenę…
          </div>
        ) : (
          <>
            {summary.items.map((item) => (
              <div
                key={item.productCode}
                className="flex justify-between gap-3 text-sm"
              >
                <span>
                  {item.productName}
                  <span className="block text-xs text-muted-foreground">
                    {item.durationDays} dni
                  </span>
                </span>
                <span className="font-medium">
                  {formatListingProductPrice(
                    item.totalGrossAmount,
                    summary.currency,
                  )}
                </span>
              </div>
            ))}
            {summary.discountGrossAmount > 0 ? (
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm text-emerald-700 dark:text-emerald-300">
                <span>Rabat</span>
                <span>
                  −
                  {formatListingProductPrice(
                    summary.discountGrossAmount,
                    summary.currency,
                  )}
                </span>
              </div>
            ) : null}
            <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
              <span className="text-sm font-semibold">Razem brutto</span>
              <span className="text-xl font-bold">
                {formatListingProductPrice(
                  summary.totalGrossAmount,
                  summary.currency,
                )}
              </span>
            </div>
          </>
        )}
      </div>

      {payableOrder?.status === 'payment_failed' ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          Poprzednia próba nie powiodła się. Możesz bezpiecznie ponowić
          płatność.
        </p>
      ) : null}

      {error ? <CheckoutError message={error} onRetry={loadCheckout} /> : null}

      <button
        type="button"
        disabled={
          isStartingPayment ||
          isQuoting ||
          !summary ||
          (payableOrder !== null && !canStartListingCheckout(payableOrder))
        }
        onClick={startPayment}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isStartingPayment ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="h-4 w-4" />
        )}
        {payableOrder ? 'Przejdź do płatności' : 'Zamawiam i płacę'}
      </button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Cena i rabaty są potwierdzane przez serwer przed płatnością.
      </p>

      <OrderHistory orders={orders} />
    </CheckoutShell>
  );
}

function EntitlementLifecycleSummary({
  lifecycle,
}: {
  lifecycle: ReturnType<typeof getListingEntitlementLifecycle>;
}) {
  const items: ReactNode[] = [];

  if (lifecycle.activePublication) {
    items.push(
      <LifecycleNotice
        key="active-publication"
        tone={lifecycle.publicationEndsSoon ? 'warning' : 'success'}
        icon={lifecycle.publicationEndsSoon ? AlertTriangle : CalendarClock}
        title={
          lifecycle.publicationEndsSoon
            ? 'Publikacja kończy się niedługo'
            : 'Publikacja jest aktywna'
        }
        description={
          lifecycle.publicationEndsSoon
            ? `Zostało ${formatDays(lifecycle.publicationDaysRemaining)}. Możesz już kupić odnowienie, żeby ogłoszenie nie zniknęło z portalu.`
            : `Ogłoszenie jest widoczne do ${formatDate(lifecycle.activePublication.endsAt)}.`
        }
      />,
    );
  }

  if (lifecycle.scheduledPublication) {
    items.push(
      <LifecycleNotice
        key="scheduled-publication"
        tone="info"
        icon={CalendarClock}
        title="Odnowienie jest zaplanowane"
        description={`Kolejny okres publikacji startuje ${formatDate(lifecycle.scheduledPublication.startsAt)} i potrwa do ${formatDate(lifecycle.scheduledPublication.endsAt)}.`}
      />,
    );
  }

  if (lifecycle.activeFeatured) {
    items.push(
      <LifecycleNotice
        key="active-featured"
        tone={lifecycle.featuredEndsSoon ? 'warning' : 'success'}
        icon={lifecycle.featuredEndsSoon ? AlertTriangle : CheckCircle2}
        title={
          lifecycle.featuredEndsSoon
            ? 'Wyróżnienie kończy się niedługo'
            : 'Wyróżnienie jest aktywne'
        }
        description={
          lifecycle.featuredEndsSoon
            ? `Zostało ${formatDays(lifecycle.featuredDaysRemaining)} wyróżnienia. Po tym czasie oferta wróci do zwykłej kolejności.`
            : `Oferta jest wyróżniona do ${formatDate(lifecycle.activeFeatured.endsAt)}.`
        }
      />,
    );
  }

  if (lifecycle.scheduledFeatured) {
    items.push(
      <LifecycleNotice
        key="scheduled-featured"
        tone="info"
        icon={CalendarClock}
        title="Kolejne wyróżnienie jest zaplanowane"
        description={`Startuje ${formatDate(lifecycle.scheduledFeatured.startsAt)} i potrwa do ${formatDate(lifecycle.scheduledFeatured.endsAt)}.`}
      />,
    );
  }

  if (!items.length) return null;

  return <div className="mt-4 grid gap-2">{items}</div>;
}

function LifecycleNotice({
  tone,
  icon: Icon,
  title,
  description,
}: {
  tone: 'info' | 'success' | 'warning';
  icon: typeof CalendarClock;
  title: string;
  description: string;
}) {
  const toneClassName = {
    info: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  }[tone];

  return (
    <div
      className={`flex items-start gap-3 rounded-xl p-3 text-sm ${toneClassName}`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-6">{description}</p>
      </div>
    </div>
  );
}

function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">
          Usługi ogłoszenia
        </h2>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CheckoutError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void | Promise<void>;
}) {
  return (
    <div className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
      <p>{message}</p>
      <button
        type="button"
        onClick={() => void onRetry()}
        className="mt-2 font-semibold underline"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}

function getDefaultProductCode(
  products: PublicListingProduct[],
  isPublished: boolean,
  isExpired: boolean,
): string | null {
  const preferredType =
    isPublished && !isExpired
      ? ListingProductType.FEATURED
      : isPublished || isExpired
        ? ListingProductType.RENEWAL
        : ListingProductType.PUBLICATION;
  return (
    products.find((product) => product.type === preferredType)?.code ?? null
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDays(value: number | null): string {
  const days = value ?? 0;
  if (days === 1) return '1 dzień';
  return `${days} dni`;
}

function OrderHistory({ orders }: { orders: ListingOrder[] }) {
  if (!orders.length) return null;

  return (
    <details className="mt-5 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Historia płatności
      </summary>
      <div className="mt-3 grid gap-2">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl bg-muted/40 p-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{order.orderNumber}</span>
              <span>
                {formatListingProductPrice(
                  order.totalGrossAmount,
                  order.currency,
                )}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDateTime(order.createdAt)} ·{' '}
              {ORDER_STATUS_LABELS[order.status]}
            </div>
            {order.paymentAttempts.length ? (
              <ul className="mt-2 space-y-1 border-t border-border pt-2 text-muted-foreground">
                {order.paymentAttempts.map((attempt) => (
                  <li key={attempt.id}>
                    Próba {attempt.attemptNumber}:{' '}
                    {ATTEMPT_STATUS_LABELS[attempt.status]}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </details>
  );
}

const ORDER_STATUS_LABELS: Record<ListingOrder['status'], string> = {
  draft: 'utworzone',
  pending_payment: 'oczekuje na płatność',
  paid: 'opłacone',
  payment_failed: 'płatność nieudana',
  expired: 'wygasło',
  cancelled: 'anulowane',
  partially_refunded: 'częściowy zwrot',
  refunded: 'zwrócone',
};

const ATTEMPT_STATUS_LABELS: Record<
  ListingOrder['paymentAttempts'][number]['status'],
  string
> = {
  creating: 'przygotowywana',
  pending: 'oczekuje',
  succeeded: 'zakończona',
  failed: 'nieudana',
  expired: 'wygasła',
  cancelled: 'anulowana',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
