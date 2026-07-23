import { apiFetch } from './api-client';
import type { PaginationMeta } from './clients';

export type ListingAgentProposalStatus =
  | 'draft'
  | 'sent'
  | 'updated'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'closed';

export type ListingAgentProposalCommissionType =
  | 'percentage'
  | 'fixed'
  | 'mixed'
  | 'none';

export type ListingAgentProposalExclusivity =
  | 'exclusive'
  | 'open'
  | 'flexible';

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

export interface ListingAgentAssignment {
  id: string;
  listingId: string;
  proposalId: string;
  ownerUserId: string;
  agentId: string;
  agencyId: string | null;
  status: 'active' | 'revoked' | 'completed';
  acceptedTermsSnapshot: Record<string, unknown>;
  agentListingId: string | null;
  createdAt: string;
  revokedAt: string | null;
  completedAt: string | null;
}

export interface ListingAgentProposal {
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
  validUntil: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing: ListingAgentProposalListingSummary | null;
  agent: ListingAgentProposalAgentSummary | null;
  assignment?: ListingAgentAssignment | null;
}

export interface ListingAgentProposalFilters {
  status?: ListingAgentProposalStatus;
  listingId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedListingAgentProposals {
  data: ListingAgentProposal[];
  meta: PaginationMeta;
}

function buildQueryString(filters: ListingAgentProposalFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchSellerListingAgentProposals(
  filters: ListingAgentProposalFilters = {},
): Promise<PaginatedListingAgentProposals> {
  return apiFetch<PaginatedListingAgentProposals>(
    `/listing-agent-proposals/seller${buildQueryString(filters)}`,
  );
}

export async function acceptSellerListingAgentProposal(
  id: string,
): Promise<ListingAgentProposal> {
  return apiFetch<ListingAgentProposal>(
    `/listing-agent-proposals/seller/${id}/accept`,
    { method: 'POST' },
  );
}

export async function rejectSellerListingAgentProposal(
  id: string,
): Promise<ListingAgentProposal> {
  return apiFetch<ListingAgentProposal>(
    `/listing-agent-proposals/seller/${id}/reject`,
    { method: 'POST' },
  );
}
