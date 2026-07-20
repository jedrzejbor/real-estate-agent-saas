'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { FavoriteListingButton } from '@/components/listings/favorite-listing-button';
import { buildAuthReturnToPath } from '@/lib/auth';
import { fetchFavoriteListingIds } from '@/lib/favorite-listings';

interface PublicListingFavoriteActionProps {
  listingId: string;
  listingSlug: string;
}

export function PublicListingFavoriteAction({
  listingId,
  listingSlug,
}: PublicListingFavoriteActionProps) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [fetchedIsFavorite, setFetchedIsFavorite] = useState(false);
  const loginHref = useMemo(
    () => buildAuthReturnToPath('/login', `/oferty/${listingSlug}`),
    [listingSlug],
  );
  const initialIsFavorite = isAuthenticated ? fetchedIsFavorite : false;

  useEffect(() => {
    let isCurrent = true;

    if (isAuthLoading || !isAuthenticated) {
      return () => {
        isCurrent = false;
      };
    }

    async function loadFavoriteState() {
      try {
        const response = await fetchFavoriteListingIds([listingId]);

        if (isCurrent) {
          setFetchedIsFavorite(response.listingIds.includes(listingId));
        }
      } catch {
        if (isCurrent) {
          setFetchedIsFavorite(false);
        }
      }
    }

    loadFavoriteState();

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, isAuthLoading, listingId]);

  return (
    <FavoriteListingButton
      listingId={listingId}
      listingSlug={listingSlug}
      initialIsFavorite={initialIsFavorite}
      loginHref={loginHref}
      analyticsSource="public_listing_detail"
      disabled={isAuthLoading}
      onChanged={(result) => setFetchedIsFavorite(result.isFavorite)}
      className="w-full justify-center"
    />
  );
}
