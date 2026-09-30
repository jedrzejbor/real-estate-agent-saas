import { PublicListingSubmissionStatus } from '../common/enums';
import { PublicListingSubmission } from './entities';
import { PublicListingClaimIntentsService } from './public-listing-claim-intents.service';

function setup() {
  const submission = {
    id: 'submission-1',
    email: 'jan@example.com',
    status: PublicListingSubmissionStatus.VERIFIED,
    pendingClaimUserId: null,
  } as PublicListingSubmission;
  const repository = { findOne: jest.fn().mockResolvedValue(submission) };
  const manager = {
    findOne: jest.fn().mockResolvedValue(submission),
    save: jest.fn().mockResolvedValue(submission),
  };
  return {
    service: new PublicListingClaimIntentsService(repository as never),
    submission,
    repository,
    manager,
  };
}

describe('PublicListingClaimIntentsService', () => {
  it('rejects a claim token for a different mailbox', async () => {
    const { service } = setup();
    await expect(
      service.prepare('raw-token', 'other@example.com'),
    ).rejects.toThrow('Nie można powiązać zgłoszenia z kontem');
  });

  it('stores only the user ID under a row lock after rechecking the mailbox', async () => {
    const { service, submission, manager } = setup();
    await service.bind(
      manager as never,
      submission.id,
      'user-1',
      'JAN@example.com',
    );
    expect(manager.findOne).toHaveBeenCalledWith(PublicListingSubmission, {
      where: { id: submission.id },
      lock: { mode: 'pessimistic_write' },
    });
    expect(submission.pendingClaimUserId).toBe('user-1');
    expect(manager.save).toHaveBeenCalledWith(
      PublicListingSubmission,
      submission,
    );
  });

  it('rejects binding if the submission was claimed between preparation and transaction', async () => {
    const { service, submission, manager } = setup();
    submission.pendingClaimUserId = 'another-user';
    await expect(
      service.bind(manager as never, submission.id, 'user-1', submission.email),
    ).rejects.toThrow('Zgłoszenie nie jest już dostępne do przejęcia');
    expect(manager.save).not.toHaveBeenCalled();
  });
});
