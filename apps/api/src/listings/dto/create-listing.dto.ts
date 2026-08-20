import {
  IsString,
  IsNotEmpty,
  IsDefined,
  IsOptional,
  ValidateIf,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsPositive,
  Min,
  Max,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ListingCommissionType,
  PropertyType,
  TransactionType,
} from '../../common/enums';
import { shouldValidateListingDynamicField } from '../../common/listing-field-rules';

/** Nested DTO for the address embedded in a listing. */
export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsNotEmpty({ message: 'Miasto jest wymagane' })
  @IsString()
  @Matches(/\S/, { message: 'Miasto jest wymagane' })
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
  @Matches(/\S/, { message: 'Tytuł jest wymagany' })
  @MaxLength(255)
  title: string;

  @IsNotEmpty({ message: 'Opis jest wymagany' })
  @IsString()
  @Matches(/\S/, { message: 'Opis jest wymagany' })
  description: string;

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
  @IsEnum(ListingCommissionType)
  commissionType?: ListingCommissionType | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionValue?: number | null;

  @ValidateIf((dto: CreateListingDto, value: unknown) =>
    shouldValidateListingDynamicField(dto.propertyType, 'areaM2', value),
  )
  @IsDefined({ message: 'Powierzchnia jest wymagana' })
  @IsNumber()
  @IsPositive()
  areaM2?: number;

  @ValidateIf((dto: CreateListingDto, value: unknown) =>
    shouldValidateListingDynamicField(dto.propertyType, 'plotAreaM2', value),
  )
  @IsDefined({ message: 'Powierzchnia działki jest wymagana' })
  @IsNumber()
  @IsPositive()
  plotAreaM2?: number;

  @ValidateIf((dto: CreateListingDto, value: unknown) =>
    shouldValidateListingDynamicField(dto.propertyType, 'rooms', value),
  )
  @IsDefined({ message: 'Liczba pokoi jest wymagana' })
  @IsInt()
  @Min(1)
  @Max(99)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalFloors?: number;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear() + 5)
  yearBuilt?: number;

  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @IsOptional()
  @IsBoolean()
  showPublicViewCount?: boolean;

  @IsOptional()
  @IsBoolean()
  showExactAddressOnPublicPage?: boolean;

  @IsDefined({ message: 'Adres jest wymagany' })
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address: CreateAddressDto;
}
