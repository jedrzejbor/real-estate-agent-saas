import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  FeatureSurveyAudience,
  FeatureSurveyQuestionType,
  FeatureSurveyStatus,
} from '../entities';

class FeatureSurveyQuestionOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  value: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  label: string;
}

class FeatureSurveyQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  id: string;

  @IsEnum(FeatureSurveyQuestionType)
  type: FeatureSurveyQuestionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  label: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FeatureSurveyQuestionOptionDto)
  options?: FeatureSurveyQuestionOptionDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  min?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  max?: number;
}

export class FeatureSurveyAudienceRulesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  planCodes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  workspaceIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  module?: string;
}

export class CreateFeatureSurveyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(FeatureSurveyStatus)
  status?: FeatureSurveyStatus;

  @IsEnum(FeatureSurveyAudience)
  audience: FeatureSurveyAudience;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FeatureSurveyQuestionDto)
  questions: FeatureSurveyQuestionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FeatureSurveyAudienceRulesDto)
  audienceRules?: FeatureSurveyAudienceRulesDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateFeatureSurveyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(FeatureSurveyStatus)
  status?: FeatureSurveyStatus;

  @IsOptional()
  @IsEnum(FeatureSurveyAudience)
  audience?: FeatureSurveyAudience;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FeatureSurveyQuestionDto)
  questions?: FeatureSurveyQuestionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FeatureSurveyAudienceRulesDto)
  audienceRules?: FeatureSurveyAudienceRulesDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SubmitFeatureSurveyResponseDto {
  @IsObject()
  answers: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceUrl?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateFeatureSurveyResponseDto extends SubmitFeatureSurveyResponseDto {}

export class SubmitPublicFeatureSurveyResponseDto extends SubmitFeatureSurveyResponseDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsInt()
  formStartedAt?: number;
}
