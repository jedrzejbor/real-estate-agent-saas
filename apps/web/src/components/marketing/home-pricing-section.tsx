import { Suspense } from 'react';
import { PublicPricingCatalog } from './public-pricing-catalog';

export function HomePricingSection() {
  return (
    <Suspense fallback={<HomePricingFallback />}>
      <PublicPricingCatalog surface="home" />
    </Suspense>
  );
}

function HomePricingFallback() {
  return (
    <div className="mx-auto h-56 max-w-5xl animate-pulse rounded-2xl border border-border bg-card" />
  );
}
