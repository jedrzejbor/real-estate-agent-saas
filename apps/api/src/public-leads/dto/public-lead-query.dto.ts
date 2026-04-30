import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PublicLeadSource, PublicLeadStatus } from '../../common/enums';

export class PublicLeadQueryDto {
  @IsOptional()
  @IsEnum(PublicLeadStatus)
  status?: PublicLeadStatus;

  @IsOptional()
  @IsEnum(PublicLeadSource)
  source?: PublicLeadSource;

  @IsOptional()
  @IsUUID()
  listingId?: string;

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

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'status' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
