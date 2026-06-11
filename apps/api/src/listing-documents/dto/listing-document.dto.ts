import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  ListingDocumentCategory,
  ListingDocumentStatus,
} from '../../common/enums';

export class CreateListingDocumentDto {
  @IsEnum(ListingDocumentCategory)
  category: ListingDocumentCategory;

  @IsOptional()
  @IsEnum(ListingDocumentStatus)
  status?: ListingDocumentStatus;

  @IsString()
  @MaxLength(255)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdateListingDocumentDto {
  @IsOptional()
  @IsEnum(ListingDocumentCategory)
  category?: ListingDocumentCategory;

  @IsOptional()
  @IsEnum(ListingDocumentStatus)
  status?: ListingDocumentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  note?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
