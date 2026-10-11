import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PAYMENT_PROVIDER_CAPABILITIES,
  PaymentProviderCapabilities,
} from './domain/provider-capabilities';
import { Payment } from './infrastructure/typeorm/payment.entity';
import { PAYMENT_GATEWAY, PaymentGateway } from './ports/payment-gateway.port';
import { RECURRING_GATEWAY, RecurringGateway } from './ports/recurring-gateway.port';

/** Registered only when a future task imports this module into the application. */
@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  exports: [TypeOrmModule],
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
