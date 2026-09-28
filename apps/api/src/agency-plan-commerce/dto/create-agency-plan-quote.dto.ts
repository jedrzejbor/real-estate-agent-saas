import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AgencyPlan } from '../../common/enums';
import { AgencyPlanBillingInterval } from '../agency-plan-commerce.types';

export class CreateAgencyPlanQuoteDto {
  @IsIn(
    [
      AgencyPlan.FREE,
      AgencyPlan.STARTER,
      AgencyPlan.PROFESSIONAL,
      AgencyPlan.ENTERPRISE,
    ],
    { message: 'Nieprawidłowy plan' },
  )
  planCode: Exclude<AgencyPlan, AgencyPlan.CUSTOM>;

  @IsEnum(AgencyPlanBillingInterval, {
    message: 'Nieprawidłowy okres rozliczenia',
  })
  billingInterval: AgencyPlanBillingInterval;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  promotionCode?: string;
}
