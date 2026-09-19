import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AgencyPlan } from '../../common/enums';
import {
  AgencyPlanPromotionApplicationTiming,
  AgencyPlanPromotionDiscountType,
  AgencyPlanPromotionStatus,
  AgencyPlanPromotionTargetRules,
  AgencyPlanPromotionTargetScope,
} from '../agency-plan-commerce.types';

export class CreateAgencyPlanPromotionCampaignDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionStatus)
  status?: AgencyPlanPromotionStatus;

  @IsEnum(AgencyPlanPromotionDiscountType)
  discountType: AgencyPlanPromotionDiscountType;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  discountValue: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  maxDiscountGrossAmount?: number | null;

  @IsEnum(AgencyPlanPromotionTargetScope)
  targetScope: AgencyPlanPromotionTargetScope;

  @IsOptional()
  @IsObject()
  targetRules?: AgencyPlanPromotionTargetRules;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  durationBillingCycles?: number;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionApplicationTiming)
  applicationTiming?: AgencyPlanPromotionApplicationTiming;

  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @IsOptional()
  @IsBoolean()
  isCombinable?: boolean;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  usageLimitTotal?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  usageLimitPerAccount?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  startsAt?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  endsAt?: string | null;
}

export class UpdateAgencyPlanPromotionCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string | null;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionStatus)
  status?: AgencyPlanPromotionStatus;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionDiscountType)
  discountType?: AgencyPlanPromotionDiscountType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  discountValue?: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  maxDiscountGrossAmount?: number | null;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionTargetScope)
  targetScope?: AgencyPlanPromotionTargetScope;

  @IsOptional()
  @IsObject()
  targetRules?: AgencyPlanPromotionTargetRules;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  durationBillingCycles?: number;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionApplicationTiming)
  applicationTiming?: AgencyPlanPromotionApplicationTiming;

  @IsOptional()
  @IsBoolean()
  isAutomatic?: boolean;

  @IsOptional()
  @IsBoolean()
  isCombinable?: boolean;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  usageLimitTotal?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  usageLimitPerAccount?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  startsAt?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  endsAt?: string | null;
}

export class CreateAgencyPlanPromotionCodeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[A-Za-z0-9_-]+$/)
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label: string;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionStatus)
  status?: AgencyPlanPromotionStatus;

  @IsOptional()
  @IsEnum(AgencyPlanPromotionDiscountType)
  discountType?: AgencyPlanPromotionDiscountType | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  discountValue?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  maxDiscountGrossAmount?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(120)
  durationBillingCycles?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsEnum(AgencyPlanPromotionApplicationTiming)
  applicationTiming?: AgencyPlanPromotionApplicationTiming | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsBoolean()
  isCombinable?: boolean | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  usageLimitTotal?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  usageLimitPerAccount?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  startsAt?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  endsAt?: string | null;
}

export function isAgencyPlan(value: string): value is AgencyPlan {
  return Object.values(AgencyPlan).includes(value as AgencyPlan);
}
