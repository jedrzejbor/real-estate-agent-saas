import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  ListingPromotionDiscountType,
  ListingPromotionTargetRules,
  ListingPromotionTargetScope,
} from '../listing-commerce.types';

export class CreateListingManualAdjustmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1_000)
  reason: string;

  @IsEnum(ListingPromotionDiscountType)
  discountType: ListingPromotionDiscountType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  discountValue: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Type(() => Number)
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

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsISO8601()
  startsAt?: string | null;

  @IsISO8601()
  endsAt: string;
}

export class ArchiveListingManualAdjustmentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1_000)
  reason: string;
}
