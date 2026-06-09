'use client';

import Link from 'next/link';
import { Crown, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import { getUpgradeHref, type GrowthUpsell } from '@/lib/growth-upsells';
import { cn } from '@/lib/utils';

interface GrowthUpsellCardProps {
  upsell: GrowthUpsell;
  source: string;
  compact?: boolean;
  className?: string;
}

export function GrowthUpsellCard({
  upsell,
  source,
  compact,
  className,
}: GrowthUpsellCardProps) {
  const href = getUpgradeHref({
    source,
    upsellId: upsell.id,
    plan: upsell.recommendedPlan,
  });

  function handleClick() {
    trackAnalyticsEvent({
      name: AnalyticsEventName.UPGRADE_CTA_CLICKED,
      properties: {
        source,
        upsellId: upsell.id,
        destination: href,
        recommendedPlan: upsell.recommendedPlan,
      },
    });
  }

  return (
    <article
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-brand-gold/25 bg-brand-gold-light/40',
        compact ? 'p-3 sm:p-4' : 'p-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-card text-brand-gold-dark ring-1 ring-[#D4A853]/25',
            compact ? 'h-9 w-9' : 'h-10 w-10',
          )}
        >
          <Crown className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'flex min-w-0 gap-2',
              compact
                ? 'flex-col items-start sm:flex-row sm:flex-wrap sm:items-center'
                : 'flex-wrap items-center',
            )}
          >
            <h3 className="min-w-0 text-sm font-semibold leading-5 text-foreground">
              {upsell.title}
            </h3>
            <Badge variant="gold">Premium</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {upsell.description}
          </p>
          {!compact ? (
            <p className="mt-2 text-xs font-medium leading-5 text-foreground">
              {upsell.benefit}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          'mt-4 flex gap-3',
          compact
            ? 'flex-col items-stretch sm:flex-row sm:items-center sm:justify-between'
            : 'items-center justify-between',
        )}
      >
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5 text-brand-gold-dark" />
          Plan płatny
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'min-h-9 rounded-xl whitespace-normal text-center leading-4',
            compact ? 'w-full sm:w-auto' : '',
          )}
          onClick={handleClick}
          render={<Link href={href} />}
        >
          {upsell.ctaLabel}
        </Button>
      </div>
    </article>
  );
}
