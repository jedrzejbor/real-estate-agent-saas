import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ProductFeedbackCategory,
  ProductFeedbackPriority,
  ProductFeedbackSource,
  ProductFeedbackType,
} from '../entities';

export class CreateProductFeedbackDto {
  @IsEnum(ProductFeedbackType)
  type: ProductFeedbackType;

  @IsOptional()
  @IsEnum(ProductFeedbackCategory)
  category?: ProductFeedbackCategory;

  @IsOptional()
  @IsEnum(ProductFeedbackPriority)
  userPriority?: ProductFeedbackPriority;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsEnum(ProductFeedbackSource)
  source?: ProductFeedbackSource;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  module?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  browser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  os?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  viewport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  screenshotUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreatePublicProductFeedbackDto extends CreateProductFeedbackDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsNumber()
  formStartedAt?: number;
}
