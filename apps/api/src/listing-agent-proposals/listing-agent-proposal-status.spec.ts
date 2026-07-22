import { ListingAgentProposalStatus } from '../common/enums';
import {
  canEditListingAgentProposal,
  canTransitionListingAgentProposal,
  isListingAgentProposalTerminal,
} from './listing-agent-proposal-status';

describe('listing agent proposal status rules', () => {
  it('allows agents to edit only active sent proposals', () => {
    expect(canEditListingAgentProposal(ListingAgentProposalStatus.SENT)).toBe(
      true,
    );
    expect(canEditListingAgentProposal(ListingAgentProposalStatus.UPDATED)).toBe(
      true,
    );
    expect(
      canEditListingAgentProposal(ListingAgentProposalStatus.ACCEPTED),
    ).toBe(false);
    expect(
      canEditListingAgentProposal(ListingAgentProposalStatus.WITHDRAWN),
    ).toBe(false);
  });

  it('allows expected proposal lifecycle transitions', () => {
    expect(
      canTransitionListingAgentProposal(
        ListingAgentProposalStatus.DRAFT,
        ListingAgentProposalStatus.SENT,
      ),
    ).toBe(true);
    expect(
      canTransitionListingAgentProposal(
        ListingAgentProposalStatus.SENT,
        ListingAgentProposalStatus.UPDATED,
      ),
    ).toBe(true);
    expect(
      canTransitionListingAgentProposal(
        ListingAgentProposalStatus.UPDATED,
        ListingAgentProposalStatus.ACCEPTED,
      ),
    ).toBe(true);
    expect(
      canTransitionListingAgentProposal(
        ListingAgentProposalStatus.ACCEPTED,
        ListingAgentProposalStatus.CLOSED,
      ),
    ).toBe(true);
  });

  it('blocks reopening terminal rejected or withdrawn proposals', () => {
    expect(isListingAgentProposalTerminal(ListingAgentProposalStatus.REJECTED))
      .toBe(true);
    expect(isListingAgentProposalTerminal(ListingAgentProposalStatus.WITHDRAWN))
      .toBe(true);
    expect(
      canTransitionListingAgentProposal(
        ListingAgentProposalStatus.REJECTED,
        ListingAgentProposalStatus.SENT,
      ),
    ).toBe(false);
    expect(
      canTransitionListingAgentProposal(
        ListingAgentProposalStatus.WITHDRAWN,
        ListingAgentProposalStatus.UPDATED,
      ),
    ).toBe(false);
  });

  it('treats idempotent transitions as safe no-ops', () => {
    expect(
      canTransitionListingAgentProposal(
        ListingAgentProposalStatus.SENT,
        ListingAgentProposalStatus.SENT,
      ),
    ).toBe(true);
  });
});
