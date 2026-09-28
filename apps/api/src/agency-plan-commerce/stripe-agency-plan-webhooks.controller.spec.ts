import { BadRequestException } from '@nestjs/common';
import { AgencyPlanPaymentEventsService } from './agency-plan-payment-events.service';
import { StripeAgencyPlanPaymentAdapter } from './stripe-agency-plan-payment.adapter';
import { StripeAgencyPlanWebhooksController } from './stripe-agency-plan-webhooks.controller';

function buildHarness(mappedEvent: object | null = { eventId: 'evt_agent_1' }) {
  const stripeAdapter = {
    verifyAndMapWebhook: jest.fn().mockReturnValue(mappedEvent),
  };
  const agencyPlanPaymentEventsService = {
    processVerifiedEvent: jest.fn().mockResolvedValue({
      status: 'processed',
      quoteId: 'quote-1',
      checkoutAttemptId: 'attempt-1',
      attemptStatus: 'succeeded',
      agencyId: 'agency-1',
    }),
  };
  const controller = new StripeAgencyPlanWebhooksController(
    stripeAdapter as unknown as StripeAgencyPlanPaymentAdapter,
    agencyPlanPaymentEventsService as unknown as AgencyPlanPaymentEventsService,
  );
  return { controller, stripeAdapter, agencyPlanPaymentEventsService };
}

describe('StripeAgencyPlanWebhooksController', () => {
  it('passes only a signature-verified, normalized event to the domain', async () => {
    const event = { eventId: 'evt_agent_1' };
    const { controller, stripeAdapter, agencyPlanPaymentEventsService } =
      buildHarness(event);
    const rawBody = Buffer.from('{"id":"evt_agent_1"}');

    await expect(
      controller.handleStripeWebhook({ rawBody } as never, 'signature'),
    ).resolves.toEqual({
      received: true,
      processed: true,
      result: {
        status: 'processed',
        quoteId: 'quote-1',
        checkoutAttemptId: 'attempt-1',
        attemptStatus: 'succeeded',
        agencyId: 'agency-1',
      },
    });
    expect(stripeAdapter.verifyAndMapWebhook).toHaveBeenCalledWith(
      rawBody,
      'signature',
    );
    expect(agencyPlanPaymentEventsService.processVerifiedEvent).toHaveBeenCalledWith(
      event,
    );
  });

  it('acknowledges unsupported Stripe events without touching the domain', async () => {
    const { controller, agencyPlanPaymentEventsService } = buildHarness(null);

    await expect(
      controller.handleStripeWebhook(
        { rawBody: Buffer.from('{}') } as never,
        'signature',
      ),
    ).resolves.toEqual({ received: true, processed: false });
    expect(
      agencyPlanPaymentEventsService.processVerifiedEvent,
    ).not.toHaveBeenCalled();
  });

  it.each([
    [{}, 'signature'],
    [{ rawBody: Buffer.from('{}') }, undefined],
  ])('fails closed when raw body or signature is missing', async (request, signature) => {
    const { controller } = buildHarness();

    await expect(
      controller.handleStripeWebhook(request as never, signature),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
