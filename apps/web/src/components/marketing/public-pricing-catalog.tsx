'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { ListingProductPreviewCard } from '@/components/listing-products/listing-product-preview-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchPublicPlans, type PublicPlan } from '@/lib/billing-plans';
import { APP_CONTACT_EMAIL, APP_NAME } from '@/lib/brand';
import {
  AnalyticsEventName,
  trackPublicPricingEvent,
} from '@/lib/analytics';
import {
  fetchPublicListingProducts,
  formatListingProductPrice,
  LISTING_PRODUCT_TYPE_LABELS,
  type PublicListingProduct,
} from '@/lib/listing-products';
import {
  buildPricingAudienceHref,
  parsePricingAudience,
  PricingAudience,
  type PricingAudience as PricingAudienceValue,
} from '@/lib/pricing-audience';
import {
  formatPlanPrice,
  getPlanFallbackDescription,
  getPlanHighlights,
  getPriceHelper,
  type BillingInterval,
} from '@/lib/public-pricing';
import { cn } from '@/lib/utils';

type PricingSurface = 'home' | 'full';

interface CatalogState<T> {
  data: T[];
  error: string | null;
  isLoading: boolean;
}

const EMPTY_CATALOG_STATE = {
  data: [],
  error: null,
  isLoading: true,
};

export function PublicPricingCatalog({ surface }: { surface: PricingSurface }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const audience = parsePricingAudience(searchParams.get('dla'));
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('monthly');
  const [plans, setPlans] =
    useState<CatalogState<PublicPlan>>(EMPTY_CATALOG_STATE);
  const [products, setProducts] =
    useState<CatalogState<PublicListingProduct>>(EMPTY_CATALOG_STATE);
  const [plansReloadToken, setPlansReloadToken] = useState(0);
  const [productsReloadToken, setProductsReloadToken] = useState(0);
  const trackedPrivateViews = useRef(new Set<string>());

  useEffect(() => {
    let isMounted = true;
    fetchPublicPlans()
      .then((data) => {
        if (isMounted) setPlans({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setPlans((current) => ({
          ...current,
          error: toErrorMessage(error, 'Nie udało się pobrać planów dla agentów'),
          isLoading: false,
        }));
      });
    return () => {
      isMounted = false;
    };
  }, [plansReloadToken]);

  useEffect(() => {
    let isMounted = true;
    fetchPublicListingProducts()
      .then((data) => {
        if (isMounted) setProducts({ data, error: null, isLoading: false });
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setProducts((current) => ({
          ...current,
          error: toErrorMessage(
            error,
            'Nie udało się pobrać produktów ogłoszeniowych',
          ),
          isLoading: false,
        }));
      });
    return () => {
      isMounted = false;
    };
  }, [productsReloadToken]);

  useEffect(() => {
    if (
      audience !== PricingAudience.PRIVATE ||
      products.isLoading ||
      products.error
    ) {
      return;
    }
    const viewKey = `${surface}:${pathname}`;
    if (trackedPrivateViews.current.has(viewKey)) return;
    trackedPrivateViews.current.add(viewKey);
    trackPublicPricingEvent({
      name: AnalyticsEventName.PRIVATE_PRICING_VIEWED,
      properties: { surface, productsCount: products.data.length },
    });
  }, [audience, pathname, products.data.length, products.error, products.isLoading, surface]);

  function selectAudience(nextAudience: PricingAudienceValue) {
    if (nextAudience === audience) return;
    const href = buildPricingAudienceHref({
      pathname,
      searchParams,
      audience: nextAudience,
      ...(surface === 'home' ? { hash: 'pricing' } : {}),
    });
    window.history.pushState(null, '', href);
    trackPublicPricingEvent({
      name: AnalyticsEventName.PRICING_AUDIENCE_SELECTED,
      properties: { audience: nextAudience, surface },
    });
  }

  return (
    <div className={surface === 'home' ? 'pt-4' : ''}>
      <div className="mx-auto mb-6 flex max-w-5xl flex-col items-center gap-4">
        <PricingAudienceSwitch audience={audience} onChange={selectAudience} />
        {audience === PricingAudience.AGENT ? (
          <BillingIntervalSwitch
            value={billingInterval}
            onChange={setBillingInterval}
          />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Jednorazowa opłata — bez abonamentu.
          </p>
        )}
      </div>

      {audience === PricingAudience.PRIVATE ? (
        <PrivatePricing
          state={products}
          surface={surface}
          onRetry={() => {
            setProducts((current) => ({
              ...current,
              isLoading: true,
              error: null,
            }));
            setProductsReloadToken((current) => current + 1);
          }}
        />
      ) : (
        <AgentPricing
          state={plans}
          surface={surface}
          billingInterval={billingInterval}
          onRetry={() => {
            setPlans((current) => ({
              ...current,
              isLoading: true,
              error: null,
            }));
            setPlansReloadToken((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

function PricingAudienceSwitch({
  audience,
  onChange,
}: {
  audience: PricingAudienceValue;
  onChange: (audience: PricingAudienceValue) => void;
}) {
  return (
    <div
      className="grid w-full max-w-2xl grid-cols-1 rounded-2xl border border-border bg-card p-1 sm:grid-cols-2"
      aria-label="Wybierz rodzaj cennika"
    >
      <button
        type="button"
        aria-pressed={audience === PricingAudience.PRIVATE}
        onClick={() => onChange(PricingAudience.PRIVATE)}
        className={cn(
          'rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
          audience === PricingAudience.PRIVATE
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        Sprzedaję prywatnie
      </button>
      <button
        type="button"
        aria-pressed={audience === PricingAudience.AGENT}
        onClick={() => onChange(PricingAudience.AGENT)}
        className={cn(
          'rounded-xl px-4 py-3 text-sm font-semibold transition-colors',
          audience === PricingAudience.AGENT
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        Jestem agentem lub prowadzę biuro
      </button>
    </div>
  );
}

function BillingIntervalSwitch({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
}) {
  return (
    <div
      className="inline-flex rounded-full border border-border bg-card p-1"
      aria-label="Okres rozliczenia"
    >
      {(['monthly', 'yearly'] as const).map((interval) => (
        <button
          key={interval}
          type="button"
          aria-pressed={value === interval}
          onClick={() => onChange(interval)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
            value === interval
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {interval === 'monthly' ? 'Miesięcznie' : 'Rocznie'}
        </button>
      ))}
    </div>
  );
}

function PrivatePricing({
  state,
  surface,
  onRetry,
}: {
  state: CatalogState<PublicListingProduct>;
  surface: PricingSurface;
  onRetry: () => void;
}) {
  if (state.error) {
    return (
      <CatalogError
        message={state.error}
        note="Cennik dla agentów pozostaje dostępny w drugim wariancie."
        onRetry={onRetry}
      />
    );
  }
  if (state.isLoading) return <CatalogLoading label="Ładowanie cen ogłoszeń" />;
  if (state.data.length === 0) {
    return (
      <CatalogEmpty message="Cennik ogłoszeń prywatnych nie jest jeszcze publicznie dostępny. Wróć wkrótce albo sprawdź ofertę dla agentów." />
    );
  }

  const publications = state.data.filter((product) => product.type === 'publication');
  const additions = state.data.filter((product) => product.type !== 'publication');

  if (surface === 'home') {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,420px)_1fr]">
          <div>
            {publications[0] ? (
              <ListingProductPreviewCard
                product={publications[0]}
                cta={{
                  label: 'Dodaj ogłoszenie',
                  href: '/dodaj-oferte',
                  onClick: () => trackProductSelection(publications[0]!, surface),
                }}
              />
            ) : (
              <CatalogEmpty message="Brak aktywnego produktu publikacji." />
            )}
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <Badge variant="gold">Zwiększ widoczność</Badge>
            <h3 className="mt-4 font-heading text-2xl font-semibold">
              Dodatki wybierzesz po akceptacji ogłoszenia
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Najpierw bezpłatnie dodajesz ofertę i przechodzisz moderację.
              Dopiero potem wybierasz publikację oraz dostępne dodatki.
            </p>
            <div className="mt-5 space-y-3">
              {additions.map((product) => (
                <div
                  key={product.code}
                  className="flex flex-col gap-2 rounded-2xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {LISTING_PRODUCT_TYPE_LABELS[product.type]} · {product.durationDays} dni
                    </p>
                  </div>
                  <strong className="text-lg text-foreground">
                    {formatListingProductPrice(product.priceGrossAmount, product.currency)}
                  </strong>
                </div>
              ))}
              {additions.length === 0 ? (
                <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                  Aktualnie brak publicznych dodatków.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <PricingBenefits />
        <div className="mt-8 text-center">
          <Link
            href="/cennik?dla=prywatnych"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Zobacz pełny cennik i zasady
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {state.data.map((product) => (
          <ListingProductPreviewCard
            key={product.code}
            product={product}
            cta={
              product.type === 'publication'
                ? {
                    label: 'Dodaj ogłoszenie',
                    href: '/dodaj-oferte',
                    onClick: () => trackProductSelection(product, surface),
                  }
                : undefined
            }
          />
        ))}
      </div>
      <PricingBenefits />
      <PrivatePricingProcess />
      <PrivatePricingFaq />
    </>
  );
}

function AgentPricing({
  state,
  surface,
  billingInterval,
  onRetry,
}: {
  state: CatalogState<PublicPlan>;
  surface: PricingSurface;
  billingInterval: BillingInterval;
  onRetry: () => void;
}) {
  if (state.error) {
    return (
      <CatalogError
        message={state.error}
        note="Cennik dla osób prywatnych pozostaje dostępny w pierwszym wariancie."
        onRetry={onRetry}
      />
    );
  }
  if (state.isLoading) return <CatalogLoading label="Ładowanie planów" />;
  const publicPlans = state.data.filter((plan) => plan.code !== 'custom');
  if (publicPlans.length === 0) {
    return <CatalogEmpty message="Aktualnie nie ma publicznych planów dla agentów." />;
  }

  return (
    <div className="mx-auto grid max-w-7xl items-stretch gap-5 lg:grid-cols-2 xl:grid-cols-4">
      {publicPlans.map((plan) => (
        <AgentPricingCard
          key={plan.code}
          plan={plan}
          billingInterval={billingInterval}
        />
      ))}
      {surface === 'home' ? (
        <div className="text-center lg:col-span-2 xl:col-span-4">
          <Link
            href="/cennik?dla=agentow"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Zobacz pełny cennik dla agentów
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function AgentPricingCard({
  plan,
  billingInterval,
}: {
  plan: PublicPlan;
  billingInterval: BillingInterval;
}) {
  const isPopular = plan.code === 'professional';
  const isEnterprise = plan.code === 'enterprise';
  const enterpriseHref = `mailto:${APP_CONTACT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} Enterprise`)}`;

  return (
    <article
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm',
        isPopular ? 'border-primary ring-2 ring-primary/10' : 'border-border',
      )}
    >
      {isPopular ? (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Najpopularniejszy
        </Badge>
      ) : null}
      <h3 className="font-heading text-xl font-semibold">{plan.label}</h3>
      <p className="mt-2 min-h-14 text-sm leading-6 text-muted-foreground">
        {plan.description ?? getPlanFallbackDescription(plan)}
      </p>
      <p className="mt-4 font-heading text-3xl font-bold">
        {formatPlanPrice(plan, billingInterval)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {getPriceHelper(plan, billingInterval)}
      </p>
      <ul className="mt-5 flex-1 space-y-3">
        {getPlanHighlights(plan).map((highlight) => (
          <li key={highlight} className="flex gap-2 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {highlight}
          </li>
        ))}
      </ul>
      <Button
        className="mt-6 h-10 rounded-xl"
        variant={isPopular ? 'default' : 'outline'}
        render={
          <Link
            href={
              isEnterprise
                ? enterpriseHref
                : `/register?plan=${plan.code}&billing=${billingInterval}`
            }
          />
        }
      >
        {isEnterprise ? 'Porozmawiajmy' : 'Wybierz plan'}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </article>
  );
}

function PricingBenefits() {
  const benefits = [
    'Publiczna strona oferty i galeria zdjęć',
    'Zapytania od zainteresowanych w jednym miejscu',
    'Panel właściciela do zarządzania ogłoszeniem',
    'Możliwość rozpoczęcia współpracy z agentem',
  ];
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {benefits.map((benefit) => (
        <div key={benefit} className="flex gap-2 rounded-xl bg-card p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" />
          {benefit}
        </div>
      ))}
    </div>
  );
}

function PrivatePricingProcess() {
  const steps = [
    'Dodaj ofertę bez opłaty',
    'Potwierdź e-mail i przejdź moderację',
    'Po akceptacji wybierz produkty',
    'Opłać zamówienie, aby uruchomić publikację',
  ];
  return (
    <section className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="font-heading text-2xl font-semibold">Jak działa publikacja</h2>
      </div>
      <ol className="mt-6 grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step} className="rounded-2xl bg-muted/50 p-4 text-sm">
            <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
        Nie pobieramy opłaty przed pozytywną moderacją. Aktualna cena jest
        ponownie pobierana z backendu podczas tworzenia zamówienia.
      </p>
    </section>
  );
}

function PrivatePricingFaq() {
  const items = [
    ['Kiedy płacę?', 'Dopiero po zaakceptowaniu ogłoszenia przez moderatora i przed jego publikacją.'],
    ['Co, jeśli oferta zostanie odrzucona?', 'Nie powstaje płatne zamówienie i opłata nie jest pobierana.'],
    ['Czy mogę przedłużyć ogłoszenie?', 'Tak, jeśli w aktualnym katalogu dostępny jest produkt odnowienia.'],
    ['Gdzie podam kod promocyjny?', 'W podsumowaniu zamówienia, gdzie od razu zobaczysz naliczony rabat.'],
    ['Czy otrzymam dokument sprzedaży?', 'Dostępny typ dokumentu i wymagane dane pokażemy przed płatnością po zakończeniu weryfikacji księgowej.'],
    ['Jak będą działały zwroty?', 'Szczegółowe zasady odstąpienia i zwrotów zostaną pokazane przed zakupem po zatwierdzeniu regulaminu usługi.'],
  ];
  return (
    <section className="mt-10">
      <h2 className="font-heading text-2xl font-semibold">Najczęstsze pytania</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map(([question, answer]) => (
          <article key={question} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-semibold">{question}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/dodaj-oferte" />} className="rounded-xl">
          Dodaj ogłoszenie
        </Button>
        <Button variant="outline" render={<Link href="/zasady-publikacji" />} className="rounded-xl">
          Zasady publikacji
        </Button>
      </div>
    </section>
  );
}

function CatalogLoading({ label }: { label: string }) {
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-center rounded-2xl border border-border bg-card p-10 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function CatalogError({
  message,
  note,
  onRetry,
}: {
  message: string;
  note: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl border border-destructive/25 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">{message}</p>
          <p className="mt-1 text-muted-foreground">{note}</p>
        </div>
      </div>
      <Button variant="outline" className="gap-2 rounded-xl" onClick={onRetry}>
        <RotateCcw className="h-4 w-4" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}

function CatalogEmpty({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function trackProductSelection(
  product: PublicListingProduct,
  surface: PricingSurface,
) {
  trackPublicPricingEvent({
    name: AnalyticsEventName.LISTING_PRODUCT_SELECTED,
    properties: { productCode: product.code, productType: product.type, surface },
  });
}

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
