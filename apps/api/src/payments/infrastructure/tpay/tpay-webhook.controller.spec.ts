import { ConflictException, INestApplication, Logger, NotFoundException } from '@nestjs/common';
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
  let errorLog: jest.SpyInstance;
  const verify = jest.fn<Promise<boolean>, [string | undefined, Buffer | undefined]>();
  const recordVerifiedNotification = jest.fn().mockResolvedValue('recorded');
  const fulfillVerifiedTpayListingInTransaction = jest.fn().mockResolvedValue(undefined);
  const transaction = jest.fn(async (work: (manager: EntityManager) => Promise<unknown>) =>
    work({} as EntityManager));
  const rawBody = 'id=123&tr_id=TR-TEST&tr_status=true&tr_crc=00000000-0000-4000-8000-000000000001&tr_amount=49.00&tr_paid=49.00&tr_currency=PLN';
  const path = '/api/payments/webhooks/tpay';

  beforeAll(async () => {
    warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      controllers: [TpayWebhookController],
      providers: [
        { provide: TpayJwsVerifier, useValue: { verify } },
        { provide: DataSource, useValue: { transaction } },
        { provide: PaymentService, useValue: { recordVerifiedNotification } },
        { provide: ListingPaymentEventsService, useValue: { fulfillVerifiedTpayListingInTransaction } },
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
    errorLog?.mockRestore();
  });

  beforeEach(() => {
    verify.mockReset();
    warning.mockClear();
    errorLog.mockClear();
    transaction.mockClear();
    recordVerifiedNotification.mockClear();
    recordVerifiedNotification.mockResolvedValue('recorded');
    fulfillVerifiedTpayListingInTransaction.mockReset();
    fulfillVerifiedTpayListingInTransaction.mockResolvedValue(undefined);
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

  const signedRequest = (body = rawBody) => fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-jws-signature': 'local-fixture',
    },
    body,
    redirect: 'manual',
  });

  it.each([
    ['unknown_payment', new NotFoundException('Płatność ogłoszenia nie istnieje'), 404,
      'unknown_local_payment_or_order'],
    ['wrong_amount', new ConflictException('Powiadomienie nie odpowiada płatności i zamówieniu'), 409,
      'payment_mismatch'],
  ])('PAY-029 rejects %s without ACK and emits a safe alert code', async (
    _scenario, failure, expectedStatus, reason,
  ) => {
    verify.mockResolvedValue(true);
    fulfillVerifiedTpayListingInTransaction.mockRejectedValueOnce(failure);
    const response = await signedRequest();

    expect(response.status).toBe(expectedStatus);
    expect(await response.text()).not.toBe('TRUE');
    expect(response.headers.get('location')).toBeNull();
    expect(recordVerifiedNotification).toHaveBeenCalledTimes(1);
    const messages = warning.mock.calls.flat().join(' ');
    expect(messages).toContain(`reason=${reason}`);
    expect(messages).not.toContain('TR-TEST');
    expect(messages).not.toContain('00000000-0000-4000-8000-000000000001');
    expect(messages).not.toContain(rawBody);
  });

  it('PAY-029 treats replay as a committed duplicate and leaves fulfillment idempotent', async () => {
    verify.mockResolvedValue(true);
    recordVerifiedNotification.mockResolvedValueOnce('recorded').mockResolvedValueOnce('duplicate');
    const first = await signedRequest();
    const second = await signedRequest();

    expect(first.status).toBe(200);
    expect(await first.text()).toBe('TRUE');
    expect(second.status).toBe(200);
    expect(await second.text()).toBe('TRUE');
    expect(recordVerifiedNotification).toHaveBeenCalledTimes(2);
    expect(fulfillVerifiedTpayListingInTransaction).toHaveBeenCalledTimes(2);
    expect(warning).not.toHaveBeenCalled();
  });

  it('PAY-029 reports a processing failure without logging an exception payload', async () => {
    verify.mockResolvedValue(true);
    fulfillVerifiedTpayListingInTransaction.mockRejectedValueOnce(
      new Error('sensitive-fixture-marker'),
    );
    const response = await signedRequest();

    expect(response.status).toBe(503);
    expect(await response.text()).not.toBe('TRUE');
    expect(errorLog.mock.calls.flat().join(' ')).toContain('reason=processing_error');
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain('sensitive-fixture-marker');
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain(rawBody);
  });
});
