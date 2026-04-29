import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const ANALYTICS_EVENT_NAMES = [
  'signup_completed',
  'onboarding_step_completed',
  'onboarding_checklist_dismissed',
  'onboarding_checklist_restored',
  'onboarding_empty_state_shown',
  'onboarding_empty_state_cta_clicked',
  'listing_created',
  'client_created',
  'clients_imported',
  'appointment_created',
  'limit_warning_shown',
  'limit_reached',
  'upgrade_cta_clicked',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export class CreateAnalyticsEventDto {
  @IsIn(ANALYTICS_EVENT_NAMES)
  name: AnalyticsEventName;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}
