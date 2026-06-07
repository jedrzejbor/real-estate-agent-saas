'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchPublicPlans, type PublicPlan } from '@/lib/billing-plans';
import {
  formatPlanPrice,
  getPlanFallbackDescription,
  getPlanHighlights,
  getPriceHelper,
  type BillingInterval,
} from '@/lib/public-pricing';
import { cn } from '@/lib/utils';

export function HomePricingSection() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const publicPlans = useMemo(
    () => plans.filter((plan) => plan.code !== 'custom'),
    [plans],
  );

  useEffect(() => {
    let isMounted = true;

    fetchPublicPlans()
      .then((response) => {
        if (!isMounted) return;
        setPlans(response);
        setError(null);
      })
      .catch((fetchError) => {
        if (!isMounted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Nie udało się pobrać aktualnego cennika',
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="pt-8">
      <div className="mx-auto mb-6 flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[#78716C]">
          Ceny i funkcje są pobierane z katalogu planów.
        </div>
        <div className="inline-flex w-fit rounded-full border border-[#E7E5E4] bg-white p-1">
          <button
            type="button"
            onClick={() => setBillingInterval('monthly')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              billingInterval === 'monthly'
                ? 'bg-primary text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]',
            )}
          >
            Miesięcznie
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval('yearly')}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              billingInterval === 'yearly'
                ? 'bg-primary text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917]',
            )}
          >
            Rocznie
          </button>
        </div>
      </div>

      {error ? (
        <div className="mx-auto mb-6 flex max-w-5xl items-center gap-2 rounded-xl border border-destructive/25 bg-white p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-2xl border border-[#E7E5E4] bg-white p-10 text-sm text-[#78716C]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Ładowanie cennika
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl items-stretch gap-6 lg:grid-cols-4">
          {publicPlans.map((plan) => (
            <HomePricingCard
              key={plan.code}
              plan={plan}
              billingInterval={billingInterval}
            />
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/cennik"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-[#047857]"
        >
          Zobacz pełny cennik
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function HomePricingCard({
  plan,
  billingInterval,
}: {
  plan: PublicPlan;
  billingInterval: BillingInterval;
}) {
  const isPopular = plan.code === 'professional';
  const isEnterprise = plan.code === 'enterprise';

  return (
    <article
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all',
        isPopular
          ? 'border-primary shadow-[0_10px_25px_-5px_rgba(28,25,23,0.1)]'
          : 'border-[#E7E5E4]',
      )}
    >
      {isPopular ? (
        <Badge className="absolute -top-[14px] left-1/2 -translate-x-1/2 whitespace-nowrap bg-primary px-3 py-1 text-white shadow-sm">
          Najpopularniejszy
        </Badge>
      ) : null}

      <div className="text-center">
        <h3 className="font-heading text-lg font-semibold text-[#1C1917]">
          {plan.label}
        </h3>
        <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-[#78716C]">
          {plan.description ?? getPlanFallbackDescription(plan)}
        </p>
        <div className="mt-4">
          <span className="font-heading text-4xl font-bold text-[#1C1917]">
            {formatPlanPrice(plan, billingInterval)}
          </span>
          <span className="mt-1 block text-sm text-[#78716C]">
            {getPriceHelper(plan, billingInterval)}
          </span>
        </div>
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {getPlanHighlights(plan).map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="text-[#44403C]">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        className={cn(
          'mt-6 h-10 w-full rounded-full',
          isPopular
            ? 'bg-primary text-white hover:bg-[#047857]'
            : 'border-[#E7E5E4] bg-white text-[#1C1917] hover:bg-[#F5F0EB]',
        )}
        variant={isPopular ? 'default' : 'outline'}
        render={
          <Link
            href={
              isEnterprise
                ? 'mailto:kontakt@estateflow.pl?subject=EstateFlow%20Enterprise'
                : `/register?plan=${plan.code}&billing=${billingInterval}`
            }
          />
        }
      >
        {isEnterprise ? 'Porozmawiajmy' : 'Wybierz plan'}
      </Button>
    </article>
  );
}
