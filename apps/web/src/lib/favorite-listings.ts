import { apiFetch } from './api-client';
import type { PaginationMeta } from './clients';
import type { PublicListingCatalogItem } from './listings';

export interface FavoriteListingSummary {
  id: string;
  listingId: string;
  createdAt: string;
  isAvailable: boolean;
}

export interface FavoriteListingListItem extends FavoriteListingSummary {
  isAvailable: true;
  listing: PublicListingCatalogItem;
}

export interface FavoriteListingUnavailableItem
  extends FavoriteListingSummary {
  isAvailable: false;
  unavailableReason: 'not_public';
}

export type FavoriteListingListEntry =
  | FavoriteListingListItem
  | FavoriteListingUnavailableItem;

export interface FavoriteListingsPage {
  data: FavoriteListingListEntry[];
  meta: PaginationMeta;
}

export interface FavoriteListingFilters {
  page?: number;
  limit?: number;
}

export interface FavoriteListingIdsResponse {
  listingIds: string[];
}

export interface ToggleFavoriteListingResult {
  listingId: string;
  isFavorite: boolean;
  favoriteId?: string;
  createdAt?: string;
}

export async function fetchFavoriteListings(
  filters: FavoriteListingFilters = {},
): Promise<FavoriteListingsPage> {
  return apiFetch<FavoriteListingsPage>(
    `/favorite-listings${buildQueryString(filters)}`,
  );
}

export async function fetchFavoriteListingIds(
  listingIds: string[],
): Promise<FavoriteListingIdsResponse> {
  if (listingIds.length === 0) {
    return { listingIds: [] };
  }

  return apiFetch<FavoriteListingIdsResponse>(
    `/favorite-listings/ids${buildListingIdsQueryString(listingIds)}`,
  );
}

export async function addFavoriteListing(
  listingId: string,
): Promise<ToggleFavoriteListingResult> {
  return apiFetch<ToggleFavoriteListingResult>(
    `/favorite-listings/${listingId}`,
    {
      method: 'POST',
    },
  );
}

export async function removeFavoriteListing(
  listingId: string,
): Promise<ToggleFavoriteListingResult> {
  return apiFetch<ToggleFavoriteListingResult>(
    `/favorite-listings/${listingId}`,
    {
      method: 'DELETE',
    },
  );
}

function buildQueryString(filters: FavoriteListingFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

function buildListingIdsQueryString(listingIds: string[]): string {
  const params = new URLSearchParams();
  const uniqueListingIds = Array.from(
    new Set(listingIds.map((id) => id.trim()).filter(Boolean)),
  );

  for (const listingId of uniqueListingIds) {
    params.append('listingIds', listingId);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}
