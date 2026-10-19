import { Global, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { PaymentsModule } from '../../payments.module';
import {
  loadPaymentConfiguration,
  PAYMENT_CONFIGURATION,
  PaymentConfiguration,
} from './tpay.config';

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

const sandboxConfig = {
  PAYMENT_PROVIDER: 'tpay',
  NODE_ENV: 'development',
  TPAY_API_URL: 'https://openapi.sandbox.tpay.com',
  TPAY_CLIENT_ID: 'test-client-id',
  TPAY_CLIENT_SECRET: 'test-secret-value',
  TPAY_MERCHANT_ID: '123456',
};

function readFrom(values: Record<string, string | undefined>) {
  return (name: string) => values[name];
}

async function compileWith(values: Record<string, string | undefined>) {
  return Test.createTestingModule({
    imports: [ConfigModule.forRoot({ ignoreEnvFile: true }), MockDataSourceModule, PaymentsModule],
  })
    .overrideProvider(ConfigService)
    .useValue({ get: (name: string) => values[name] })
    .compile();
}

describe('PAY-015 payment configuration', () => {
  it('blocks API module startup for an unknown provider', async () => {
    await expect(
      compileWith({ PAYMENT_PROVIDER: 'unexpected-provider' }),
    ).rejects.toThrow('PAYMENT_PROVIDER must be disabled or tpay');
  });

  it('blocks API module startup when the backend secret is absent', async () => {
    await expect(
      compileWith({ ...sandboxConfig, TPAY_CLIENT_SECRET: undefined }),
    ).rejects.toThrow('TPAY_CLIENT_SECRET is required');
  });

  it('keeps secrets out of startup errors and logs', async () => {
    const secret = 'test-secret-must-not-appear-in-logs';
    const consoleLog = jest.spyOn(console, 'log').mockImplementation();
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    try {
      await expect(
        compileWith({
          ...sandboxConfig,
          TPAY_CLIENT_SECRET: secret,
          TPAY_MERCHANT_ID: 'invalid-merchant',
        }),
      ).rejects.toThrow('TPAY_MERCHANT_ID must contain digits only');
      const logs = [
        ...consoleLog.mock.calls,
        ...consoleError.mock.calls,
        ...loggerError.mock.calls,
      ];
      expect(JSON.stringify(logs)).not.toContain(secret);
    } finally {
      consoleLog.mockRestore();
      consoleError.mockRestore();
      loggerError.mockRestore();
    }
  });

  it('accepts Sandbox only outside production and requires production URL in production', async () => {
    const module = await compileWith(sandboxConfig);
    const config = module.get<PaymentConfiguration>(PAYMENT_CONFIGURATION);
    expect(config).toMatchObject({
      provider: 'tpay',
      tpay: {
        environment: 'sandbox',
        apiUrl: 'https://openapi.sandbox.tpay.com',
      },
    });
    await module.close();

    expect(() =>
      loadPaymentConfiguration(readFrom({ ...sandboxConfig, NODE_ENV: 'production' })),
    ).toThrow('TPAY_API_URL must use the production endpoint');
    expect(() =>
      loadPaymentConfiguration(
        readFrom({
          ...sandboxConfig,
          NODE_ENV: 'production',
          TPAY_API_URL: 'https://api.tpay.com',
        }),
      ),
    ).not.toThrow();
  });

  it('keeps checkout disabled when no provider is selected', () => {
    expect(loadPaymentConfiguration(readFrom({}))).toEqual({ provider: 'disabled' });
  });
});
