import { Type } from 'class-transformer';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  PublicSubmissionAddressDto,
  PublicSubmissionImageDto,
  PublicSubmissionListingDto,
  PublicSubmissionPublicSettingsDto,
} from './create-public-listing-submission.dto';

export class UpdateSellerPublicListingSubmissionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PublicSubmissionListingDto)
  listing?: PublicSubmissionListingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicSubmissionAddressDto)
  address?: PublicSubmissionAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicSubmissionPublicSettingsDto)
  publicSettings?: PublicSubmissionPublicSettingsDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PublicSubmissionImageDto)
  images?: PublicSubmissionImageDto[];

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ownerName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Nieprawidłowy adres email' })
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  agencyName?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
