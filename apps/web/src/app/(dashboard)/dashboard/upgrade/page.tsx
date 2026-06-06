'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import {
  fetchPublicPlans,
  type AgencyPlanCode,
  type PublicPlan,
} from '@/lib/billing-plans';
import { isPrivateSellerUser } from '@/lib/auth';
import {
  GROWTH_UPSELLS,
  type GrowthUpsellId,
  type UpgradePlanCode,
} from '@/lib/growth-upsells';
import {
  formatPlanPrice,
  getPlanFallbackDescription,
  getPlanHighlights,
  getPriceHelper,
  type BillingInterval,
} from '@/lib/public-pricing';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const resourceLabels: Record<string, string> = {
  listings: 'limit ofert',
  clients: 'limit klientów',
  appointments: 'limit spotkań',
  images: 'limit zdjęć',
};

const priorityOptions = [
  {
    value: 'limits',
    label: 'Większe limity',
    description: 'Chcę odblokować więcej ofert, klientów, spotkań lub zdjęć.',
  },
  {
    value: 'branding',
    label: 'Branding i publiczne strony',
    description: 'Chcę profesjonalniej publikować i udostępniać oferty.',
  },
  {
    value: 'automation',
    label: 'Automatyzacje i raporty',
    description: 'Chcę szybciej obsługiwać leady i lepiej mierzyć pracę.',
  },
];

export default function UpgradePage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isPrivateSeller = user ? isPrivateSellerUser(user) : false;
  const upsellId = getUpsellId(searchParams.get('upsellId'));
  const source = searchParams.get('source') || 'upgrade_page_direct';
  const resource = searchParams.get('resource') || undefined;
  const initialPlan = getPlanCode(searchParams.get('plan'));
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlanCode>(
    initialPlan ??
      (upsellId ? GROWTH_UPSELLS[upsellId].recommendedPlan : 'professional'),
  );
  const [priority, setPriority] = useState(priorityOptions[0].value);
  const [submitted, setSubmitted] = useState(false);

  const selectedUpsell = upsellId ? GROWTH_UPSELLS[upsellId] : null;
  const currentPlanCode = user?.entitlements.plan.code as
    | AgencyPlanCode
    | undefined;

  const publicPlans = useMemo(
    () => plans.filter((plan) => plan.code !== 'custom'),
    [plans],
  );

  const contextLabel = useMemo(() => {
    if (selectedUpsell) return selectedUpsell.title;
    if (resource) return resourceLabels[resource] ?? 'upgrade planu';
    return 'upgrade planu';
  }, [resource, selectedUpsell]);

  useEffect(() => {
    let isMounted = true;

    fetchPublicPlans()
      .then((response) => {
        if (!isMounted) return;
        setPlans(response);
        setPlansError(null);
      })
      .catch((error) => {
        if (!isMounted) return;
        setPlansError(
          error instanceof Error
            ? error.message
            : 'Nie udało się pobrać planów',
        );
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlans(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function trackPlanSelection(plan: PublicPlan) {
    if (!isSelectableUpgradePlan(plan.code)) return;

    setSelectedPlan(plan.code);
    trackAnalyticsEvent({
      name: AnalyticsEventName.UPGRADE_CTA_CLICKED,
      properties: {
        source,
        upsellId,
        resource,
        selectedPlan: plan.code,
        billingInterval,
        action: 'plan_selected',
      },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackAnalyticsEvent({
      name: AnalyticsEventName.UPGRADE_CTA_CLICKED,
      properties: {
        source,
        upsellId,
        resource,
        selectedPlan,
        billingInterval,
        priority,
        action: 'upgrade_interest_submitted',
      },
    });
    setSubmitted(true);
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Plany i upgrade
              </h1>
              <Badge variant="gold">Premium</Badge>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Wybierz plan dla swojego workspace. Ceny, limity i funkcje są
              pobierane z katalogu planów zarządzanego w panelu admina.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            render={
              <Link
                href={isPrivateSeller ? '/seller' : '/dashboard/settings'}
              />
            }
          >
            <ArrowLeft className="h-4 w-4" />
            {isPrivateSeller ? 'Panel właściciela' : 'Plan i limity'}
          </Button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-xl border border-[#D4A853]/25 bg-[#FFF9E6]/45 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#B8922F] ring-1 ring-[#D4A853]/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Kontekst: {contextLabel}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Obecny plan: {user.entitlements.plan.label}. Zmiana planu na
                  tym etapie zapisuje intencję dla zespołu.
                </p>
              </div>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1">
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

      {plansError ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {plansError}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        {isLoadingPlans ? (
          <div className="col-span-full flex items-center justify-center rounded-2xl border border-border bg-white p-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ładowanie planów
          </div>
        ) : (
          publicPlans.map((plan) => {
            const isCurrent = currentPlanCode === plan.code;
            const isEnterprise = plan.code === 'enterprise';
            const isSelected = selectedPlan === plan.code;

            return (
              <article
                key={plan.code}
                className={cn(
                  'flex flex-col rounded-2xl border bg-white p-5 shadow-sm',
                  plan.code === 'professional'
                    ? 'border-[#D4A853]/50 ring-2 ring-[#D4A853]/15'
                    : 'border-border',
                  isSelected && 'border-primary ring-2 ring-primary/15',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-xl font-semibold text-foreground">
                        {plan.label}
                      </h2>
                      {isCurrent ? (
                        <Badge variant="success">Aktualny</Badge>
                      ) : null}
                      {plan.code === 'professional' ? (
                        <Badge variant="gold">Polecany</Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 min-h-[3rem] text-sm leading-6 text-muted-foreground">
                      {plan.description ?? getPlanFallbackDescription(plan)}
                    </p>
                  </div>
                  <Crown className="h-5 w-5 text-brand-gold-dark" />
                </div>

                <div className="mt-5">
                  <p className="font-heading text-2xl font-semibold text-foreground">
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
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  variant={isSelected || isCurrent ? 'default' : 'outline'}
                  className="mt-6 w-full rounded-xl"
                  disabled={isCurrent}
                  onClick={() => trackPlanSelection(plan)}
                >
                  {isCurrent
                    ? 'Aktualny plan'
                    : isEnterprise
                      ? 'Kontakt'
                      : isSelected
                        ? 'Wybrany plan'
                        : 'Wybierz plan'}
                </Button>
              </article>
            );
          })
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Co stanie się po wysłaniu?
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              Na tym etapie zapisujemy intencję upgrade i kontekst wyboru.
              Obecny plan pozostaje bez zmian, dopóki nie zostanie obsłużony
              ręcznie albo przez checkout w kolejnej iteracji.
            </p>
            <p>
              Enterprise i indywidualne warunki są obsługiwane manualnie przez
              konfigurację planu agencji w panelu admina.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Zgłoś zainteresowanie upgrade
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Zapiszemy intencję dla workspace:{' '}
                {user.agency?.name ?? user.email}.
              </p>
            </div>
            <Badge variant={submitted ? 'success' : 'outline'}>
              {submitted ? 'Wysłane' : 'MVP flow'}
            </Badge>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                Kontakt
              </span>
              <Input value={user.email} readOnly className="h-10 rounded-xl" />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">
                Wybrany plan
              </span>
              <Input
                value={
                  publicPlans.find((plan) => plan.code === selectedPlan)
                    ?.label ?? selectedPlan
                }
                readOnly
                className="h-10 rounded-xl"
              />
            </label>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-medium text-foreground">
              Najważniejszy powód upgrade
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={cn(
                    'rounded-xl border p-3 text-left transition-colors',
                    priority === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted/20 hover:bg-muted/40',
                  )}
                >
                  <span className="text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {submitted ? (
            <div className="mt-5 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] p-4 text-sm leading-6 text-[#166534]">
              Dzięki, zapisaliśmy intencję upgrade z wybranym planem i trybem
              rozliczenia.
            </div>
          ) : null}

          <Button type="submit" className="mt-5 h-10 rounded-xl">
            Zapisz intencję upgrade
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </section>
    </div>
  );
}

function getUpsellId(value: string | null): GrowthUpsellId | undefined {
  if (!value) return undefined;
  return value in GROWTH_UPSELLS ? (value as GrowthUpsellId) : undefined;
}

function getPlanCode(value: string | null): UpgradePlanCode | undefined {
  return isSelectableUpgradePlan(value) ? value : undefined;
}

function isSelectableUpgradePlan(
  value: string | null | undefined,
): value is UpgradePlanCode {
  return (
    value === 'starter' ||
    value === 'professional' ||
    value === 'enterprise'
  );
}
