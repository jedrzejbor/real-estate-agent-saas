import { ListingAgentProposalStatus } from '../common/enums';

const EDITABLE_PROPOSAL_STATUSES = new Set<ListingAgentProposalStatus>([
  ListingAgentProposalStatus.SENT,
  ListingAgentProposalStatus.UPDATED,
]);

const TERMINAL_PROPOSAL_STATUSES = new Set<ListingAgentProposalStatus>([
  ListingAgentProposalStatus.ACCEPTED,
  ListingAgentProposalStatus.REJECTED,
  ListingAgentProposalStatus.WITHDRAWN,
  ListingAgentProposalStatus.EXPIRED,
  ListingAgentProposalStatus.CLOSED,
]);

const ALLOWED_PROPOSAL_TRANSITIONS: Record<
  ListingAgentProposalStatus,
  ReadonlySet<ListingAgentProposalStatus>
> = {
  [ListingAgentProposalStatus.DRAFT]: new Set([
    ListingAgentProposalStatus.SENT,
    ListingAgentProposalStatus.WITHDRAWN,
  ]),
  [ListingAgentProposalStatus.SENT]: new Set([
    ListingAgentProposalStatus.UPDATED,
    ListingAgentProposalStatus.ACCEPTED,
    ListingAgentProposalStatus.REJECTED,
    ListingAgentProposalStatus.WITHDRAWN,
    ListingAgentProposalStatus.EXPIRED,
    ListingAgentProposalStatus.CLOSED,
  ]),
  [ListingAgentProposalStatus.UPDATED]: new Set([
    ListingAgentProposalStatus.ACCEPTED,
    ListingAgentProposalStatus.REJECTED,
    ListingAgentProposalStatus.WITHDRAWN,
    ListingAgentProposalStatus.EXPIRED,
    ListingAgentProposalStatus.CLOSED,
  ]),
  [ListingAgentProposalStatus.ACCEPTED]: new Set([
    ListingAgentProposalStatus.CLOSED,
  ]),
  [ListingAgentProposalStatus.REJECTED]: new Set(),
  [ListingAgentProposalStatus.WITHDRAWN]: new Set(),
  [ListingAgentProposalStatus.EXPIRED]: new Set(),
  [ListingAgentProposalStatus.CLOSED]: new Set(),
};

export function canEditListingAgentProposal(
  status: ListingAgentProposalStatus,
): boolean {
  return EDITABLE_PROPOSAL_STATUSES.has(status);
}

export function isListingAgentProposalTerminal(
  status: ListingAgentProposalStatus,
): boolean {
  return TERMINAL_PROPOSAL_STATUSES.has(status);
}

export function canTransitionListingAgentProposal(
  from: ListingAgentProposalStatus,
  to: ListingAgentProposalStatus,
): boolean {
  if (from === to) {
    return true;
  }

  return ALLOWED_PROPOSAL_TRANSITIONS[from]?.has(to) ?? false;
}
