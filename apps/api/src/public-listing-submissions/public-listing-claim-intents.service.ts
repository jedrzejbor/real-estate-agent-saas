import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';
import { normalizeAccountEmail } from '../auth/account-email';
import { PublicListingSubmissionStatus } from '../common/enums';
import { PublicListingSubmission } from './entities';

/** Binds a verified public submission to an account without retaining its raw token. */
@Injectable()
export class PublicListingClaimIntentsService {
  constructor(
    @InjectRepository(PublicListingSubmission)
    private readonly submissions: Repository<PublicListingSubmission>,
  ) {}

  async prepare(claimToken: string, email: string): Promise<string> {
    const claimTokenHash = createHash('sha256')
      .update(claimToken)
      .digest('hex');
    const submission = await this.submissions.findOne({
      where: { claimTokenHash },
    });
    if (!this.canBind(submission, email)) {
      throw new BadRequestException('Nie można powiązać zgłoszenia z kontem');
    }
    return submission.id;
  }

  /** Call inside the account creation transaction. Rechecks state under a row lock. */
  async bind(
    manager: EntityManager,
    submissionId: string,
    userId: string,
    email: string,
  ): Promise<void> {
    const submission = await manager.findOne(PublicListingSubmission, {
      where: { id: submissionId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!this.canBind(submission, email)) {
      throw new ConflictException(
        'Zgłoszenie nie jest już dostępne do przejęcia',
      );
    }
    submission.pendingClaimUserId = userId;
    await manager.save(PublicListingSubmission, submission);
  }

  private canBind(
    submission: PublicListingSubmission | null,
    email: string,
  ): submission is PublicListingSubmission {
    return Boolean(
      submission &&
      submission.status === PublicListingSubmissionStatus.VERIFIED &&
      !submission.pendingClaimUserId &&
      normalizeAccountEmail(submission.email) === normalizeAccountEmail(email),
    );
  }
}
