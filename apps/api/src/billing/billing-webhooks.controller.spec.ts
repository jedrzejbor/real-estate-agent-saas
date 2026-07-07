import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { AgencyPlan, SubscriptionStatus } from '../common/enums';
import {
  BillingWebhooksController,
  canonicalJson,
} from './billing-webhooks.controller';
import { BillingSubscriptionWebhookDto } from './dto/billing-subscription-webhook.dto';

function buildController(secret?: string) {
  const service = {
    processSubscriptionEvent: jest.fn().mockResolvedValue({
      status: 'processed',
      agencyId: 'agency-1',
    }),
  };
  const configService = {
    get: jest.fn((key: string) =>
      key === 'BILLING_WEBHOOK_SECRET' ? secret : undefined,
    ),
  };

  return {
    controller: new BillingWebhooksController(
      service as never,
      configService as never,
    ),
    service,
  };
}

function sign(payload: BillingSubscriptionWebhookDto, secret: string): string {
  return `sha256=${createHmac('sha256', secret)
    .update(canonicalJson(payload))
    .digest('hex')}`;
}

describe('BillingWebhooksController', () => {
  const payload: BillingSubscriptionWebhookDto = {
    provider: 'stripe',
    eventId: 'evt_1',
    eventType: 'subscription_updated',
    agencyId: 'agency-1',
    billingCustomerId: 'cus_1',
    billingSubscriptionId: 'sub_1',
    plan: AgencyPlan.STARTER,
    subscriptionStatus: SubscriptionStatus.ACTIVE,
    billingInterval: 'monthly',
    currentPeriodEnd: '2026-07-23T10:00:00.000Z',
    occurredAt: '2026-06-23T10:00:00.000Z',
    rawPayload: { type: 'customer.subscription.updated' },
  };

  it('accepts signed normalized subscription webhook payloads', async () => {
    const { controller, service } = buildController('secret');

    const response = await controller.handleSubscriptionEvent(
      payload,
      sign(payload, 'secret'),
    );

    expect(response).toEqual({ status: 'processed', agencyId: 'agency-1' });
    expect(service.processSubscriptionEvent).toHaveBeenCalledWith({
      provider: 'stripe',
      eventId: 'evt_1',
      eventType: 'subscription_updated',
      agencyId: 'agency-1',
      billingCustomerId: 'cus_1',
      billingSubscriptionId: 'sub_1',
      plan: AgencyPlan.STARTER,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      billingInterval: 'monthly',
      currentPeriodEnd: new Date('2026-07-23T10:00:00.000Z'),
      occurredAt: new Date('2026-06-23T10:00:00.000Z'),
      rawPayload: { type: 'customer.subscription.updated' },
    });
  });

  it('accepts the PodAdresem billing signature header alias', async () => {
    const { controller, service } = buildController('secret');

    const response = await controller.handleSubscriptionEvent(
      payload,
      undefined,
      sign(payload, 'secret'),
    );

    expect(response).toEqual({ status: 'processed', agencyId: 'agency-1' });
    expect(service.processSubscriptionEvent).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid signatures before calling the service', async () => {
    const { controller, service } = buildController('secret');

    await expect(
      controller.handleSubscriptionEvent(payload, sign(payload, 'wrong-secret')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.processSubscriptionEvent).not.toHaveBeenCalled();
  });

  it('rejects webhook calls when the secret is not configured', async () => {
    const { controller, service } = buildController(undefined);

    await expect(
      controller.handleSubscriptionEvent(payload, sign(payload, 'secret')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(service.processSubscriptionEvent).not.toHaveBeenCalled();
  });
});
