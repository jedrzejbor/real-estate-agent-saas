import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PAYMENT_PROVIDER_CAPABILITIES } from './domain/provider-capabilities';
import { newAuthorizationId, newPaymentId, newRenewalId, toPaymentAmountMinor } from './domain/payment.types';
import { PaymentsModule } from './payments.module';
import { PAYMENT_GATEWAY, type PaymentGateway } from './ports/payment-gateway.port';
import { RECURRING_GATEWAY, type RecurringGateway } from './ports/recurring-gateway.port';

@Global()
@Module({
  providers: [
    {
      provide: getDataSourceToken(),
      useValue: {
        entityMetadatas: [],
        options: { type: 'postgres' },
        getRepository: jest.fn().mockReturnValue({}),
      },
    },
  ],
  exports: [getDataSourceToken()],
})
class MockDataSourceModule {}

describe('PAY-009 payment gateway ports', () => {
  it('accepts mock one-time and recurring gateways through DI', async () => {
    const paymentGateway: PaymentGateway = {
      createPayment: jest.fn().mockResolvedValue({
        status: 'pending',
        providerTransactionId: 'test-transaction',
        providerTitle: 'TR-TEST',
        redirectUrl: 'https://checkout.example.test/pay',
      }),
      getPaymentStatus: jest.fn().mockResolvedValue({
        providerTransactionId: 'test-transaction',
        status: 'confirmed',
        amountMinor: toPaymentAmountMinor(4999),
        currency: 'PLN',
      }),
      refundPayment: jest.fn().mockResolvedValue({
        providerRefundId: 'test-refund',
        status: 'confirmed',
      }),
    };
    const recurringGateway: RecurringGateway = {
      startAuthorization: jest.fn().mockResolvedValue({
        status: 'pending',
        redirectUrl: 'https://checkout.example.test/consent',
        providerAuthorizationId: null,
      }),
      charge: jest.fn().mockResolvedValue({
        providerTransactionId: 'test-renewal',
        status: 'pending',
      }),
      revokeAuthorization: jest.fn().mockResolvedValue(undefined),
    };
    const capabilities = {
      oneTimePayments: true,
      refunds: true,
      cardRecurring: true,
      recurringAlias: false,
    };
    const module = await Test.createTestingModule({
      imports: [
        MockDataSourceModule,
        PaymentsModule.withGateways({
          paymentGateway,
          recurringGateway,
          capabilities,
        }),
      ],
    }).compile();

    expect(module.get(PAYMENT_GATEWAY)).toBe(paymentGateway);
    expect(module.get(RECURRING_GATEWAY)).toBe(recurringGateway);
    expect(module.get(PAYMENT_PROVIDER_CAPABILITIES)).toBe(capabilities);

    await expect(
      paymentGateway.createPayment({
        paymentId: newPaymentId(),
        amountMinor: toPaymentAmountMinor(4999),
        currency: 'PLN',
        description: 'Test payment',
        buyerEmail: 'buyer@example.test',
        buyerName: 'Test Buyer',
        notificationUrl: 'https://api.example.test/notification',
        returnUrls: {
          success: 'https://app.example.test/success',
          failure: 'https://app.example.test/failure',
        },
      }),
    ).resolves.toMatchObject({ providerTransactionId: 'test-transaction' });
    await expect(
      recurringGateway.charge({
        renewalId: newRenewalId(),
        authorizationId: newAuthorizationId(),
        amountMinor: toPaymentAmountMinor(24900),
        currency: 'PLN',
      }),
    ).resolves.toMatchObject({ providerTransactionId: 'test-renewal' });
    await module.close();
  });

  it('does not import a provider implementation from the domain or ports', () => {
    const paths = [
      ...readdirSync(join(__dirname, 'domain'))
        .filter((name) => name.endsWith('.ts') && !name.endsWith('.spec.ts'))
        .map((name) => join(__dirname, 'domain', name)),
      ...readdirSync(join(__dirname, 'ports'))
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(__dirname, 'ports', name)),
    ];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(readFileSync(path, 'utf8')).not.toMatch(
        /(?:from\s*['"][^'"]*|require\(\s*['"][^'"]*)tpay/i,
      );
    }
  });
});
