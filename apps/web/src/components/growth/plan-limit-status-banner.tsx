'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/lib/auth';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import { getUpgradeHref } from '@/lib/growth-upsells';

type LimitMetricKey = 'activeListings' | 'clients' | 'monthlyAppointments';
type LimitState = 'over_limit' | 'limit_reached' | 'near_limit';

interface LimitMetricConfig {
  key: LimitMetricKey;
  resource: 'listings' | 'clients' | 'appointments';
  label: string;
  noun: string;
  blockedAction: string;
  guidance: string;
}

interface LimitMetricState extends LimitMetricConfig {
  usage: number;
  limit: number;
  state: LimitState;
}

interface PlanLimitStatusBannerProps {
  user: AuthUser;
  resources?: LimitMetricKey[];
  source: string;
}

const metricConfig: Record<LimitMetricKey, LimitMetricConfig> = {
  activeListings: {
    key: 'activeListings',
    resource: 'listings',
    label: 'Oferty',
    noun: 'aktywnych ofert',
    blockedAction: 'dodawanie albo przywracanie ofert',
    guidance:
      'Zarchiwizuj nadmiarowe oferty albo przejdź na wyższy plan, żeby dalej publikować i przywracać oferty.',
  },
  clients: {
    key: 'clients',
    resource: 'clients',
    label: 'Klienci',
    noun: 'klientów',
    blockedAction: 'dodawanie i import klientów',
    guidance:
      'Możesz nadal edytować istniejących klientów. Dodawanie nowych kontaktów wymaga zejścia poniżej limitu albo wyższego planu.',
  },
  monthlyAppointments: {
    key: 'monthlyAppointments',
    resource: 'appointments',
    label: 'Spotkania',
    noun: 'spotkań w tym miesiącu',
    blockedAction: 'tworzenie i przenoszenie spotkań do tego miesiąca',
    guidance:
      'Istniejące spotkania pozostają dostępne. Nowe terminy w tym miesiącu wymagają wyższego planu albo wolnego limitu.',
  },
};

export function PlanLimitStatusBanner({
  user,
  resources,
  source,
}: PlanLimitStatusBannerProps) {
  const states = getLimitMetricStates(user, resources);

  if (states.length === 0) {
    return null;
  }

  const primaryState = states[0];
  const hasOverLimit = states.some((item) => item.state === 'over_limit');
  const hasLimitReached = states.some((item) => item.state === 'limit_reached');
  const href = getUpgradeHref({
    source,
    upsellId: 'higher-limits',
    resource: primaryState.resource,
  });

  function handleClick() {
    trackAnalyticsEvent({
      name: AnalyticsEventName.UPGRADE_CTA_CLICKED,
      properties: {
        source,
        upsellId: 'higher-limits',
        resource: primaryState.resource,
        usage: primaryState.usage,
        limit: primaryState.limit,
        state: primaryState.state,
        affectedResources: states.map((item) => item.key).join(','),
        destination: href,
      },
    });
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <Badge variant={hasOverLimit || hasLimitReached ? 'destructive' : 'warning'}>
              {hasOverLimit
                ? 'Plan poniżej użycia'
                : hasLimitReached
                  ? 'Limit osiągnięty'
                  : 'Blisko limitu'}
            </Badge>
            <span className="font-medium">
              {getBannerTitle(hasOverLimit, hasLimitReached)}
            </span>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            {states.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-amber-200/80 bg-white/60 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs">
                    {item.usage}/{item.limit}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-amber-950/75">
                  {item.state === 'near_limit'
                    ? `Zbliżasz się do limitu ${item.noun}.`
                    : `Zablokowane: ${item.blockedAction}.`}
                </p>
              </div>
            ))}
          </div>

          <p className="max-w-4xl text-xs leading-5 text-amber-950/75">
            {states.length === 1
              ? primaryState.guidance
              : 'Nie usuwamy istniejących danych. Możesz nadal pracować na obecnych rekordach, ale działania zwiększające przekroczenie limitu są blokowane po stronie API.'}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-xl bg-card"
          onClick={handleClick}
          render={<Link href={href} />}
        >
          <LockKeyhole className="h-3.5 w-3.5" />
          Zobacz plany
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}

function getLimitMetricStates(
  user: AuthUser,
  resources?: LimitMetricKey[],
): LimitMetricState[] {
  const keys = resources ?? Object.keys(metricConfig);

  return keys
    .map((key) => {
      const metricKey = key as LimitMetricKey;
      const limit = user.entitlements.limits[metricKey];
      const usage = user.usage[metricKey];

      if (limit === null || limit === undefined || limit <= 0) {
        return null;
      }

      const state = getLimitState(usage, limit);

      if (!state) {
        return null;
      }

      return {
        ...metricConfig[metricKey],
        usage,
        limit,
        state,
      };
    })
    .filter((item): item is LimitMetricState => item !== null)
    .sort((left, right) => getStateRank(right.state) - getStateRank(left.state));
}

function getLimitState(usage: number, limit: number): LimitState | null {
  if (usage > limit) {
    return 'over_limit';
  }

  if (usage === limit) {
    return 'limit_reached';
  }

  if (usage / limit >= 0.8) {
    return 'near_limit';
  }

  return null;
}

function getStateRank(state: LimitState): number {
  if (state === 'over_limit') return 3;
  if (state === 'limit_reached') return 2;
  return 1;
}

function getBannerTitle(
  hasOverLimit: boolean,
  hasLimitReached: boolean,
): string {
  if (hasOverLimit) {
    return 'Masz więcej danych niż pozwala obecny plan.';
  }

  if (hasLimitReached) {
    return 'Osiągnięto limit obecnego planu.';
  }

  return 'Zbliżasz się do limitu obecnego planu.';
}
