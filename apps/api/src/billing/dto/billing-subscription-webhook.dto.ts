import {
  IsDateString,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AgencyPlan, SubscriptionStatus } from '../../common/enums';
import type { BillingSubscriptionEventType } from '../billing-subscription-events.service';

export const BILLING_SUBSCRIPTION_EVENT_TYPES = [
  'subscription_updated',
  'subscription_past_due',
  'subscription_canceled',
] as const satisfies BillingSubscriptionEventType[];

export class BillingSubscriptionWebhookDto {
  @IsString()
  @MaxLength(50)
  provider: string;

  @IsString()
  @MaxLength(255)
  eventId: string;

  @IsIn(BILLING_SUBSCRIPTION_EVENT_TYPES)
  eventType: BillingSubscriptionEventType;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  agencyId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingCustomerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billingSubscriptionId?: string | null;

  @IsOptional()
  @IsEnum(AgencyPlan)
  plan?: AgencyPlan | null;

  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus | null;

  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  billingInterval?: 'monthly' | 'yearly' | null;

  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string | null;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}
