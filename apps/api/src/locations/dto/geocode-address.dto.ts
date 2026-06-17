import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class GeocodeAddressDto {
  @IsString()
  @MaxLength(255)
  city: string;

  @IsString()
  @MaxLength(255)
  street: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  district?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  voivodeship?: string | null;

  @IsOptional()
  @IsIn(['PL'])
  country?: 'PL';
}
