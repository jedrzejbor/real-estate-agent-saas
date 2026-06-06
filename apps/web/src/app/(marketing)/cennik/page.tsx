'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
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

export default function PricingPage() {
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
            : 'Nie udało się pobrać cennika',
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
    <div className="bg-[#F7F3EA]">
      <section className="mx-auto flex min-h-[42vh] max-w-7xl flex-col justify-end px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="gold">Cennik</Badge>
          <h1 className="mt-4 font-heading text-4xl font-bold tracking-normal text-foreground sm:text-5xl">
            EstateFlow
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
            Plany dla agentów i biur nieruchomości, które chcą prowadzić CRM,
            publikować oferty i kontrolować pracę bez ręcznej konfiguracji w
            kodzie.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Wybierz plan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ceny, limity i funkcje są pobierane z aktualnego katalogu planów.
            </p>
          </div>

          <div className="inline-flex w-fit rounded-xl border border-border bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                billingInterval === 'monthly'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Miesięcznie
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('yearly')}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                billingInterval === 'yearly'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Rocznie
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/25 bg-white p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-white p-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ładowanie cennika
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-4">
            {publicPlans.map((plan) => {
              const isEnterprise = plan.code === 'enterprise';

              return (
                <article
                  key={plan.code}
                  className={cn(
                    'flex flex-col rounded-2xl border bg-white p-5 shadow-sm',
                    plan.code === 'professional'
                      ? 'border-[#D4A853]/50 ring-2 ring-[#D4A853]/15'
                      : 'border-border',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-xl font-semibold text-foreground">
                      {plan.label}
                    </h3>
                    {plan.code === 'professional' ? (
                      <Badge variant="gold">Polecany</Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 min-h-[3rem] text-sm leading-6 text-muted-foreground">
                    {plan.description ?? getPlanFallbackDescription(plan)}
                  </p>

                  <div className="mt-5">
                    <p className="font-heading text-3xl font-semibold text-foreground">
                      {formatPlanPrice(plan, billingInterval)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getPriceHelper(plan, billingInterval)}
                    </p>
                  </div>

                  <ul className="mt-5 flex-1 space-y-3">
                    {getPlanHighlights(plan).map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="mt-6 h-10 rounded-xl"
                    variant={plan.code === 'professional' ? 'default' : 'outline'}
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
                    {isEnterprise ? 'Porozmawiajmy' : 'Rozpocznij'}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
