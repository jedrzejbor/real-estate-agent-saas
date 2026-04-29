import {
  IsOptional,
  IsString,
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
import {
  PropertyType,
  ListingStatus,
  TransactionType,
} from '../../common/enums';

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  city?: string;

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

export class UpdateListingDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(ListingStatus)
  status?: ListingStatus;

  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  areaM2?: number;

  @IsOptional()
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

  @IsOptional()
  @IsString()
  @MaxLength(255)
  publicTitle?: string;

  @IsOptional()
  @IsString()
  publicDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(70)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shareImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  showPriceOnPublicPage?: boolean;

  @IsOptional()
  @IsBoolean()
  showExactAddressOnPublicPage?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAddressDto)
  address?: UpdateAddressDto;
}
