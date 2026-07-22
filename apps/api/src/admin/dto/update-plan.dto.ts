import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class UpdatePlanLimitsDto {
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

class UpdatePlanFeaturesDto {
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

export class UpdatePlanDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  priceMonthlyPln?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  priceYearlyPln?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePriceIdMonthly?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripePriceIdYearly?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UpdatePlanLimitsDto)
  limits?: UpdatePlanLimitsDto;

  @ValidateIf((_, value) => value !== undefined)
  @ValidateNested()
  @Type(() => UpdatePlanFeaturesDto)
  features?: UpdatePlanFeaturesDto;

  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isPublic?: boolean;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
