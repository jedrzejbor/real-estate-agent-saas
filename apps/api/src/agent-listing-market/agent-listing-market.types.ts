import type { ListingAgentCollaborationMode } from '../common/enums';
import type { ListingAgentCollaborationPreferences } from '../listings/entities/listing.entity';
import type { PublicListingCatalogItem } from '../listings/public-listing.model';

export interface AgentListingMarketItem extends PublicListingCatalogItem {
  collaboration: {
    mode: ListingAgentCollaborationMode | null;
    openedAt: Date | null;
    preferences: ListingAgentCollaborationPreferences | null;
  };
  hasSubmittedProposal: boolean;
}

export interface AgentListingMarketPage {
  data: AgentListingMarketItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    sort: string;
  };
}
