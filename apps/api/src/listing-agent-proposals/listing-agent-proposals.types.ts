import type {
  ListingAgentAssignmentStatus,
  ListingAgentProposalCommissionType,
  ListingAgentProposalExclusivity,
  ListingAgentProposalStatus,
} from '../common/enums';

export interface ListingAgentProposalListingSummary {
  id: string;
  slug: string;
  title: string;
  city: string | null;
  district: string | null;
  price: number | string | null;
  currency: string;
}

export interface ListingAgentProposalAgentSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  agency: {
    id: string;
    name: string;
    logoUrl: string | null;
  } | null;
}

export interface ListingAgentProposalResponse {
  id: string;
  listingId: string;
  ownerUserId: string;
  agentId: string;
  agencyId: string | null;
  status: ListingAgentProposalStatus;
  commissionType: ListingAgentProposalCommissionType | null;
  commissionValue: number | string | null;
  minimumContractMonths: number | null;
  exclusivity: ListingAgentProposalExclusivity | null;
  services: string[];
  marketingPlan: string | null;
  valuationOpinion: string | null;
  proposedPrice: number | string | null;
  availability: string | null;
  message: string | null;
  validUntil: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  withdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  listing: ListingAgentProposalListingSummary | null;
  agent: ListingAgentProposalAgentSummary | null;
}

export interface ListingAgentAssignmentResponse {
  id: string;
  listingId: string;
  proposalId: string;
  ownerUserId: string;
  agentId: string;
  agencyId: string | null;
  status: ListingAgentAssignmentStatus;
  acceptedTermsSnapshot: Record<string, unknown>;
  agentListingId: string | null;
  createdAt: Date;
  revokedAt: Date | null;
  completedAt: Date | null;
}

export interface ListingAgentProposalDecisionResponse
  extends ListingAgentProposalResponse {
  assignment: ListingAgentAssignmentResponse | null;
}

export interface ListingAgentProposalPage {
  data: ListingAgentProposalResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    sort: string;
  };
}
