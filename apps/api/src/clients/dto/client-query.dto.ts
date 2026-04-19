import { IsOptional, IsEnum, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ClientSource, ClientStatus } from '../../common/enums';

/**
 * Query DTO for client search & pagination.
 * All fields are optional — no filters = return all (paginated).
 */
export class ClientQueryDto {
  // ── Filters ──

  @IsOptional()
  @IsEnum(ClientSource)
  source?: ClientSource;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budgetMax?: number;

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
  sortBy?: 'createdAt' | 'lastName' | 'status' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
