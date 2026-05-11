import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ProductFeedbackStatus, ProductFeedbackType } from '../entities';

export class ProductFeedbackMyQueryDto {
  @IsOptional()
  @IsEnum(ProductFeedbackStatus)
  status?: ProductFeedbackStatus;

  @IsOptional()
  @IsEnum(ProductFeedbackType)
  type?: ProductFeedbackType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
