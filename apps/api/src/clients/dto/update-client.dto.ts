import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsEmail,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientSource, ClientStatus, PropertyType } from '../../common/enums';

export class UpdateClientPreferenceDto {
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minArea?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  preferredCity?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minRooms?: number;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Nieprawidłowy format email' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(ClientSource)
  source?: ClientSource;

  @IsOptional()
  @IsEnum(ClientStatus, { message: 'Nieprawidłowy status klienta' })
  status?: ClientStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budgetMax?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateClientPreferenceDto)
  preference?: UpdateClientPreferenceDto;
}
