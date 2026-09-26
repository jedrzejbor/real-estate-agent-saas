import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ListingProductType } from '../listing-commerce.types';

export class GrantListingEntitlementDto {
  @IsEnum(ListingProductType)
  productType: ListingProductType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3_650)
  durationDays: number;

  @IsString()
  @MinLength(3)
  @MaxLength(1_000)
  reason: string;

  @ValidateIf(
    (dto: GrantListingEntitlementDto, value) =>
      dto.productType === ListingProductType.FEATURED ||
      (value !== undefined && value !== null),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  featuredTier?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  priorityWeight?: number;
}

export class RevokeListingEntitlementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1_000)
  reason: string;
}
