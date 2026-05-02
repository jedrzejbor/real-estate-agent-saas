'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import {
  GROWTH_UPSELLS,
  type GrowthUpsellId,
  type UpgradePlanCode,
} from '@/lib/growth-upsells';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

interface UpgradePlan {
  code: UpgradePlanCode;
  name: string;
  priceLabel: string;
  description: string;
  bestFor: string;
  features: string[];
  highlighted?: boolean;
}

const upgradePlans: UpgradePlan[] = [
  {
    code: 'starter',
    name: 'Starter',
    priceLabel: '49 PLN / mies.',
    description:
      'Większe limity dla solo agentów i pierwszego realnego pipeline.',
    bestFor: 'Gdy Free zaczyna blokować nowe oferty, klientów albo spotkania.',
    features: [
      'Do 25 aktywnych ofert',
      'Więcej klientów i spotkań miesięcznie',
      'Większy limit zdjęć oferty',
      'Podstawowe publiczne strony ofert',
    ],
  },
  {
    code: 'professional',
    name: 'Professional',
    priceLabel: '149 PLN / mies.',
    description:
      'Growth i raportowanie dla agentów, którzy aktywnie publikują oferty.',
    bestFor: 'Gdy chcesz mocniej używać publicznych ofert, leadów i raportów.',
    highlighted: true,
    features: [
      'Własny branding publicznych stron',
      'Rozbudowane profile agentów i biur',
      'Raport spotkań i głębsza analityka',
      'Automatyzacje po leadzie',
    ],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Wycena indywidualna',
    description:
      'Dla większych zespołów, white-label i wdrożeń z własnymi zasadami.',
    bestFor:
      'Gdy potrzebujesz wielu użytkowników, własnej domeny albo wsparcia wdrożeniowego.',
    features: [
      'Nielimitowane lub indywidualne limity',
      'White-label i własna domena',
      'Zaawansowane role i workspace zespołowy',
      'Dedykowany rollout i wsparcie',
    ],
  },
];

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
  const upsellId = getUpsellId(searchParams.get('upsellId'));
  const source = searchParams.get('source') || 'upgrade_page_direct';
  const resource = searchParams.get('resource') || undefined;
  const initialPlan = getPlanCode(searchParams.get('plan'));
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlanCode>(
    initialPlan ??
      (upsellId ? GROWTH_UPSELLS[upsellId].recommendedPlan : 'professional'),
  );
  const [priority, setPriority] = useState(priorityOptions[0].value);
  const [submitted, setSubmitted] = useState(false);

  const selectedUpsell = upsellId ? GROWTH_UPSELLS[upsellId] : null;
  const contextLabel = useMemo(() => {
    if (selectedUpsell) return selectedUpsell.title;
    if (resource) return resourceLabels[resource] ?? 'upgrade planu';
    return 'upgrade planu';
  }, [resource, selectedUpsell]);

  function trackPlanSelection(plan: UpgradePlanCode) {
    setSelectedPlan(plan);
    trackAnalyticsEvent({
      name: AnalyticsEventName.UPGRADE_CTA_CLICKED,
      properties: {
        source,
        upsellId,
        resource,
        selectedPlan: plan,
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
              Wybierz kolejny krok dla EstateFlow. Ten ekran zbiera intencję
              upgrade i jasno pokazuje, co odblokowuje wyższy plan, zanim
              wdrożymy pełny checkout self-service.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            render={<Link href="/dashboard/settings" />}
          >
            <ArrowLeft className="h-4 w-4" />
            Plan i limity
          </Button>
        </div>

        <div className="mt-5 rounded-xl border border-[#D4A853]/25 bg-[#FFF9E6]/45 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#B8922F] ring-1 ring-[#D4A853]/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Kontekst: {contextLabel}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Kliknięcie upgrade zapisujemy jako `upgrade_cta_clicked` z
                informacją o źródle, upsellu, zasobie limitu i wybranym planie.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {upgradePlans.map((plan) => (
          <article
            key={plan.code}
            className={cn(
              'flex flex-col rounded-2xl border bg-white p-5 shadow-sm',
              plan.highlighted
                ? 'border-[#D4A853]/50 ring-2 ring-[#D4A853]/15'
                : 'border-border',
              selectedPlan === plan.code &&
                'border-primary ring-2 ring-primary/15',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading text-xl font-semibold text-foreground">
                    {plan.name}
                  </h2>
                  {plan.highlighted ? (
                    <Badge variant="gold">Rekomendowany</Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <Crown className="h-5 w-5 text-brand-gold-dark" />
            </div>

            <p className="mt-5 font-heading text-2xl font-semibold text-foreground">
              {plan.priceLabel}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {plan.bestFor}
            </p>

            <ul className="mt-5 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant={selectedPlan === plan.code ? 'default' : 'outline'}
              className="mt-6 w-full rounded-xl"
              onClick={() => trackPlanSelection(plan.code)}
            >
              {selectedPlan === plan.code ? 'Wybrany plan' : 'Wybierz plan'}
            </Button>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Co stanie się po wysłaniu?
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              Na tym etapie nie uruchamiamy automatycznego billing engine.
              Zapisujemy intencję upgrade w analityce produktu, żeby zespół mógł
              ręcznie skontaktować się z workspace i potwierdzić właściwy plan.
            </p>
            <p>
              Do czasu wdrożenia checkoutu obecny plan pozostaje bez zmian, a
              istniejące dane nie są ukrywane ani usuwane.
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
                  upgradePlans.find((plan) => plan.code === selectedPlan)
                    ?.name ?? ''
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
              Dzięki, zapisaliśmy intencję upgrade. To wystarczy dla MVP: event
              zawiera źródło, plan, priorytet i kontekst kliknięcia.
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
  if (
    value === 'starter' ||
    value === 'professional' ||
    value === 'enterprise'
  ) {
    return value;
  }

  return undefined;
}
