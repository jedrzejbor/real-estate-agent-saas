'use client';

import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import { getUpgradeHref } from '@/lib/growth-upsells';

type LimitResource = 'listings' | 'clients' | 'appointments' | 'images';

const resourceLabels: Record<LimitResource, string> = {
  listings: 'Oferty',
  clients: 'Klienci',
  appointments: 'Spotkania',
  images: 'Zdjęcia',
};

interface LimitUpgradeBannerProps {
  resource: LimitResource;
  usage: number;
  limit: number | null;
  exceeded: boolean;
  source: string;
}

export function LimitUpgradeBanner({
  resource,
  usage,
  limit,
  exceeded,
  source,
}: LimitUpgradeBannerProps) {
  const href = getUpgradeHref({
    source,
    upsellId: 'higher-limits',
    resource,
  });
  const label = resourceLabels[resource];

  function handleClick() {
    trackAnalyticsEvent({
      name: AnalyticsEventName.UPGRADE_CTA_CLICKED,
      properties: {
        source,
        upsellId: 'higher-limits',
        resource,
        usage,
        limit,
        state: exceeded ? 'limit_reached' : 'limit_warning',
        destination: href,
      },
    });
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={exceeded ? 'destructive' : 'warning'}>
              {exceeded ? 'Limit osiągnięty' : 'Zbliżasz się do limitu'}
            </Badge>
            <span>
              {label}: {usage}
              {limit !== null ? `/${limit}` : ''}
            </span>
          </div>
          <p className="max-w-2xl text-xs leading-5 text-amber-900/80">
            {exceeded
              ? 'Tworzenie nowych rekordów jest blokowane przez limit planu Free. Wyższy plan odblokuje większą skalę pracy bez usuwania istniejących danych.'
              : 'To dobry moment, żeby zaplanować upgrade zanim create flow zacznie blokować kolejne działania.'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-xl bg-white"
          onClick={handleClick}
          render={<Link href={href} />}
        >
          <LockKeyhole className="h-3.5 w-3.5" />
          Zobacz plany
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
