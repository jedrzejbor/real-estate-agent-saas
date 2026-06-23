import {
  Body,
  Controller,
  Headers,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../auth/decorators/public.decorator';
import { BillingSubscriptionEventsService } from './billing-subscription-events.service';
import { BillingSubscriptionWebhookDto } from './dto/billing-subscription-webhook.dto';

const BILLING_SIGNATURE_HEADER = 'x-estateflow-billing-signature';

@Controller('billing/webhooks')
export class BillingWebhooksController {
  constructor(
    private readonly billingSubscriptionEventsService: BillingSubscriptionEventsService,
    private readonly configService: ConfigService,
  ) {}

  /** POST /api/billing/webhooks/subscription-events — signed provider-agnostic billing subscription event webhook. */
  @Public()
  @Post('subscription-events')
  async handleSubscriptionEvent(
    @Body() dto: BillingSubscriptionWebhookDto,
    @Headers(BILLING_SIGNATURE_HEADER) signature?: string,
  ) {
    this.verifySignature(dto, signature);

    return this.billingSubscriptionEventsService.processSubscriptionEvent({
      provider: dto.provider,
      eventId: dto.eventId,
      eventType: dto.eventType,
      agencyId: dto.agencyId ?? null,
      billingCustomerId: dto.billingCustomerId ?? null,
      billingSubscriptionId: dto.billingSubscriptionId ?? null,
      plan: dto.plan ?? null,
      subscriptionStatus: dto.subscriptionStatus ?? null,
      billingInterval: dto.billingInterval ?? null,
      currentPeriodEnd: dto.currentPeriodEnd
        ? new Date(dto.currentPeriodEnd)
        : null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      rawPayload: dto.rawPayload ?? {},
    });
  }

  private verifySignature(
    dto: BillingSubscriptionWebhookDto,
    signature?: string,
  ): void {
    const secret = this.configService.get<string>('BILLING_WEBHOOK_SECRET');

    if (!secret) {
      throw new ServiceUnavailableException(
        'Billing webhook secret is not configured',
      );
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(canonicalJson(dto))
      .digest('hex');
    const normalizedSignature = signature?.startsWith('sha256=')
      ? signature.slice('sha256='.length)
      : signature;

    if (!normalizedSignature || !safeCompare(expectedSignature, normalizedSignature)) {
      throw new UnauthorizedException('Invalid billing webhook signature');
    }
  }
}

function safeCompare(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${canonicalJson(entryValue)}`,
      )
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export { canonicalJson };
