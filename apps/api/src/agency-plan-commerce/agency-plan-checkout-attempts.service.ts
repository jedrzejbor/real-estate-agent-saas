import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { UsersService } from '../users/users.service';
import type { AgencyPlanCheckoutAttemptContract } from './contracts';
import {
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

const OPEN_ATTEMPT_STATUSES = new Set([
  AgencyPlanCheckoutAttemptStatus.CREATING,
  AgencyPlanCheckoutAttemptStatus.PENDING,
]);
const CHECKOUT_PROVIDER = 'stripe';

@Injectable()
export class AgencyPlanCheckoutAttemptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly promotionsService: AgencyPlanPromotionsService,
  ) {}

  async createCheckoutAttempt(
    userId: string,
    quoteId: string,
    now = new Date(),
  ): Promise<AgencyPlanCheckoutAttemptContract> {
    const access = await this.usersService.getAgencyAccessContext(userId);

    return this.dataSource.transaction(async (manager) => {
      const quote = await this.findQuoteForUpdate(manager, quoteId);
      assertQuoteBelongsToRequester(quote, userId, access.agency.id);
      assertQuoteCanStartCheckout(quote, now);

      if (!quote.userId) quote.userId = userId;
      if (!quote.agencyId) quote.agencyId = access.agency.id;

      await this.promotionsService.reserveDiscountsForQuote(manager, quote, now);

      const attempt = await this.findOrCreateOpenAttempt(manager, quote, now);
      quote.metadata = {
        ...quote.metadata,
        currentCheckoutAttemptId: attempt.id,
        checkoutAttemptExpiresAt: attempt.expiresAt.toISOString(),
      };
      await manager.save(AgencyPlanQuote, quote);

      return presentCheckoutAttempt(quote, attempt);
    });
  }

  private async findQuoteForUpdate(
    manager: EntityManager,
    quoteId: string,
  ): Promise<AgencyPlanQuote> {
    const quote = await manager.findOne(AgencyPlanQuote, {
      where: { id: quoteId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!quote) {
      throw new NotFoundException('Wycena planu nie istnieje');
    }
    return quote;
  }

  private async findOrCreateOpenAttempt(
    manager: EntityManager,
    quote: AgencyPlanQuote,
    now: Date,
  ): Promise<AgencyPlanCheckoutAttempt> {
    const latestAttempt = await manager.findOne(AgencyPlanCheckoutAttempt, {
      where: { quoteId: quote.id },
      order: { attemptNumber: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });

    if (latestAttempt && OPEN_ATTEMPT_STATUSES.has(latestAttempt.status)) {
      if (latestAttempt.expiresAt.getTime() <= now.getTime()) {
        throw new ConflictException('Próba checkoutu wygasła');
      }
      return latestAttempt;
    }

    if (
      latestAttempt &&
      latestAttempt.status === AgencyPlanCheckoutAttemptStatus.SUCCEEDED
    ) {
      throw new ConflictException('Ten checkout został już opłacony');
    }

    const attempt = manager.create(AgencyPlanCheckoutAttempt, {
      quoteId: quote.id,
      attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
      status: AgencyPlanCheckoutAttemptStatus.CREATING,
      provider: CHECKOUT_PROVIDER,
      amountGross: quote.totalGrossAmount,
      currency: quote.currency,
      providerCheckoutSessionId: null,
      providerSubscriptionId: null,
      failureCode: null,
      failureMessage: null,
      startedAt: now,
      expiresAt: quote.expiresAt,
      completedAt: null,
      metadata: {
        planCode: quote.planCode,
        billingInterval: quote.billingInterval,
      },
    });

    return manager.save(AgencyPlanCheckoutAttempt, attempt);
  }
}

function assertQuoteBelongsToRequester(
  quote: AgencyPlanQuote,
  userId: string,
  agencyId: string,
): void {
  if (quote.userId && quote.userId !== userId) {
    throw new NotFoundException('Wycena planu nie istnieje');
  }
  if (quote.agencyId && quote.agencyId !== agencyId) {
    throw new NotFoundException('Wycena planu nie istnieje');
  }
}

function assertQuoteCanStartCheckout(quote: AgencyPlanQuote, now: Date): void {
  if (quote.expiresAt.getTime() <= now.getTime()) {
    throw new ConflictException('Wycena planu wygasła');
  }
  if (quote.totalGrossAmount <= 0) {
    throw new ConflictException('Plan nie wymaga płatności');
  }
  if (
    quote.status !== AgencyPlanQuoteStatus.QUOTED &&
    quote.status !== AgencyPlanQuoteStatus.RESERVED
  ) {
    throw new ConflictException(
      'Stan wyceny nie pozwala rozpocząć checkoutu',
    );
  }
}

function presentCheckoutAttempt(
  quote: AgencyPlanQuote,
  attempt: AgencyPlanCheckoutAttempt,
): AgencyPlanCheckoutAttemptContract {
  return {
    quoteId: quote.id,
    quoteStatus: quote.status,
    checkoutAttemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    provider: attempt.provider,
    amountGross: attempt.amountGross,
    currency: attempt.currency,
    expiresAt: attempt.expiresAt.toISOString(),
  };
}
