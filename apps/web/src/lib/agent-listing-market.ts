import { apiFetch } from './api-client';
import type { PaginationMeta } from './clients';
import type { PropertyType, TransactionType } from './listings';

export type AgentListingCollaborationMode = 'single_agent' | 'multi_agent';

export interface AgentListingMarketImage {
  id: string;
  url: string;
  altText: string | null;
  order: number;
  isPrimary: boolean;
}

export interface AgentListingMarketItem {
  id: string;
  slug: string;
  title: string;
  propertyType: PropertyType;
  transactionType: TransactionType;
  price: number | string | null;
  currency: string;
  areaM2: number | string | null;
  plotAreaM2: number | string | null;
  rooms: number | null;
  publishedAt: string | null;
  updatedAt: string;
  address: {
    city: string | null;
    district: string | null;
    voivodeship: string | null;
  };
  primaryImage: AgentListingMarketImage | null;
  images: AgentListingMarketImage[];
  collaboration: {
    mode: AgentListingCollaborationMode | null;
    openedAt: string | null;
    preferences: Record<string, unknown> | null;
  };
  hasSubmittedProposal: boolean;
}

export interface AgentListingMarketFilters {
  propertyType?: PropertyType;
  transactionType?: TransactionType;
  collaborationMode?: AgentListingCollaborationMode;
  city?: string;
  search?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'price' | 'publishedAt' | 'collaborationOpenedAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedAgentListingMarket {
  data: AgentListingMarketItem[];
  meta: PaginationMeta;
}

function buildQueryString(filters: AgentListingMarketFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAgentListingMarket(
  filters: AgentListingMarketFilters = {},
): Promise<PaginatedAgentListingMarket> {
  return apiFetch<PaginatedAgentListingMarket>(
    `/agent-listing-market${buildQueryString(filters)}`,
  );
}
