import { IsDateString, IsOptional } from 'class-validator';

export class ListingOwnerReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
