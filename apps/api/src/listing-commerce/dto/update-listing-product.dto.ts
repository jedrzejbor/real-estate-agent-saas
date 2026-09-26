import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateListingProductDto {
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
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  priceGrossAmount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['PLN'])
  currency?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsInt()
  @Min(0)
  @Max(10_000)
  vatRateBasisPoints?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3_650)
  durationDays?: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(50)
  featuredTier?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  priorityWeight?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  sortOrder?: number;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(255)
  providerPriceReference?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  reason?: string;
}
