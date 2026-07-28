import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingAgentCollaborationMode } from '../../common/enums';

export class ReopenListingAgentRecruitmentPreferencesDto {
  @IsOptional()
  @IsBoolean()
  allowsExclusiveAgreement?: boolean;

  @IsOptional()
  @IsBoolean()
  allowsMultipleAgents?: boolean;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  preferredCommissionType?: 'percentage' | 'fixed' | null;

  @ValidateIf((value) => value.preferredCommissionValue !== null)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  preferredCommissionValue?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  expectedServices?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsIn(['platform_chat', 'phone_after_acceptance'])
  preferredContactChannel?: 'platform_chat' | 'phone_after_acceptance';
}

export class ReopenListingAgentRecruitmentDto {
  @IsOptional()
  @IsEnum(ListingAgentCollaborationMode)
  mode?: ListingAgentCollaborationMode;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReopenListingAgentRecruitmentPreferencesDto)
  preferences?: ReopenListingAgentRecruitmentPreferencesDto;
}
