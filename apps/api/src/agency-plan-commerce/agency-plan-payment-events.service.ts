import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import { Agency } from '../users/entities';
import type {
  AgencyPlanPaymentEventResultContract,
  VerifiedAgencyPlanPaymentEventContract,
} from './contracts';
import {
  AgencyPlanCheckoutAttemptStatus,
  AgencyPlanPaymentEventType,
} from './agency-plan-commerce.types';
import { AgencyPlanPromotionsService } from './agency-plan-promotions.service';
import { AgencyPlanCheckoutAttempt, AgencyPlanQuote } from './entities';

@Injectable()
export class AgencyPlanPaymentEventsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly promotionsService: AgencyPlanPromotionsService,
  ) {}

  async processVerifiedEvent(
    input: VerifiedAgencyPlanPaymentEventContract,
  ): Promise<AgencyPlanPaymentEventResultContract> {
    const event = normalizeAndValidateEvent(input);

    return this.dataSource.transaction(async (manager) => {
      const quote = await manager.findOne(AgencyPlanQuote, {
        where: { id: event.quoteId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!quote) {
        throw new NotFoundException('Wycena planu nie istnieje');
      }

      const attempt = await resolveAndLockCheckoutAttempt(
        manager,
        quote,
        event,
      );
      const outcome = await this.applyEvent(manager, quote, attempt, event);
      return {
        status: outcome,
        quoteId: quote.id,
        checkoutAttemptId: attempt.id,
        attemptStatus: attempt.status,
        agencyId: quote.agencyId ?? event.agencyId ?? null,
      };
    });
  }

  private async applyEvent(
    manager: EntityManager,
    quote: AgencyPlanQuote,
    attempt: AgencyPlanCheckoutAttempt,
    event: NormalizedAgencyPlanPaymentEvent,
  ): Promise<'processed' | 'ignored_duplicate' | 'ignored_stale'> {
    switch (event.eventType) {
      case AgencyPlanPaymentEventType.CHECKOUT_COMPLETED:
        if (attempt.status === AgencyPlanCheckoutAttemptStatus.SUCCEEDED) {
          return 'ignored_duplicate';
        }
        assertSuccessfulPaymentMatchesQuote(quote, attempt, event);
        attempt.status = AgencyPlanCheckoutAttemptStatus.SUCCEEDED;
        attempt.providerCheckoutSessionId = event.checkoutSessionId;
        attempt.providerSubscriptionId = event.subscriptionId;
        attempt.failureCode = null;
        attempt.failureMessage = null;
        attempt.completedAt = event.occurredAt;
        await manager.save(AgencyPlanCheckoutAttempt, attempt);
        await this.activateAgencyPlan(manager, quote, event);
        await this.promotionsService.applyReservedDiscountsForQuote(
          manager,
          quote,
          event.occurredAt,
          event.eventId,
        );
        return 'processed';

      case AgencyPlanPaymentEventType.CHECKOUT_FAILED:
        if (attempt.status === AgencyPlanCheckoutAttemptStatus.SUCCEEDED) {
          return 'ignored_stale';
        }
        attempt.status = AgencyPlanCheckoutAttemptStatus.FAILED;
        attempt.failureCode = 'checkout_failed';
        attempt.completedAt = event.occurredAt;
        await manager.save(AgencyPlanCheckoutAttempt, attempt);
        return 'processed';

      case AgencyPlanPaymentEventType.CHECKOUT_EXPIRED:
        if (attempt.status === AgencyPlanCheckoutAttemptStatus.SUCCEEDED) {
          return 'ignored_stale';
        }
        attempt.status = AgencyPlanCheckoutAttemptStatus.EXPIRED;
        attempt.completedAt = event.occurredAt;
        await manager.save(AgencyPlanCheckoutAttempt, attempt);
        await this.promotionsService.releaseReservationsForQuotes(
          manager,
          [quote],
          event.occurredAt,
        );
        return 'processed';
    }
  }

  private async activateAgencyPlan(
    manager: EntityManager,
    quote: AgencyPlanQuote,
    event: NormalizedAgencyPlanPaymentEvent,
  ): Promise<void> {
    const agencyId = quote.agencyId ?? event.agencyId;
    if (!agencyId) {
      throw new ConflictException('Checkout nie jest powiązany z agencją');
    }

    const agency = await manager.findOne(Agency, {
      where: { id: agencyId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!agency) {
      throw new NotFoundException('Agencja dla checkoutu nie istnieje');
    }

    agency.plan = quote.planCode;
    agency.subscription = SubscriptionStatus.ACTIVE;
    agency.billingInterval = quote.billingInterval;
    agency.billingCustomerId = event.customerId ?? agency.billingCustomerId ?? null;
    agency.billingSubscriptionId =
      event.subscriptionId ?? agency.billingSubscriptionId ?? null;
    agency.planChangedAt = event.occurredAt;
    agency.limitGraceStartedAt = null;
    agency.limitGraceEndsAt = null;
    agency.limitGraceEnforcedAt = null;
    await manager.save(Agency, agency);
  }
}

interface NormalizedAgencyPlanPaymentEvent
  extends VerifiedAgencyPlanPaymentEventContract {
  provider: string;
  eventId: string;
  quoteId: string;
  checkoutAttemptId: string | null;
  agencyId: string | null;
  checkoutSessionId: string;
  subscriptionId: string | null;
  customerId: string | null;
  amountGross: number | null;
  currency: string | null;
  payload: Record<string, unknown>;
}

function normalizeAndValidateEvent(
  input: VerifiedAgencyPlanPaymentEventContract,
): NormalizedAgencyPlanPaymentEvent {
  const event: NormalizedAgencyPlanPaymentEvent = {
    ...input,
    provider: input.provider.trim().toLowerCase(),
    eventId: input.eventId.trim(),
    quoteId: input.quoteId.trim(),
    checkoutAttemptId: input.checkoutAttemptId?.trim() || null,
    agencyId: input.agencyId?.trim() || null,
    checkoutSessionId: input.checkoutSessionId.trim(),
    subscriptionId: input.subscriptionId?.trim() || null,
    customerId: input.customerId?.trim() || null,
    amountGross: input.amountGross ?? null,
    currency: input.currency?.trim().toUpperCase() || null,
    payload: input.payload ?? {},
  };
  if (!event.provider || event.provider.length > 50) {
    throw new BadRequestException('Nieprawidłowy identyfikator operatora');
  }
  if (!event.eventId || event.eventId.length > 255) {
    throw new BadRequestException('Nieprawidłowy identyfikator zdarzenia');
  }
  if (
    !Object.values(AgencyPlanPaymentEventType).includes(event.eventType) ||
    !event.quoteId ||
    !event.checkoutSessionId ||
    event.checkoutSessionId.length > 255 ||
    (event.checkoutAttemptId !== null && event.checkoutAttemptId.length > 100)
  ) {
    throw new BadRequestException(
      'Zdarzenie nie zawiera poprawnych identyfikatorów lub typu',
    );
  }
  if (
    !(event.occurredAt instanceof Date) ||
    Number.isNaN(event.occurredAt.getTime())
  ) {
    throw new BadRequestException('Nieprawidłowy czas zdarzenia');
  }
  return event;
}

async function resolveAndLockCheckoutAttempt(
  manager: EntityManager,
  quote: AgencyPlanQuote,
  event: NormalizedAgencyPlanPaymentEvent,
): Promise<AgencyPlanCheckoutAttempt> {
  const attempt = event.checkoutAttemptId
    ? await manager.findOne(AgencyPlanCheckoutAttempt, {
        where: { id: event.checkoutAttemptId, quoteId: quote.id },
        lock: { mode: 'pessimistic_write' },
      })
    : await manager.findOne(AgencyPlanCheckoutAttempt, {
        where: {
          quoteId: quote.id,
          provider: event.provider,
          providerCheckoutSessionId: event.checkoutSessionId,
        },
        lock: { mode: 'pessimistic_write' },
      });

  if (!attempt) {
    throw new ConflictException('Zdarzenie wskazuje nieznaną próbę checkoutu');
  }
  if (
    attempt.provider !== event.provider ||
    (attempt.providerCheckoutSessionId &&
      attempt.providerCheckoutSessionId !== event.checkoutSessionId)
  ) {
    throw new ConflictException(
      'Zdarzenie nie odpowiada zapisanej próbie checkoutu',
    );
  }
  if (!attempt.providerCheckoutSessionId) {
    const canRecoverSession =
      event.eventType === AgencyPlanPaymentEventType.CHECKOUT_COMPLETED &&
      OPEN_CHECKOUT_ATTEMPT_STATUSES.has(attempt.status);
    if (!canRecoverSession) {
      throw new ConflictException(
        'Tylko potwierdzony sukces może powiązać brakującą sesję próby',
      );
    }
    attempt.providerCheckoutSessionId = event.checkoutSessionId;
    await manager.save(AgencyPlanCheckoutAttempt, attempt);
  }
  return attempt;
}

const OPEN_CHECKOUT_ATTEMPT_STATUSES = new Set([
  AgencyPlanCheckoutAttemptStatus.CREATING,
  AgencyPlanCheckoutAttemptStatus.PENDING,
]);

function assertSuccessfulPaymentMatchesQuote(
  quote: AgencyPlanQuote,
  attempt: AgencyPlanCheckoutAttempt,
  event: NormalizedAgencyPlanPaymentEvent,
): void {
  if (!event.subscriptionId) {
    throw new BadRequestException('Brak identyfikatora subskrypcji');
  }
  if (
    !Number.isSafeInteger(event.amountGross) ||
    event.amountGross !== quote.totalGrossAmount ||
    event.currency !== quote.currency ||
    event.amountGross !== attempt.amountGross ||
    event.currency !== attempt.currency
  ) {
    throw new ConflictException(
      'Kwota lub waluta płatności nie odpowiada wycenie planu',
    );
  }
  if (
    quote.planCode === AgencyPlan.FREE ||
    quote.planCode === AgencyPlan.CUSTOM
  ) {
    throw new ConflictException('Ten plan nie może zostać aktywowany checkoutem');
  }
}
