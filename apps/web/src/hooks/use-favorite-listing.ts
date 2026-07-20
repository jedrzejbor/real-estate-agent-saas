'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  AnalyticsEventName,
  trackAnalyticsEvent,
  trackPublicListingEvent,
  type AnalyticsProperties,
} from '@/lib/analytics';
import {
  addFavoriteListing,
  removeFavoriteListing,
  type ToggleFavoriteListingResult,
} from '@/lib/favorite-listings';

interface UseFavoriteListingOptions {
  listingId: string;
  initialIsFavorite?: boolean;
  loginHref?: string;
  showErrorToast?: boolean;
  analytics?: FavoriteListingAnalyticsContext;
  onAuthRequired?: () => void;
  onChanged?: (result: ToggleFavoriteListingResult) => void;
}

interface FavoriteListingAnalyticsContext {
  listingSlug?: string;
  source?: string;
  properties?: AnalyticsProperties;
}

export function useFavoriteListing({
  listingId,
  initialIsFavorite = false,
  loginHref = '/login',
  showErrorToast = true,
  analytics,
  onAuthRequired,
  onChanged,
}: UseFavoriteListingOptions) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsFavorite(initialIsFavorite);
    setError(null);
  }, [initialIsFavorite, listingId]);

  const requireAuth = useCallback(() => {
    onAuthRequired?.();
    trackFavoriteLoginPromptShown(listingId, analytics);

    toast.warning({
      title: 'Zaloguj się, aby zapisać ofertę',
      description: 'Ulubione oferty zapisujemy na Twoim koncie.',
      action: {
        label: 'Zaloguj się',
        onClick: () => router.push(loginHref),
      },
    });
  }, [analytics, listingId, loginHref, onAuthRequired, router, toast]);

  const setFavorite = useCallback(
    async (nextIsFavorite: boolean) => {
      if (isPending || isAuthLoading) {
        return null;
      }

      if (!isAuthenticated) {
        requireAuth();
        return null;
      }

      const previousIsFavorite = isFavorite;
      setIsFavorite(nextIsFavorite);
      setIsPending(true);
      setError(null);

      try {
        const result = nextIsFavorite
          ? await addFavoriteListing(listingId)
          : await removeFavoriteListing(listingId);

        setIsFavorite(result.isFavorite);
        trackFavoriteListingChanged(result, analytics);
        onChanged?.(result);

        return result;
      } catch (err) {
        const message = getApiErrorMessage(err);
        setIsFavorite(previousIsFavorite);
        setError(message);

        if (showErrorToast) {
          toast.error({
            title: 'Nie udało się zaktualizować ulubionych',
            description: message,
          });
        }

        return null;
      } finally {
        setIsPending(false);
      }
    },
    [
      isAuthenticated,
      isAuthLoading,
      isFavorite,
      isPending,
      analytics,
      listingId,
      onChanged,
      requireAuth,
      showErrorToast,
      toast,
    ],
  );

  const add = useCallback(() => setFavorite(true), [setFavorite]);
  const remove = useCallback(() => setFavorite(false), [setFavorite]);
  const toggle = useCallback(
    () => setFavorite(!isFavorite),
    [isFavorite, setFavorite],
  );

  return {
    isFavorite,
    isPending,
    error,
    add,
    remove,
    toggle,
    setIsFavorite,
  };
}

function trackFavoriteLoginPromptShown(
  listingId: string,
  analytics?: FavoriteListingAnalyticsContext,
): void {
  const properties = buildFavoriteAnalyticsProperties(listingId, analytics);

  if (analytics?.listingSlug) {
    trackPublicListingEvent({
      slug: analytics.listingSlug,
      name: AnalyticsEventName.FAVORITE_LOGIN_PROMPT_SHOWN,
      properties,
    });
    return;
  }

  trackAnalyticsEvent({
    name: AnalyticsEventName.FAVORITE_LOGIN_PROMPT_SHOWN,
    properties,
  });
}

function trackFavoriteListingChanged(
  result: ToggleFavoriteListingResult,
  analytics?: FavoriteListingAnalyticsContext,
): void {
  trackAnalyticsEvent({
    name: result.isFavorite
      ? AnalyticsEventName.FAVORITE_LISTING_ADDED
      : AnalyticsEventName.FAVORITE_LISTING_REMOVED,
    properties: buildFavoriteAnalyticsProperties(result.listingId, analytics),
  });
}

function buildFavoriteAnalyticsProperties(
  listingId: string,
  analytics?: FavoriteListingAnalyticsContext,
): AnalyticsProperties {
  return {
    listingId,
    listingSlug: analytics?.listingSlug,
    source: analytics?.source,
    ...analytics?.properties,
  };
}
