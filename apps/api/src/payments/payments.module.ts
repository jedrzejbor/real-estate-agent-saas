import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PAYMENT_PROVIDER_CAPABILITIES,
  PaymentProviderCapabilities,
} from './domain/provider-capabilities';
import { Payment } from './infrastructure/typeorm/payment.entity';
import { PaymentEvent } from './infrastructure/typeorm/payment-event.entity';
import { Refund } from './infrastructure/typeorm/refund.entity';
import { PaymentRepository } from './infrastructure/typeorm/payment.repository';
import { RenewalRepository } from './infrastructure/typeorm/renewal.repository';
import { SubscriptionRenewal } from './infrastructure/typeorm/subscription-renewal.entity';
import { Subscription } from './infrastructure/typeorm/subscription.entity';
import { SubscriptionRepository } from './infrastructure/typeorm/subscription.repository';
import {
  loadPaymentConfiguration,
  PAYMENT_CONFIGURATION,
  PaymentConfiguration,
} from './infrastructure/tpay/tpay.config';
import { TpayApiClient } from './infrastructure/tpay/tpay-api.client';
import { TpayPaymentAdapter } from './infrastructure/tpay/tpay-payment.adapter';
import { TpayJwsVerifier } from './infrastructure/tpay/tpay-jws.verifier';
import { PaymentService } from './application/payment.service';
import { PAYMENT_GATEWAY, PaymentGateway } from './ports/payment-gateway.port';
import { RECURRING_GATEWAY, RecurringGateway } from './ports/recurring-gateway.port';

/** Configuration is validated at startup; gateway bindings remain opt-in. */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Payment, PaymentEvent, Refund, Subscription, SubscriptionRenewal])],
  providers: [
    { provide: TpayJwsVerifier, useFactory: () => new TpayJwsVerifier() },
    PaymentRepository,
    PaymentService,
    SubscriptionRepository,
    RenewalRepository,
    {
      provide: PAYMENT_CONFIGURATION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        loadPaymentConfiguration((name) => configService.get<string>(name)),
    },
    {
      provide: TpayApiClient,
      inject: [PAYMENT_CONFIGURATION],
      useFactory: (configuration: PaymentConfiguration) =>
        configuration.provider === 'tpay'
          ? new TpayApiClient(configuration.tpay)
          : null,
    },
    {
      provide: TpayPaymentAdapter,
      inject: [TpayApiClient],
      useFactory: (client: TpayApiClient | null) => client ? new TpayPaymentAdapter(client) : null,
    },
  ],
  exports: [
    TypeOrmModule,
    PaymentRepository,
    PaymentService,
    SubscriptionRepository,
    RenewalRepository,
    PAYMENT_CONFIGURATION,
    TpayApiClient,
    TpayPaymentAdapter,
    TpayJwsVerifier,
  ],
})
export class PaymentsModule {
  /** Opt-in binding; current checkout does not import or use these ports. */
  static withGateways(input: {
    paymentGateway: PaymentGateway;
    recurringGateway: RecurringGateway;
    capabilities: PaymentProviderCapabilities;
  }): DynamicModule {
    return {
      module: PaymentsModule,
      providers: [
        { provide: PAYMENT_GATEWAY, useValue: input.paymentGateway },
        { provide: RECURRING_GATEWAY, useValue: input.recurringGateway },
        {
          provide: PAYMENT_PROVIDER_CAPABILITIES,
          useValue: input.capabilities,
        },
      ],
      exports: [
        PAYMENT_GATEWAY,
        RECURRING_GATEWAY,
        PAYMENT_PROVIDER_CAPABILITIES,
      ],
    };
  }
}
