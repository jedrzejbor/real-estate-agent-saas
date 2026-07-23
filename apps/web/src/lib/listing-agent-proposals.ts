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

export type ListingAgentCollaborationMode = 'single_agent' | 'multi_agent';
export type ListingAgentCollaborationStatus =
  | 'open'
  | 'paused'
  | 'closed'
  | 'assigned';
export type ListingAgentAssignmentStatus = 'active' | 'revoked' | 'completed';

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
  status: ListingAgentAssignmentStatus;
  acceptedTermsSnapshot: Record<string, unknown>;
  agentListingId: string | null;
  createdAt: string;
  revokedAt: string | null;
  completedAt: string | null;
}

export interface ListingAgentAssignmentListItem extends ListingAgentAssignment {
  listing: ListingAgentProposalListingSummary | null;
  proposal: ListingAgentProposal | null;
}

export interface ListingAgentRecruitment {
  listingId: string;
  agentCollaborationEnabled: boolean;
  agentCollaborationMode: ListingAgentCollaborationMode | null;
  agentCollaborationStatus: ListingAgentCollaborationStatus | null;
  agentCollaborationOpenedAt: string | null;
  agentCollaborationClosedAt: string | null;
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

export type ListingAgentProposalParticipantRole = 'owner' | 'agent';

export interface ListingAgentProposalMessage {
  id: string;
  proposalId: string;
  senderUserId: string;
  senderRole: ListingAgentProposalParticipantRole;
  body: string;
  readAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
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

export interface ListingAgentAssignmentFilters {
  status?: ListingAgentAssignmentStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedListingAgentAssignments {
  data: ListingAgentAssignmentListItem[];
  meta: PaginationMeta;
}

export interface PaginatedListingAgentProposalMessages {
  data: ListingAgentProposalMessage[];
  meta: PaginationMeta & {
    unreadCount: number;
  };
}

export interface ListingAgentProposalInput {
  commissionType: ListingAgentProposalCommissionType;
  commissionValue?: number | null;
  minimumContractMonths?: number | null;
  exclusivity?: ListingAgentProposalExclusivity | null;
  services: string[];
  marketingPlan?: string | null;
  valuationOpinion?: string | null;
  proposedPrice?: number | null;
  availability?: string | null;
  message: string;
  validUntil?: string | null;
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

function buildAssignmentQueryString(
  filters: ListingAgentAssignmentFilters,
): string {
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

export async function fetchAgentListingAgentProposals(
  filters: ListingAgentProposalFilters = {},
): Promise<PaginatedListingAgentProposals> {
  return apiFetch<PaginatedListingAgentProposals>(
    `/listing-agent-proposals/agent${buildQueryString(filters)}`,
  );
}

export async function fetchAgentListingAssignments(
  filters: ListingAgentAssignmentFilters = {},
): Promise<PaginatedListingAgentAssignments> {
  return apiFetch<PaginatedListingAgentAssignments>(
    `/listing-agent-proposals/agent/assignments${buildAssignmentQueryString(filters)}`,
  );
}

export async function createAgentAssignmentListingCopy(
  assignmentId: string,
): Promise<ListingAgentAssignment> {
  return apiFetch<ListingAgentAssignment>(
    `/listing-agent-proposals/agent/assignments/${assignmentId}/create-listing-copy`,
    { method: 'POST' },
  );
}

export async function fetchAgentListingAgentProposal(
  id: string,
): Promise<ListingAgentProposal> {
  return apiFetch<ListingAgentProposal>(
    `/listing-agent-proposals/agent/${id}`,
  );
}

export async function createListingAgentProposal(
  listingId: string,
  input: ListingAgentProposalInput,
): Promise<ListingAgentProposal> {
  return apiFetch<ListingAgentProposal>(
    `/listing-agent-proposals/listings/${listingId}`,
    {
      method: 'POST',
      body: input,
    },
  );
}

export async function updateAgentListingAgentProposal(
  id: string,
  input: ListingAgentProposalInput,
): Promise<ListingAgentProposal> {
  return apiFetch<ListingAgentProposal>(
    `/listing-agent-proposals/agent/${id}`,
    {
      method: 'PATCH',
      body: input,
    },
  );
}

export async function withdrawAgentListingAgentProposal(
  id: string,
): Promise<ListingAgentProposal> {
  return apiFetch<ListingAgentProposal>(
    `/listing-agent-proposals/agent/${id}/withdraw`,
    { method: 'POST' },
  );
}

export async function fetchSellerListingAgentProposal(
  id: string,
): Promise<ListingAgentProposal> {
  return apiFetch<ListingAgentProposal>(
    `/listing-agent-proposals/seller/${id}`,
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

export async function fetchListingAgentProposalMessages(
  id: string,
  filters: { page?: number; limit?: number } = {},
): Promise<PaginatedListingAgentProposalMessages> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();

  return apiFetch<PaginatedListingAgentProposalMessages>(
    `/listing-agent-proposals/${id}/messages${qs ? `?${qs}` : ''}`,
  );
}

export async function createListingAgentProposalMessage(
  id: string,
  body: string,
): Promise<ListingAgentProposalMessage> {
  return apiFetch<ListingAgentProposalMessage>(
    `/listing-agent-proposals/${id}/messages`,
    {
      method: 'POST',
      body: { body },
    },
  );
}

export async function closeSellerListingAgentRecruitment(
  listingId: string,
): Promise<ListingAgentRecruitment> {
  return apiFetch<ListingAgentRecruitment>(
    `/listing-agent-proposals/seller/listings/${listingId}/close-recruitment`,
    { method: 'POST' },
  );
}

export async function reopenSellerListingAgentRecruitment(
  listingId: string,
): Promise<ListingAgentRecruitment> {
  return apiFetch<ListingAgentRecruitment>(
    `/listing-agent-proposals/seller/listings/${listingId}/reopen-recruitment`,
    { method: 'POST' },
  );
}
