import {
  getListingEntitlementLifecycle,
  type ListingEntitlementLifecycle,
} from './listing-entitlement-lifecycle';
import type { ListingEntitlement } from './listing-checkout';

describe('getListingEntitlementLifecycle', () => {
  const now = new Date('2026-09-09T10:00:00.000Z');

  it('marks publication as ending soon within seven days', () => {
    const lifecycle = getLifecycle([
      entitlement({
        id: 'publication-active',
        type: 'publication',
        status: 'active',
        startsAt: '2026-09-01T10:00:00.000Z',
        endsAt: '2026-09-15T10:00:00.000Z',
      }),
    ]);

    expect(lifecycle.activePublication?.id).toBe('publication-active');
    expect(lifecycle.publicationDaysRemaining).toBe(6);
    expect(lifecycle.publicationEndsSoon).toBe(true);
  });

  it('marks featured as ending soon within two days', () => {
    const lifecycle = getLifecycle([
      entitlement({
        id: 'featured-active',
        type: 'featured',
        status: 'active',
        startsAt: '2026-09-08T10:00:00.000Z',
        endsAt: '2026-09-11T09:00:00.000Z',
      }),
    ]);

    expect(lifecycle.activeFeatured?.id).toBe('featured-active');
    expect(lifecycle.featuredDaysRemaining).toBe(2);
    expect(lifecycle.featuredEndsSoon).toBe(true);
  });

  it('selects the nearest scheduled entitlement separately from active one', () => {
    const lifecycle = getLifecycle([
      entitlement({
        id: 'publication-active',
        type: 'publication',
        status: 'active',
        startsAt: '2026-09-01T10:00:00.000Z',
        endsAt: '2026-09-15T10:00:00.000Z',
      }),
      entitlement({
        id: 'publication-scheduled-later',
        type: 'publication',
        status: 'scheduled',
        startsAt: '2026-10-15T10:00:00.000Z',
        endsAt: '2026-12-14T10:00:00.000Z',
      }),
      entitlement({
        id: 'publication-scheduled-next',
        type: 'publication',
        status: 'scheduled',
        startsAt: '2026-09-15T10:00:00.000Z',
        endsAt: '2026-11-14T10:00:00.000Z',
      }),
    ]);

    expect(lifecycle.activePublication?.id).toBe('publication-active');
    expect(lifecycle.scheduledPublication?.id).toBe(
      'publication-scheduled-next',
    );
  });

  function getLifecycle(
    entitlements: ListingEntitlement[],
  ): ListingEntitlementLifecycle {
    return getListingEntitlementLifecycle(entitlements, now);
  }
});

function entitlement(
  overrides: Partial<ListingEntitlement>,
): ListingEntitlement {
  return {
    id: 'entitlement',
    type: 'publication',
    status: 'active',
    tier: null,
    sourceType: 'order_item',
    startsAt: '2026-09-01T10:00:00.000Z',
    endsAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}
