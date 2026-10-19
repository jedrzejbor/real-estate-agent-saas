import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { IS_PUBLIC_KEY } from '../../../auth/decorators/public.decorator';
import { PaymentService } from '../../application/payment.service';
import { TpayJwsVerifier } from './tpay-jws.verifier';
import { TpayWebhookController } from './tpay-webhook.controller';
import { ListingPaymentEventsService } from '../../../listing-commerce/listing-payment-events.service';
import { PAYMENT_CONFIGURATION } from './tpay.config';

describe('TpayWebhookController transport', () => {
  let app: INestApplication;
  let baseUrl: string;
  let warning: jest.SpyInstance;
  const verify = jest.fn<Promise<boolean>, [string | undefined, Buffer | undefined]>();
  const recordVerifiedNotification = jest.fn().mockResolvedValue('recorded');
  const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<unknown>) =>
    work({} as EntityManager));
  const rawBody = 'id=123&tr_id=TR-TEST&tr_status=true&tr_crc=00000000-0000-4000-8000-000000000001&tr_amount=49.00&tr_paid=49.00&tr_currency=PLN';
  const path = '/api/payments/webhooks/tpay';

  beforeAll(async () => {
    warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      controllers: [TpayWebhookController],
      providers: [
        { provide: TpayJwsVerifier, useValue: { verify } },
        { provide: DataSource, useValue: { transaction } },
        { provide: PaymentService, useValue: { recordVerifiedNotification } },
        { provide: ListingPaymentEventsService, useValue: { fulfillVerifiedTpayListingInTransaction: jest.fn() } },
        { provide: PAYMENT_CONFIGURATION, useValue: { provider: 'tpay', tpay: { merchantId: '123' } } },
      ],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
    warning?.mockRestore();
  });

  beforeEach(() => {
    verify.mockReset();
    warning.mockClear();
    transaction.mockClear();
    recordVerifiedNotification.mockClear();
  });

  it('returns HTTP 200 and exact TRUE for a verified raw form notification', async () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, TpayWebhookController.prototype.receiveNotification)).toBe(true);
    verify.mockResolvedValue(true);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-jws-signature': 'test-detached-jws',
      },
      body: rawBody,
      redirect: 'manual',
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('TRUE');
    expect(response.headers.get('location')).toBeNull();
    expect(verify).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls[0][0]).toBe('test-detached-jws');
    expect(verify.mock.calls[0][1]).toEqual(Buffer.from(rawBody));
    expect(recordVerifiedNotification).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['invalid', 'invalid-jws'],
    ['missing', undefined],
  ])('returns 4xx without redirect for %s JWS', async (_case, signature) => {
    verify.mockResolvedValue(false);
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...(signature ? { 'x-jws-signature': signature } : {}),
      },
      body: rawBody,
      redirect: 'manual',
    });

    expect(response.status).toBe(401);
    expect(response.headers.get('location')).toBeNull();
    expect(verify.mock.calls[0][1]).toEqual(Buffer.from(rawBody));
    expect(warning.mock.calls.flat().join(' ')).not.toContain(rawBody);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects non-form notifications before verification', async () => {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      redirect: 'manual',
    });
    expect(response.status).toBe(415);
    expect(response.headers.get('location')).toBeNull();
    expect(verify).not.toHaveBeenCalled();
  });
});
