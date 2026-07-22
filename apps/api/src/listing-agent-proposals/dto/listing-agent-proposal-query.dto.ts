import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ListingAgentProposalStatus } from '../../common/enums';

export class ListingAgentProposalQueryDto {
  @IsOptional()
  @IsEnum(ListingAgentProposalStatus)
  status?: ListingAgentProposalStatus;

  @IsOptional()
  @IsUUID('4')
  listingId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'status' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
