import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PublicPricingCatalog } from '@/components/marketing/public-pricing-catalog';
import { Badge } from '@/components/ui/badge';
import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Cennik publikacji i narzędzi | ${APP_NAME}`,
  description:
    'Aktualne ceny publikacji ogłoszeń dla osób prywatnych oraz plany dla agentów i biur nieruchomości.',
};

export default function PricingPage() {
  return (
    <div className="bg-muted">
      <section className="mx-auto flex min-h-[38vh] max-w-7xl flex-col justify-end px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="gold">Cennik</Badge>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
            Prosty cennik, niezależnie jak sprzedajesz
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Opublikuj pojedyncze ogłoszenie lub wybierz narzędzia dla agenta i
            biura. Wszystkie ceny są pobierane z aktualnego katalogu.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-muted">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Suspense fallback={<PricingFallback />}>
            <PublicPricingCatalog surface="full" />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

function PricingFallback() {
  return (
    <div className="h-64 animate-pulse rounded-2xl border border-border bg-card" />
  );
}
