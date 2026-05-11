import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ProductFeedbackPriority, ProductFeedbackStatus } from '../entities';

export class UpdateProductFeedbackDto {
  @IsOptional()
  @IsEnum(ProductFeedbackStatus)
  status?: ProductFeedbackStatus;

  @IsOptional()
  @IsEnum(ProductFeedbackPriority)
  internalPriority?: ProductFeedbackPriority | null;

  @IsOptional()
  @IsUUID()
  duplicateOfId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  teamResponse?: string;

  @IsOptional()
  @IsBoolean()
  votingEnabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
