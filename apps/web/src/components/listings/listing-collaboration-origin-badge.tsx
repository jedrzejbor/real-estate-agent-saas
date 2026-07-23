import { Handshake } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Listing } from '@/lib/listings';

interface ListingCollaborationOriginBadgeProps {
  listing: Pick<Listing, 'sourceListingId' | 'agentAssignmentId'>;
  compact?: boolean;
}

export function ListingCollaborationOriginBadge({
  listing,
  compact = false,
}: ListingCollaborationOriginBadgeProps) {
  if (!isListingFromAgentCollaboration(listing)) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="inline-flex items-center gap-1 border-primary/25 bg-primary/10 text-primary"
    >
      <Handshake className="h-3 w-3" />
      {compact ? 'Współpraca' : 'Z przejętej współpracy'}
    </Badge>
  );
}

export function isListingFromAgentCollaboration(
  listing: Pick<Listing, 'sourceListingId' | 'agentAssignmentId'>,
): boolean {
  return Boolean(listing.sourceListingId || listing.agentAssignmentId);
}
