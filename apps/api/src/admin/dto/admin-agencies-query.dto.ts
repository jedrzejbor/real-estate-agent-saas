import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdminAgenciesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
