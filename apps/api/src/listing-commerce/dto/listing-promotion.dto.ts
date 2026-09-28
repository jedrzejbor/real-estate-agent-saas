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
import {
  ListingPromotionCampaignStatus,
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from '../listing-commerce.types';

export class CreateListingPromotionCampaignDto {
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
  @IsEnum(ListingPromotionCampaignStatus)
  status?: ListingPromotionCampaignStatus;

  @IsEnum(ListingPromotionDiscountType)
  discountType: ListingPromotionDiscountType;

  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  discountValue: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  maxDiscountGrossAmount?: number | null;

  @IsEnum(ListingPromotionTargetScope)
  targetScope: ListingPromotionTargetScope;

  @IsOptional()
  @IsObject()
  targetRules?: ListingPromotionTargetRules;

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
  usageLimitPerUser?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  startsAt?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  endsAt?: string | null;
}

export class UpdateListingPromotionCampaignDto {
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
  @IsEnum(ListingPromotionCampaignStatus)
  status?: ListingPromotionCampaignStatus;

  @IsOptional()
  @IsEnum(ListingPromotionDiscountType)
  discountType?: ListingPromotionDiscountType;

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
  @IsEnum(ListingPromotionTargetScope)
  targetScope?: ListingPromotionTargetScope;

  @IsOptional()
  @IsObject()
  targetRules?: ListingPromotionTargetRules;

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
  usageLimitPerUser?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  startsAt?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  endsAt?: string | null;
}

export class CreateListingPromotionCodeDto {
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
  @IsEnum(ListingPromotionCampaignStatus)
  status?: ListingPromotionCampaignStatus;

  @IsOptional()
  @IsEnum(ListingPromotionDiscountType)
  discountType?: ListingPromotionDiscountType | null;

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
  usageLimitPerUser?: number | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  startsAt?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  endsAt?: string | null;
}
