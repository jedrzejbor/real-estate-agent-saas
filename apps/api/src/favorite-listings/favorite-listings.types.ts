import type { PublicListingCatalogItem } from '../listings/public-listing.model';

export interface FavoriteListingSummary {
  id: string;
  listingId: string;
  createdAt: Date;
  isAvailable: boolean;
}

export interface FavoriteListingListItem extends FavoriteListingSummary {
  isAvailable: true;
  listing: PublicListingCatalogItem;
}

export interface FavoriteListingUnavailableItem extends FavoriteListingSummary {
  isAvailable: false;
  unavailableReason: 'not_public';
}

export type FavoriteListingListEntry =
  | FavoriteListingListItem
  | FavoriteListingUnavailableItem;

export interface ToggleFavoriteListingResult {
  listingId: string;
  isFavorite: boolean;
  favoriteId?: string;
  createdAt?: Date;
}

export interface FavoriteListingIdsResponse {
  listingIds: string[];
}

export interface FavoriteListingsPage {
  data: FavoriteListingListEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
