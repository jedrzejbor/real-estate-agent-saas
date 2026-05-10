import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ProductFeedbackCategory,
  ProductFeedbackPriority,
  ProductFeedbackSource,
  ProductFeedbackStatus,
  ProductFeedbackType,
} from '../entities';

export class ProductFeedbackAdminQueryDto {
  @IsOptional()
  @IsEnum(ProductFeedbackStatus)
  status?: ProductFeedbackStatus;

  @IsOptional()
  @IsEnum(ProductFeedbackType)
  type?: ProductFeedbackType;

  @IsOptional()
  @IsEnum(ProductFeedbackCategory)
  category?: ProductFeedbackCategory;

  @IsOptional()
  @IsEnum(ProductFeedbackSource)
  source?: ProductFeedbackSource;

  @IsOptional()
  @IsEnum(ProductFeedbackPriority)
  userPriority?: ProductFeedbackPriority;

  @IsOptional()
  @IsEnum(ProductFeedbackPriority)
  internalPriority?: ProductFeedbackPriority;

  @IsOptional()
  @IsString()
  search?: string;

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
}
