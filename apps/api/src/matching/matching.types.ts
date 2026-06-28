import type {
  ListingStatus,
  PropertyType,
  TransactionType,
} from '../common/enums';

export type MatchingReasonType = 'positive' | 'neutral' | 'negative';

export interface MatchingReason {
  code: string;
  label: string;
  type: MatchingReasonType;
}

export interface MatchingClientPreferenceInput {
  propertyType?: PropertyType | null;
  transactionType?: TransactionType | null;
  minArea?: number | string | null;
  maxPrice?: number | string | null;
  preferredCity?: string | null;
  preferredDistrict?: string | null;
  minRooms?: number | null;
}

export interface MatchingClientInput {
  id: string;
  budgetMin?: number | string | null;
  budgetMax?: number | string | null;
  preference?: MatchingClientPreferenceInput | null;
}

export interface MatchingListingInput {
  id: string;
  status: ListingStatus;
  propertyType: PropertyType;
  transactionType?: TransactionType | null;
  price?: number | string | null;
  areaM2?: number | string | null;
  rooms?: number | null;
  address?: {
    city?: string | null;
    district?: string | null;
  } | null;
}

export interface MatchingScoreResult {
  score: number;
  isExcluded: boolean;
  reasons: MatchingReason[];
}
