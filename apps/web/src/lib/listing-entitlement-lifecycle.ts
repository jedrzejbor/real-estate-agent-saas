import type { ListingEntitlement } from './listing-checkout';

const PUBLICATION_ENDS_SOON_DAYS = 7;
const FEATURED_ENDS_SOON_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ListingEntitlementLifecycle {
  activePublication: ListingEntitlement | null;
  scheduledPublication: ListingEntitlement | null;
  activeFeatured: ListingEntitlement | null;
  scheduledFeatured: ListingEntitlement | null;
  publicationDaysRemaining: number | null;
  featuredDaysRemaining: number | null;
  publicationEndsSoon: boolean;
  featuredEndsSoon: boolean;
}

export function getListingEntitlementLifecycle(
  entitlements: ListingEntitlement[],
  now = new Date(),
): ListingEntitlementLifecycle {
  const activePublication = findActiveEntitlement(
    entitlements,
    'publication',
    now,
  );
  const scheduledPublication = findNextScheduledEntitlement(
    entitlements,
    'publication',
    now,
  );
  const activeFeatured = findActiveEntitlement(entitlements, 'featured', now);
  const scheduledFeatured = findNextScheduledEntitlement(
    entitlements,
    'featured',
    now,
  );
  const publicationDaysRemaining = getDaysRemaining(
    activePublication?.endsAt,
    now,
  );
  const featuredDaysRemaining = getDaysRemaining(activeFeatured?.endsAt, now);

  return {
    activePublication,
    scheduledPublication,
    activeFeatured,
    scheduledFeatured,
    publicationDaysRemaining,
    featuredDaysRemaining,
    publicationEndsSoon:
      publicationDaysRemaining !== null &&
      publicationDaysRemaining <= PUBLICATION_ENDS_SOON_DAYS,
    featuredEndsSoon:
      featuredDaysRemaining !== null &&
      featuredDaysRemaining <= FEATURED_ENDS_SOON_DAYS,
  };
}

function findActiveEntitlement(
  entitlements: ListingEntitlement[],
  type: ListingEntitlement['type'],
  now: Date,
): ListingEntitlement | null {
  return (
    entitlements
      .filter(
        (entitlement) =>
          entitlement.type === type &&
          entitlement.status === 'active' &&
          new Date(entitlement.startsAt).getTime() <= now.getTime() &&
          new Date(entitlement.endsAt).getTime() > now.getTime(),
      )
      .sort(
        (left, right) =>
          new Date(right.endsAt).getTime() - new Date(left.endsAt).getTime(),
      )[0] ?? null
  );
}

function findNextScheduledEntitlement(
  entitlements: ListingEntitlement[],
  type: ListingEntitlement['type'],
  now: Date,
): ListingEntitlement | null {
  return (
    entitlements
      .filter(
        (entitlement) =>
          entitlement.type === type &&
          entitlement.status === 'scheduled' &&
          new Date(entitlement.endsAt).getTime() > now.getTime(),
      )
      .sort(
        (left, right) =>
          new Date(left.startsAt).getTime() -
          new Date(right.startsAt).getTime(),
      )[0] ?? null
  );
}

function getDaysRemaining(
  endsAt: string | undefined,
  now: Date,
): number | null {
  if (!endsAt) return null;
  return Math.max(
    0,
    Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY_MS),
  );
}
