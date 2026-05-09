import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PropertyType, TransactionType } from '../../common/enums';

function emptyStringToUndefined(value: unknown): unknown {
  return value === '' ? undefined : value;
}

function numberQueryParam(value: unknown): number | undefined {
  if (value === '' || value === undefined || value === null) {
    return undefined;
  }

  return Number(value);
}

export enum PublicListingCatalogSort {
  NEWEST = 'newest',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  AREA_ASC = 'area_asc',
  AREA_DESC = 'area_desc',
}

export class PublicListingCatalogQueryDto {
  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsUUID()
  agentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  voivodeship?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsNumber()
  @Min(0)
  areaMin?: number;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsNumber()
  @Min(0)
  areaMax?: number;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsInt()
  @Min(1)
  @Max(20)
  roomsMin?: number;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsInt()
  @Min(1)
  @Max(20)
  roomsMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsEnum(PublicListingCatalogSort)
  sort?: PublicListingCatalogSort = PublicListingCatalogSort.NEWEST;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number = 24;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  @MaxLength(80)
  bbox?: string;

  @IsOptional()
  @Transform(({ value }) => numberQueryParam(value))
  @IsInt()
  @Min(1)
  @Max(300)
  mapLimit?: number = 150;
}
