import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  ListingAgentProposalCommissionType,
  ListingAgentProposalExclusivity,
} from '../../common/enums';

export class UpdateListingAgentProposalDto {
  @IsOptional()
  @IsEnum(ListingAgentProposalCommissionType)
  commissionType?: ListingAgentProposalCommissionType | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  commissionValue?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  minimumContractMonths?: number | null;

  @IsOptional()
  @IsEnum(ListingAgentProposalExclusivity)
  exclusivity?: ListingAgentProposalExclusivity | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  services?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  marketingPlan?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  valuationOpinion?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  proposedPrice?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  availability?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;
}
