import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AgencyPlan } from '../../common/enums';

class AgencyPlanOverrideLimitsDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  activeListings?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  clients?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  monthlyAppointments?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  users?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  imagesPerListing?: number | null;
}

class AgencyPlanOverrideFeaturesDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  reportsOverview?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  reportsListingsBasic?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  reportsClientsBasic?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  reportsAppointmentsBasic?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  publicListings?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  publicLeadForms?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  agentListingMarket?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  customBranding?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  multiUser?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  customDomain?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  apiAccess?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  dedicatedSupport?: boolean;
}

class AgencyPlanOverridesDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  label?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  priceMonthlyPln?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  priceYearlyPln?: number;

  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => AgencyPlanOverrideLimitsDto)
  limits?: AgencyPlanOverrideLimitsDto;

  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => AgencyPlanOverrideFeaturesDto)
  features?: AgencyPlanOverrideFeaturesDto;
}

export class UpdateAgencyPlanDto {
  @IsEnum(AgencyPlan)
  plan: AgencyPlan;

  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @ValidateNested()
  @Type(() => AgencyPlanOverridesDto)
  planOverrides?: AgencyPlanOverridesDto | null;
}
