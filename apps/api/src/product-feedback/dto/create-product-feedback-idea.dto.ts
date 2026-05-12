import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ProductFeedbackCategory,
  ProductFeedbackPriority,
  ProductFeedbackStatus,
} from '../entities';

export class CreateProductFeedbackIdeaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsEnum(ProductFeedbackCategory)
  category?: ProductFeedbackCategory;

  @IsOptional()
  @IsEnum(ProductFeedbackStatus)
  status?: ProductFeedbackStatus;

  @IsOptional()
  @IsEnum(ProductFeedbackPriority)
  internalPriority?: ProductFeedbackPriority;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  teamResponse?: string;
}
