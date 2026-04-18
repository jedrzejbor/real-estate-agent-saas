import { IsOptional, IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  PropertyType,
  ListingStatus,
  TransactionType,
} from '../../common/enums';

/**
 * Query DTO for listing search & pagination.
 * All fields are optional — no filters = return all (paginated).
 */
export class ListingQueryDto {
  // ── Filters ──

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(99)
  roomsMin?: number;

  @IsOptional()
  @IsString()
  search?: string;

  // ── Pagination ──

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  // ── Sort ──

  @IsOptional()
  @IsString()
  sortBy?: 'price' | 'createdAt' | 'areaM2' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
