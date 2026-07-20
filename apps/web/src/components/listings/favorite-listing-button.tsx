'use client';

import type { MouseEvent } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { useFavoriteListing } from '@/hooks/use-favorite-listing';
import type { AnalyticsProperties } from '@/lib/analytics';
import type { ToggleFavoriteListingResult } from '@/lib/favorite-listings';
import { cn } from '@/lib/utils';

interface FavoriteListingButtonProps {
  listingId: string;
  listingSlug?: string;
  initialIsFavorite?: boolean;
  variant?: 'compact' | 'default';
  loginHref?: string;
  analyticsSource?: string;
  analyticsProperties?: AnalyticsProperties;
  disabled?: boolean;
  className?: string;
  stopPropagation?: boolean;
  onAuthRequired?: () => void;
  onChanged?: (result: ToggleFavoriteListingResult) => void;
}

export function FavoriteListingButton({
  listingId,
  listingSlug,
  initialIsFavorite = false,
  variant = 'default',
  loginHref,
  analyticsSource,
  analyticsProperties,
  disabled = false,
  className,
  stopPropagation = false,
  onAuthRequired,
  onChanged,
}: FavoriteListingButtonProps) {
  const { isFavorite, isPending, toggle } = useFavoriteListing({
    listingId,
    initialIsFavorite,
    loginHref,
    analytics: {
      listingSlug,
      source: analyticsSource,
      properties: analyticsProperties,
    },
    onAuthRequired,
    onChanged,
  });
  const isCompact = variant === 'compact';
  const label = isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych';

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) {
      event.stopPropagation();
      event.preventDefault();
    }

    void toggle();
  }

  const button = (
    <Button
      type="button"
      variant={isFavorite ? 'secondary' : 'outline'}
      size={isCompact ? 'icon-lg' : 'lg'}
      aria-label={label}
      aria-pressed={isFavorite}
      aria-busy={isPending}
      disabled={disabled || isPending}
      title={label}
      onClick={handleClick}
      className={cn(
        'h-11 shrink-0 rounded-xl',
        isCompact
          ? 'w-11 p-0'
          : 'min-w-[168px] gap-2 px-4 text-sm font-semibold',
        isFavorite &&
          'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15',
        className,
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4',
          isFavorite && 'fill-current',
          isPending && 'animate-pulse',
        )}
      />
      {isCompact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </Button>
  );

  if (isCompact) {
    return (
      <Tooltip content={label} delay={300}>
        {button}
      </Tooltip>
    );
  }

  return button;
}
