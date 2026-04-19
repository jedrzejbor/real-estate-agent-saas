import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsEmail,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClientSource, PropertyType } from '../../common/enums';

/** Nested DTO for client preference (optional on create). */
export class CreateClientPreferenceDto {
  @IsOptional()
  @IsEnum(PropertyType, { message: 'Nieprawidłowy typ nieruchomości' })
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

export class CreateClientDto {
  @IsNotEmpty({ message: 'Imię jest wymagane' })
  @IsString()
  @MaxLength(255)
  firstName: string;

  @IsNotEmpty({ message: 'Nazwisko jest wymagane' })
  @IsString()
  @MaxLength(255)
  lastName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Nieprawidłowy format email' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEnum(ClientSource, { message: 'Nieprawidłowe źródło klienta' })
  source?: ClientSource;

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
  @Type(() => CreateClientPreferenceDto)
  preference?: CreateClientPreferenceDto;
}
