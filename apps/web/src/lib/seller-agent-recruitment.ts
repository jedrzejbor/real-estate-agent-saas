import { ListingPublicationStatus } from './listings';
import type { SellerPublicListingSubmissionListItem } from './public-listing-submissions';

export interface SellerRecruitmentCardState {
  label: string;
  className: string;
  action: 'close' | 'open' | null;
}

export function getSellerRecruitmentCardState(
  submission: SellerPublicListingSubmissionListItem,
  isAgentMarketplaceEnabled: boolean,
  now = Date.now(),
): SellerRecruitmentCardState | null {
  if (!isAgentMarketplaceEnabled) {
    return null;
  }

  const canManageRecruitment = Boolean(
    submission.publishedListingId &&
      submission.publicationStatus === ListingPublicationStatus.PUBLISHED &&
      !isSellerSubmissionExpired(submission, now),
  );

  if (submission.agentCollaborationStatus === 'assigned') {
    return {
      label: 'Agent wybrany',
      className: 'bg-emerald-100 text-emerald-900',
      action: null,
    };
  }

  if (
    submission.agentCollaborationEnabled &&
    submission.agentCollaborationStatus === 'open'
  ) {
    return {
      label: 'Szukasz agenta',
      className: 'bg-primary/10 text-primary',
      action: canManageRecruitment ? 'close' : null,
    };
  }

  if (
    submission.agentCollaborationEnabled &&
    submission.agentCollaborationStatus === 'closed'
  ) {
    return {
      label: 'Nabór zamknięty',
      className: 'bg-stone-200 text-stone-800',
      action: canManageRecruitment ? 'open' : null,
    };
  }

  if (canManageRecruitment) {
    return {
      label: 'Bez naboru',
      className: 'bg-muted text-muted-foreground',
      action: 'open',
    };
  }

  return null;
}

export function isSellerSubmissionExpired(
  submission: Pick<SellerPublicListingSubmissionListItem, 'expiresAt'>,
  now = Date.now(),
): boolean {
  return Boolean(
    submission.expiresAt && new Date(submission.expiresAt).getTime() <= now,
  );
}
