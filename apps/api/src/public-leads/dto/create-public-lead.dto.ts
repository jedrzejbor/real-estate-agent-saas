import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PublicLeadSource } from '../../common/enums';

export class CreatePublicLeadDto {
  @IsNotEmpty({ message: 'Imię i nazwisko są wymagane' })
  @IsString()
  @MaxLength(255)
  fullName: string;

  @IsOptional()
  @IsEmail({}, { message: 'Nieprawidłowy format email' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  message?: string;

  @IsOptional()
  @IsEnum(PublicLeadSource)
  source?: PublicLeadSource;

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
  utmTerm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  utmContent?: string;

  @IsBoolean({ message: 'Zgoda na kontakt jest wymagana' })
  contactConsent: boolean;

  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  consentText?: string;

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
