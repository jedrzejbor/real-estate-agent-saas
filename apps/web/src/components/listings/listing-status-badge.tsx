'use client';

import { Badge } from '@/components/ui/badge';
import {
  type ListingStatus,
  LISTING_STATUS_LABELS,
  STATUS_BADGE_VARIANT,
} from '@/lib/listings';

interface ListingStatusBadgeProps {
  status: ListingStatus;
}

/** Renders a colored badge for listing status. */
export function ListingStatusBadge({ status }: ListingStatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {LISTING_STATUS_LABELS[status]}
    </Badge>
  );
}
