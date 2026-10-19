import { HttpException, HttpStatus } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AgencyPlanCommerceModule } from '../agency-plan-commerce/agency-plan-commerce.module';
import { AGENCY_PLAN_PAYMENT_GATEWAY } from '../agency-plan-commerce/agency-plan-payment-gateway.port';
import { ListingCommerceModule } from '../listing-commerce/listing-commerce.module';
import { LISTING_PAYMENT_GATEWAY } from '../listing-commerce/listing-payment-gateway.port';

describe('PAY-012 backend module wiring', () => {
  it('does not register Stripe webhook controllers', () => {
    for (const module of [ListingCommerceModule, AgencyPlanCommerceModule]) {
      const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module) as Array<{ name: string }>;
      expect(controllers.some((controller) => controller.name.includes('Stripe'))).toBe(false);
    }
  });

  it('keeps checkout services wired to unavailable gateways', async () => {
    for (const [module, token, method] of [
      [ListingCommerceModule, LISTING_PAYMENT_GATEWAY, 'createCheckoutSession'],
      [AgencyPlanCommerceModule, AGENCY_PLAN_PAYMENT_GATEWAY, 'createSubscriptionCheckoutSession'],
    ] as const) {
      const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) as Array<{
        provide?: symbol;
        useValue?: Record<string, () => Promise<unknown>>;
      }>;
      const gateway = providers.find((provider) => provider.provide === token)?.useValue;
      expect(gateway).toBeDefined();
      try {
        await gateway![method]();
        fail('Unavailable gateway must reject');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    }
  });
});
