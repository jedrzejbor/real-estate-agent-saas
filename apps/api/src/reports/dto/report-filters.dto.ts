import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import {
  PropertyType,
  TransactionType,
} from '../../common/enums';

export enum ReportsGroupBy {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/**
 * Shared filters for reports endpoints.
 * Validation is intentionally strict because these params directly shape
 * aggregation queries and data access scope.
 */
export class ReportFiltersDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(ReportsGroupBy)
  groupBy?: ReportsGroupBy;

  @IsOptional()
  @IsUUID('4')
  agentId?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @Type(() => String)
  @IsString()
  @MaxLength(20)
  preset?: string;
}
