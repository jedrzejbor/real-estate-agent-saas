import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEmail,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  MAX_LISTING_IMAGES,
  MIN_LISTING_IMAGES,
} from '../../common/listing-image-rules';
import {
  PublicSubmissionAddressDto,
  PublicSubmissionAgentCollaborationDto,
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
  @IsArray()
  @ArrayMinSize(MIN_LISTING_IMAGES, {
    message: `Dodaj co najmniej ${MIN_LISTING_IMAGES} zdjęcia`,
  })
  @ArrayMaxSize(MAX_LISTING_IMAGES)
  @ValidateNested({ each: true })
  @Type(() => PublicSubmissionImageDto)
  images?: PublicSubmissionImageDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicSubmissionAgentCollaborationDto)
  agentCollaboration?: PublicSubmissionAgentCollaborationDto;

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
