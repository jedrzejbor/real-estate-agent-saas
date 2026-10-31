import { CanActivate, ConflictException, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminPermission, UserRole } from '../common/enums';
import { PaymentService } from '../payments/application/payment.service';
import { Payment } from '../payments/infrastructure/typeorm/payment.entity';
import { TpayPaymentAdapter } from '../payments/infrastructure/tpay/tpay-payment.adapter';
import { ListingOrder } from './entities';
import { ListingOrderStatus } from './listing-commerce.types';
import { ListingOrdersController } from './listing-orders.controller';
import { ListingOrdersService } from './listing-orders.service';
import { ListingRefundsService } from './listing-refunds.service';
import { RefundAdminGuard } from './refund-admin.guard';

const orderId = 'a2ca6e0d-3987-4be4-810d-76b158c82601';
const paymentId = '1b128d14-1ce8-452c-a718-48c6cd23a130';
const adminId = '817a5346-a992-4f14-91dc-042bb137883a';
const dto = { paymentId, intentKey: 'refund-pay032-1', kind: 'partial' as const, amountMinor: 2000 };

describe('PAY-032 controlled listing refund API', () => {
  let app: INestApplication;
  let url: string;
  const refundService = { requestRefund: jest.fn() };
  const auth: CanActivate = {
    canActivate(context) {
      const request = context.switchToHttp().getRequest();
      const scenario = request.headers['x-test-auth'];
      if (!scenario) throw new UnauthorizedException();
      request.user = {
        id: adminId,
        role: scenario === 'owner' ? UserRole.OWNER : UserRole.ADMIN,
        adminPermissions: scenario === 'granted'
          ? [AdminPermission.LISTING_COMMERCE_MANAGE_REFUNDS] :
          scenario === 'legacy' ? null : [AdminPermission.LISTING_COMMERCE_READ],
      };
      return true;
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ListingOrdersController],
      providers: [
        RefundAdminGuard,
        { provide: ListingOrdersService, useValue: {} },
        { provide: ListingRefundsService, useValue: refundService },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalGuards(auth, new RolesGuard(app.get(Reflector)));
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    refundService.requestRefund.mockReset();
    refundService.requestRefund.mockResolvedValue({ refundId: 'local-refund', status: 'pending' });
  });
  const post = (body: unknown, scenario?: string) => fetch(`${url}/api/listing-orders/${orderId}/refunds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(scenario ? { 'x-test-auth': scenario } : {}) },
    body: JSON.stringify(body),
    redirect: 'manual',
  });

  it('accepts only an explicitly granted admin and passes the actor and local IDs', async () => {
    const response = await post(dto, 'granted');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ refundId: 'local-refund', status: 'pending' });
    expect(refundService.requestRefund).toHaveBeenCalledWith(adminId, orderId, dto);
  });

  it.each([
    ['unauthenticated', undefined, 401],
    ['ordinary user', 'owner', 403],
    ['admin without refund grant', 'missing', 403],
    ['legacy admin without explicit permissions', 'legacy', 403],
  ])('rejects %s before any refund action', async (_label, scenario, status) => {
    const response = await post(dto, scenario);
    expect(response.status).toBe(status);
    expect(refundService.requestRefund).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...dto, amountMinor: 0 }],
    [{ ...dto, amountMinor: 12.5 }],
    [{ ...dto, kind: 'invalid' }],
    [{ ...dto, paymentId: 'not-a-uuid' }],
    [{ ...dto, intentKey: 'bad intent' }],
  ])('rejects invalid input before any refund action', async (body) => {
    const response = await post(body, 'granted');
    expect(response.status).toBe(400);
    expect(refundService.requestRefund).not.toHaveBeenCalled();
  });
});

describe('PAY-032 listing refund target checks', () => {
  const order = { id: orderId, status: ListingOrderStatus.PAID, currency: 'PLN', totalGrossAmount: 5000 };
  const payment = {
    id: paymentId, orderId, kind: 'listing', status: 'confirmed', currency: 'PLN',
    amountMinor: 5000, provider: 'tpay', providerTransactionId: 'tx_123',
  };
  const paymentService = { requestRefund: jest.fn().mockResolvedValue({
    id: 'local-refund', paymentId, intentKey: dto.intentKey, kind: dto.kind,
    amountMinor: dto.amountMinor, status: 'pending', requestedByUserId: adminId, createdAt: new Date(),
  }) };
  const gateway = {} as TpayPaymentAdapter;
  const orderRepo = { findOneBy: jest.fn() };
  const paymentRepo = { findOneBy: jest.fn() };
  const dataSource = { getRepository: jest.fn((entity) => entity === ListingOrder ? orderRepo : paymentRepo) } as unknown as DataSource;
  const service = new ListingRefundsService(dataSource, paymentService as unknown as PaymentService, gateway);

  beforeEach(() => {
    orderRepo.findOneBy.mockReset().mockResolvedValue(order);
    paymentRepo.findOneBy.mockReset().mockResolvedValue(payment);
    paymentService.requestRefund.mockClear();
  });

  it('rejects a missing or foreign payment without calling the provider flow', async () => {
    paymentRepo.findOneBy.mockResolvedValueOnce(null);
    await expect(service.requestRefund(adminId, orderId, dto)).rejects.toThrow();
    paymentRepo.findOneBy.mockResolvedValueOnce({ ...payment, orderId: 'foreign-order' });
    await expect(service.requestRefund(adminId, orderId, dto)).rejects.toThrow();
    expect(paymentService.requestRefund).not.toHaveBeenCalled();
  });

  it('rejects an unpaid order or payment and an excessive amount', async () => {
    orderRepo.findOneBy.mockResolvedValueOnce({ ...order, status: ListingOrderStatus.PENDING_PAYMENT });
    await expect(service.requestRefund(adminId, orderId, dto)).rejects.toThrow(ConflictException);
    paymentRepo.findOneBy.mockResolvedValueOnce({ ...payment, status: 'pending' });
    await expect(service.requestRefund(adminId, orderId, dto)).rejects.toThrow(ConflictException);
    await expect(service.requestRefund(adminId, orderId, { ...dto, amountMinor: 5001 }))
      .rejects.toThrow(ConflictException);
    expect(paymentService.requestRefund).not.toHaveBeenCalled();
  });

  it('passes an eligible listing payment to the durable refund flow', async () => {
    const result = await service.requestRefund(adminId, orderId, dto);
    expect(result).toMatchObject({ paymentId, status: 'pending', requestedByUserId: adminId });
    expect(paymentService.requestRefund).toHaveBeenCalledWith(dataSource, gateway, {
      actorUserId: adminId, paymentId, intentKey: dto.intentKey, kind: dto.kind, amountMinor: 2000,
    });
  });
});
