import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsPositive,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, TransactionType } from '../../common/enums';

/** Nested DTO for the address embedded in a listing. */
export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsNotEmpty({ message: 'Miasto jest wymagane' })
  @IsString()
  @MaxLength(255)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  voivodeship?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CreateListingDto {
  @IsNotEmpty({ message: 'Tytuł jest wymagany' })
  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PropertyType, { message: 'Nieprawidłowy typ nieruchomości' })
  propertyType: PropertyType;

  @IsEnum(TransactionType, { message: 'Nieprawidłowy typ transakcji' })
  transactionType: TransactionType;

  @IsNumber({}, { message: 'Cena musi być liczbą' })
  @IsPositive({ message: 'Cena musi być większa od zera' })
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  areaM2?: number;

  @ValidateIf((o) =>
    o.propertyType === PropertyType.HOUSE || o.propertyType === PropertyType.LAND,
  )
  @IsNotEmpty({ message: 'Powierzchnia działki jest wymagana' })
  @IsNumber()
  @IsPositive()
  plotAreaM2?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(99)
  rooms?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @IsNumber()
  floor?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalFloors?: number;

  @IsOptional()
  @IsNumber()
  @Min(1800)
  @Max(new Date().getFullYear() + 5)
  yearBuilt?: number;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;
}
