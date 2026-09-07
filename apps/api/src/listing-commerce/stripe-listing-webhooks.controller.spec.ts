import { BadRequestException } from '@nestjs/common';
import { ListingPaymentEventsService } from './listing-payment-events.service';
import { StripeListingPaymentAdapter } from './stripe-listing-payment.adapter';
import { StripeListingWebhooksController } from './stripe-listing-webhooks.controller';

function buildHarness(mappedEvent: object | null = { eventId: 'evt_1' }) {
  const stripeAdapter = {
    verifyAndMapWebhook: jest.fn().mockReturnValue(mappedEvent),
  };
  const listingPaymentEventsService = {
    processVerifiedEvent: jest.fn().mockResolvedValue({
      status: 'processed',
      orderId: 'order-1',
      orderStatus: 'paid',
    }),
  };
  const controller = new StripeListingWebhooksController(
    stripeAdapter as unknown as StripeListingPaymentAdapter,
    listingPaymentEventsService as unknown as ListingPaymentEventsService,
  );
  return { controller, stripeAdapter, listingPaymentEventsService };
}

describe('StripeListingWebhooksController', () => {
  it('passes only a signature-verified, normalized event to the domain', async () => {
    const event = { eventId: 'evt_1' };
    const { controller, stripeAdapter, listingPaymentEventsService } =
      buildHarness(event);
    const rawBody = Buffer.from('{"id":"evt_1"}');

    await expect(
      controller.handleStripeWebhook({ rawBody } as never, 'signature'),
    ).resolves.toEqual({
      received: true,
      processed: true,
      result: {
        status: 'processed',
        orderId: 'order-1',
        orderStatus: 'paid',
      },
    });
    expect(stripeAdapter.verifyAndMapWebhook).toHaveBeenCalledWith(
      rawBody,
      'signature',
    );
    expect(listingPaymentEventsService.processVerifiedEvent).toHaveBeenCalledWith(
      event,
    );
  });

  it('acknowledges unsupported Stripe events without touching the domain', async () => {
    const { controller, listingPaymentEventsService } = buildHarness(null);

    await expect(
      controller.handleStripeWebhook(
        { rawBody: Buffer.from('{}') } as never,
        'signature',
      ),
    ).resolves.toEqual({ received: true, processed: false });
    expect(listingPaymentEventsService.processVerifiedEvent).not.toHaveBeenCalled();
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
