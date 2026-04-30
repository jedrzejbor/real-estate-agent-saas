import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PropertyType,
  PublicListingSubmissionSource,
  TransactionType,
} from '../../common/enums';

export class PublicSubmissionAddressDto {
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
}

export class PublicSubmissionListingDto {
  @IsNotEmpty({ message: 'Tytuł jest wymagany' })
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ValidateIf((value) => value.propertyType !== PropertyType.LAND)
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  areaM2?: number;

  @ValidateIf(
    (value) =>
      value.propertyType === PropertyType.HOUSE ||
      value.propertyType === PropertyType.LAND,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  plotAreaM2?: number;

  @ValidateIf(
    (value) =>
      value.propertyType === PropertyType.APARTMENT ||
      value.propertyType === PropertyType.HOUSE,
  )
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(99)
  rooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(20)
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  floor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalFloors?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1800)
  @Max(new Date().getFullYear() + 5)
  yearBuilt?: number;
}

export class PublicSubmissionPublicSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  publicTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  publicDescription?: string;

  @IsOptional()
  @IsBoolean()
  showExactAddressOnPublicPage?: boolean;
}

export class PublicSubmissionImageDto {
  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  order?: number;
}

export class CreatePublicListingSubmissionDto {
  @ValidateNested()
  @Type(() => PublicSubmissionListingDto)
  listing: PublicSubmissionListingDto;

  @ValidateNested()
  @Type(() => PublicSubmissionAddressDto)
  address: PublicSubmissionAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicSubmissionPublicSettingsDto)
  publicSettings?: PublicSubmissionPublicSettingsDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PublicSubmissionImageDto)
  images?: PublicSubmissionImageDto[];

  @IsNotEmpty({ message: 'Imię i nazwisko są wymagane' })
  @IsString()
  @MaxLength(255)
  ownerName: string;

  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  @MaxLength(255)
  email: string;

  @IsNotEmpty({ message: 'Telefon jest wymagany' })
  @IsString()
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  agencyName?: string;

  @IsBoolean()
  contactConsent: boolean;

  @IsBoolean()
  termsConsent: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  consentText?: string;

  @IsOptional()
  @IsEnum(PublicListingSubmissionSource)
  source?: PublicListingSubmissionSource;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsNumber()
  formStartedAt?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
