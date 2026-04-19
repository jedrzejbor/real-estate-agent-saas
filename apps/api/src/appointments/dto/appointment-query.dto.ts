import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType, AppointmentStatus } from '../../common/enums';

/**
 * Query DTO for appointment search & pagination.
 * Supports date-range filtering for calendar views.
 */
export class AppointmentQueryDto {
  // ── Filters ──

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  listingId?: string;

  /** Start of date range (ISO 8601). */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** End of date range (ISO 8601). */
  @IsOptional()
  @IsDateString()
  to?: string;

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
  limit?: number = 50;

  // ── Sort ──

  @IsOptional()
  @IsString()
  sortBy?: 'startTime' | 'createdAt' | 'title' = 'startTime';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
