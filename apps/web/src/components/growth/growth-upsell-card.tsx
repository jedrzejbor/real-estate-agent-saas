'use client';

import Link from 'next/link';
import { Crown, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnalyticsEventName, trackAnalyticsEvent } from '@/lib/analytics';
import type { GrowthUpsell } from '@/lib/growth-upsells';
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
  function handleClick() {
    trackAnalyticsEvent({
      name: AnalyticsEventName.UPGRADE_CTA_CLICKED,
      properties: {
        source,
        upsellId: upsell.id,
      },
    });
  }

  return (
    <article
      className={cn(
        'rounded-xl border border-[#D4A853]/25 bg-[#FFF9E6]/40 p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#B8922F] ring-1 ring-[#D4A853]/25">
          <Crown className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <LockKeyhole className="h-3.5 w-3.5 text-[#B8922F]" />
          Plan płatny
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-xl"
          onClick={handleClick}
          render={<Link href="/dashboard/settings" />}
        >
          {upsell.ctaLabel}
        </Button>
      </div>
    </article>
  );
}
