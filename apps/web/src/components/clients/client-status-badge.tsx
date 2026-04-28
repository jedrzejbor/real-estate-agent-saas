'use client';

import { Badge } from '@/components/ui/badge';
import {
  type ClientStatus,
  CLIENT_STATUS_LABELS,
  STATUS_BADGE_VARIANT,
} from '@/lib/clients';

interface ClientStatusBadgeProps {
  status: ClientStatus;
}

/** Renders a colored badge for client CRM status. */
export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]}>
      {CLIENT_STATUS_LABELS[status]}
    </Badge>
  );
}
