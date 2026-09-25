import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PlanCatalog } from '../plans/entities';
import { UsersService } from '../users/users.service';
import type { AgencyPlanCheckoutAttemptContract } from './contracts';
import {
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanQuoteStatus,
} from './agency-plan-commerce.types';
import {
  AGENCY_PLAN_PAYMENT_GATEWAY,
  AgencyPlanPaymentGateway,
} from './agency-plan-payment-gateway.port';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

const OPEN_ATTEMPT_STATUSES = new Set([
  AgencyPlanCheckoutAttemptStatus.CREATING,
  AgencyPlanCheckoutAttemptStatus.PENDING,
]);
// Leave room for database and Stripe latency beyond Stripe's 30-minute minimum.
const MIN_CHECKOUT_REMAINING_MS = 35 * 60 * 1000;

@Injectable()
export class AgencyPlanCheckoutAttemptsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly promotionsService: AgencyPlanPromotionsService,
    @Inject(AGENCY_PLAN_PAYMENT_GATEWAY)
    private readonly paymentGateway: AgencyPlanPaymentGateway,
  ) {}

  async createCheckoutAttempt(
    userId: string,
    quoteId: string,
    now = new Date(),
  ): Promise<AgencyPlanCheckoutAttemptContract> {
    const access = await this.usersService.getAgencyAccessContext(userId);
    if (access.agency.billingSubscriptionId) {
      throw new ConflictException(
        'Zmiana aktywnego abonamentu wymaga obsługi istniejącej subskrypcji',
      );
    }

    const prepared = await this.dataSource.transaction(async (manager) => {
      const quote = await this.findQuoteForUpdate(manager, quoteId);
      assertQuoteBelongsToRequester(quote, userId, access.agency.id);
      assertQuoteCanStartCheckout(quote, now);
      const plan = await this.findPlanForQuote(manager, quote);

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

      return {
        quoteId: quote.id,
        attemptId: attempt.id,
        paymentInput: {
          quoteId: quote.id,
          checkoutAttemptId: attempt.id,
          attemptNumber: attempt.attemptNumber,
          agencyId: access.agency.id,
          agencyName: access.agency.name,
          buyerEmail: access.user.email,
          billingCustomerId: access.agency.billingCustomerId ?? null,
          planCode: quote.planCode,
          planLabel: quote.pricingSnapshot.planLabel,
          billingInterval: quote.billingInterval,
          providerPriceReference: getProviderPriceReference(plan, quote),
          currency: quote.currency,
          subtotalGrossAmount: quote.subtotalGrossAmount,
          discountGrossAmount: quote.discountGrossAmount,
          totalGrossAmount: quote.totalGrossAmount,
          discountDurationBillingCycles:
            getDiscountDurationBillingCycles(quote),
          expiresAt: attempt.expiresAt,
        },
      };
    });

    const session =
      await this.paymentGateway.createSubscriptionCheckoutSession(
        prepared.paymentInput,
      );

    return this.dataSource.transaction(async (manager) => {
      const quote = await this.findQuoteForUpdate(manager, prepared.quoteId);
      const attempt = await this.findAttemptForUpdate(
        manager,
        prepared.attemptId,
        quote.id,
      );
      if (!attempt) {
        throw new ConflictException('Próba checkoutu nie istnieje');
      }
      if (!OPEN_ATTEMPT_STATUSES.has(attempt.status)) {
        throw new ConflictException(
          'Stan próby nie pozwala powiązać sesji płatniczej',
        );
      }
      if (
        attempt.provider !== session.provider ||
        (attempt.providerCheckoutSessionId &&
          attempt.providerCheckoutSessionId !== session.sessionId)
      ) {
        throw new ConflictException(
          'Próba jest już powiązana z inną sesją płatniczą',
        );
      }

      attempt.providerCheckoutSessionId = session.sessionId;
      attempt.providerSubscriptionId = session.subscriptionId;
      attempt.status = AgencyPlanCheckoutAttemptStatus.PENDING;
      attempt.expiresAt = session.expiresAt ?? attempt.expiresAt;
      attempt.metadata = {
        ...attempt.metadata,
        checkoutUrlCreatedAt: new Date().toISOString(),
      };
      await manager.save(AgencyPlanCheckoutAttempt, attempt);

      quote.metadata = {
        ...quote.metadata,
        currentCheckoutAttemptId: attempt.id,
        providerCheckoutSessionId: session.sessionId,
        checkoutAttemptExpiresAt: attempt.expiresAt.toISOString(),
      };
      await manager.save(AgencyPlanQuote, quote);

      return presentCheckoutAttempt(quote, attempt, {
        checkoutUrl: session.checkoutUrl,
        sessionId: session.sessionId,
        subscriptionId: session.subscriptionId,
      });
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
      provider: this.paymentGateway.provider,
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

  private async findPlanForQuote(
    manager: EntityManager,
    quote: AgencyPlanQuote,
  ): Promise<PlanCatalog> {
    const plan = await manager.findOne(PlanCatalog, {
      where: { code: quote.planCode },
    });
    if (!plan) {
      throw new ConflictException('Plan z wyceny nie jest już dostępny');
    }
    return plan;
  }

  private findAttemptForUpdate(
    manager: EntityManager,
    attemptId: string,
    quoteId: string,
  ): Promise<AgencyPlanCheckoutAttempt | null> {
    return manager.findOne(AgencyPlanCheckoutAttempt, {
      where: { id: attemptId, quoteId },
      lock: { mode: 'pessimistic_write' },
    });
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
  if (quote.expiresAt.getTime() - now.getTime() < MIN_CHECKOUT_REMAINING_MS) {
    throw new ConflictException('Wycena jest zbyt stara, przelicz cenę ponownie');
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
  session: {
    sessionId: string;
    checkoutUrl: string;
    subscriptionId: string | null;
  },
): AgencyPlanCheckoutAttemptContract {
  return {
    quoteId: quote.id,
    quoteStatus: quote.status,
    checkoutAttemptId: attempt.id,
    attemptNumber: attempt.attemptNumber,
    status: attempt.status,
    provider: attempt.provider,
    sessionId: session.sessionId,
    checkoutUrl: session.checkoutUrl,
    subscriptionId: session.subscriptionId,
    amountGross: attempt.amountGross,
    currency: attempt.currency,
    expiresAt: attempt.expiresAt.toISOString(),
  };
}

function getProviderPriceReference(
  plan: PlanCatalog,
  quote: AgencyPlanQuote,
): string {
  const priceReference =
    quote.billingInterval === 'monthly'
      ? plan.stripePriceIdMonthly
      : plan.stripePriceIdYearly;
  if (!priceReference) {
    throw new ConflictException(
      'Plan nie ma skonfigurowanej płatności dla wybranego okresu',
    );
  }
  return priceReference;
}

function getDiscountDurationBillingCycles(
  quote: AgencyPlanQuote,
): number | null {
  const durations = quote.pricingSnapshot.discounts
    .filter((discount) => discount.grossAmount > 0)
    .map((discount) => discount.durationBillingCycles);
  if (!durations.length) return null;
  return Math.max(...durations);
}
